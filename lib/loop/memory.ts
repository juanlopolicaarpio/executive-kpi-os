import type { Kpi, KpiCategory } from '@/types/kpi'
import type { Playbook, Learning } from '@/types/domain'
import type { RecoveryPlan } from '@/types/accountability'

// Deterministic retrieval over institutional memory: given a missed KPI, find
// the playbook and past learnings that best match the situation — i.e. "what
// worked last time". The AI route (app/api/loop/suggest) polishes this into
// prose, but the substance comes from here so a suggestion is always grounded
// in the memory the org has actually accumulated.

export interface MemoryMatch {
  playbook?: Playbook
  learnings: Learning[]
  /** Why this was retrieved, in terms of the memory it came from. */
  rationale: string
  /** Surfaced when a prior plan for this KPI failed — don't repeat it. */
  warning?: string
  draft: {
    rootCause: string
    summary: string
    actions: string[]
    confidenceLevel: 'low' | 'medium' | 'high'
  }
  source: { playbookId?: string; learningIds: string[] }
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by',
  'is', 'are', 'at', 'as', 'rate', 'market', 'share', 'kpi', 'target', 'vs',
])

const CATEGORY_KEYWORDS: Record<KpiCategory, string[]> = {
  'business-performance': ['sales', 'revenue', 'conversion', 'traffic', 'order', 'aov', 'campaign'],
  profitability: ['margin', 'profit', 'cost', 'price', 'pricing', 'ebitda', 'voucher'],
  'growth-engine': ['growth', 'new', 'user', 'affiliate', 'creator', 'organic', 'discovery', 'demand'],
  operations: ['inventory', 'stock', 'stockout', 'fulfillment', 'oos', 'cover', 'velocity'],
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

function kpiKeywords(kpi: Kpi): Set<string> {
  const base = tokenize(
    `${kpi.name} ${kpi.strategicPurpose} ${kpi.whyItsCore}`,
  )
  return new Set([...base, ...CATEGORY_KEYWORDS[kpi.category]])
}

function scorePlaybook(keywords: Set<string>, pb: Playbook): number {
  const pbTokens = tokenize(`${pb.issueType} ${pb.intervention} ${pb.description}`)
  let overlap = 0
  for (const t of pbTokens) if (keywords.has(t)) overlap += 1
  // Favour overlap, then proven success rate, then usage as a faint tiebreak.
  return overlap * 100 + pb.successRatePct + pb.timesUsed * 0.1
}

function scoreLearning(keywords: Set<string>, lrn: Learning): number {
  const tokens = tokenize(`${lrn.title} ${lrn.summary} ${lrn.tags.join(' ')}`)
  let overlap = 0
  for (const t of tokens) if (keywords.has(t)) overlap += 1
  return overlap
}

export function suggestFromMemory(input: {
  kpi: Kpi
  plans: RecoveryPlan[]
  playbooks: Playbook[]
  learnings: Learning[]
}): MemoryMatch {
  const { kpi, plans, playbooks, learnings } = input
  const keywords = kpiKeywords(kpi)

  const playbook = [...playbooks]
    .map((pb) => ({ pb, score: scorePlaybook(keywords, pb) }))
    .sort((a, b) => b.score - a.score)[0]?.pb

  const matchedLearnings = [...learnings]
    .map((lrn) => ({ lrn, score: scoreLearning(keywords, lrn) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.lrn)

  // Pull in any learnings the playbook explicitly links, even if keywords missed.
  if (playbook) {
    for (const id of playbook.relatedLearningIds) {
      if (!matchedLearnings.find((l) => l.id === id)) {
        const linked = learnings.find((l) => l.id === id)
        if (linked) matchedLearnings.push(linked)
      }
    }
  }

  const failedPlan = [...plans]
    .filter((p) => p.outcome === 'failed')
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0]

  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium'
  if (playbook) {
    confidenceLevel = playbook.successRatePct >= 80 ? 'high' : playbook.successRatePct >= 65 ? 'medium' : 'low'
  }
  if (failedPlan) confidenceLevel = confidenceLevel === 'high' ? 'medium' : 'low'

  const warning = failedPlan
    ? `A previous plan for this KPI failed: ${failedPlan.failureReason ?? 'no recovery achieved'} Do not repeat that approach.`
    : undefined

  const rationaleParts: string[] = []
  if (playbook) {
    rationaleParts.push(
      `Closest match in the playbook is "${playbook.intervention}" (${playbook.issueType}), used ${playbook.timesUsed}× at a ${playbook.successRatePct}% success rate.`,
    )
  }
  if (matchedLearnings[0]) {
    rationaleParts.push(`Relevant learning: ${matchedLearnings[0].title}.`)
  }
  if (warning) rationaleParts.push('Note a prior failed attempt — see warning.')

  const draftActions = playbook
    ? [
        playbook.intervention,
        ...(matchedLearnings[0] ? [`Apply learning: ${matchedLearnings[0].outcome}`] : []),
        'Define a measurable checkpoint and review at next cadence.',
      ]
    : ['Diagnose root cause from the latest data.', 'Define corrective actions with owners and dates.']

  return {
    playbook,
    learnings: matchedLearnings,
    rationale: rationaleParts.join(' ') || 'No close memory match — propose a plan from first principles.',
    warning,
    draft: {
      rootCause: `${kpi.name} is at ${kpi.currentValueDisplay} against a target of ${kpi.target}. ${
        matchedLearnings[0]?.summary ?? 'Diagnose the primary driver from the latest data.'
      }`,
      summary: playbook
        ? `${playbook.intervention}: ${playbook.description}`
        : `Recovery plan to bring ${kpi.name} back to ${kpi.target}.`,
      actions: draftActions,
      confidenceLevel,
    },
    source: {
      playbookId: playbook?.id,
      learningIds: matchedLearnings.map((l) => l.id),
    },
  }
}
