import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getClient, getOrgId } from '@/lib/initiatives/mapping'
import { buildCompanyContext } from '@/lib/ai/context-builder'
import { rankCandidates, recommendationConfidence, DEFAULT_WEIGHTS } from '@/lib/ai/ranking'
import { PROMPT_VERSION } from '@/lib/ai/evidence'
import { mockUsers } from '@/lib/mock-data/users'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MODEL = 'claude-sonnet-4-6'

// GET /api/ai/recommendations?kpi=&department=
//
// PRD §9.2: "up to three options with rationale, historical analogs, expected
// impact range, effort and confidence."
//
// The RANKING is deterministic (lib/ai/ranking.ts, §9.4 weights) and the model
// only writes the prose around it. That ordering matters: if the model chose
// the ranking, the score would be decoration. Here the score is the decision
// and the model explains it, so the breakdown returned to the UI genuinely
// accounts for the order.

export interface SuggestedProjectKpi {
  name: string
  definition: string
  unit: string
  direction: 'above' | 'below'
  targetValue: number
  measurementSource: string
}

export interface RecommendationOption {
  id: string
  title: string
  rationale: string
  initiativeType: string
  targetKpiSlug?: string
  expectedImpact: string
  effort: 'low' | 'medium' | 'high'
  confidence: 'high' | 'medium' | 'low'
  confidenceReason: string
  score: number
  scoreBreakdown: Record<string, number>
  analogs: { name: string; outcome: string; roi: number | null }[]
  limitations: string[]
  /**
   * PRD §9.2 — everything needed to prefill an Initiative Recommendation Form.
   * All of it is a SUGGESTION: the form labels it as such and every field stays
   * editable. The AI may create a Draft; it may never submit one (§9.6).
   */
  draft: {
    objective: string
    mechanics: string
    projectKpis: SuggestedProjectKpi[]
    budgetLines: { category: string; amount: number }[]
    suggestedBudget: number
    durationDays: number
  }
}

export async function GET(req: Request): Promise<Response> {
  const qs = new URL(req.url).searchParams
  const targetKpi = qs.get('kpi') ?? undefined
  const userId = qs.get('userId') ?? 'user-ceo'

  const user = mockUsers.find((u) => u.id === userId) ?? mockUsers[0]!

  try {
    const context = await buildCompanyContext(user.id, user.role)
    const ranked = rankCandidates(context.closedInitiatives, { targetKpi })
    const confidence = recommendationConfidence(ranked)

    // No history means no evidence-based recommendation. Saying so is more
    // useful than inventing three plausible-sounding options (PRD §9.5).
    if (ranked.length === 0) {
      return Response.json({
        options: [],
        confidence: 'low',
        confidenceReason: confidence.reason,
        limitations: [
          'No closed initiatives exist yet, so there is no outcome record to base a recommendation on.',
        ],
        weights: DEFAULT_WEIGHTS,
        promptVersion: PROMPT_VERSION,
      })
    }

    const top = ranked.slice(0, 3)

    const analogBlock = top
      .map(
        (r, i) =>
          `${i + 1}. "${r.candidate.name}" [${r.candidate.type}] — score ${r.score}/100 (${r.rationale}).\n` +
          `   Spent ${Math.round(r.candidate.actualSpend).toLocaleString()}, ROI ${r.candidate.roi != null ? `${r.candidate.roi.toFixed(0)}%` : 'unknown'}, goal ${r.candidate.goalAchieved}.\n` +
          `   Targeted: ${r.candidate.targetKpis.join(', ') || 'no KPI linked'}.\n` +
          `   Lesson on record: ${r.candidate.lessonsLearned}`,
      )
      .join('\n\n')

    const prompt = `You advise a Philippine health-supplements e-commerce brand inside KPI OS.

${targetKpi ? `The user wants to improve this KPI: ${targetKpi}.` : 'The user wants to know what to do next.'}

These are the highest-ranked comparable initiatives from the organization's own closed record,
already scored by a deterministic model. Do NOT reorder them — write one recommendation per case,
in the order given.

${analogBlock}

For each, return a JSON object with exactly these keys:
  "title"          — a specific initiative name to run next (not a restatement of the old one)
  "rationale"      — 2 sentences: why this, grounded in the analog's actual numbers and lesson
  "initiativeType" — one of: campaign, mega-sale, bundle-promo, media, product-launch, pricing, crm, ai-deployment, ops-improvement, hiring, process, recovery, other
  "expectedImpact" — a RANGE, never a point estimate, and say what it is based on
  "effort"         — "low" | "medium" | "high"
  "objective"      — one plain-language sentence stating the outcome to achieve
  "mechanics"      — 3-5 sentences: the action, the audience or process, key mechanics,
                     dependencies and operating assumptions
  "projectKpis"    — 2-4 metrics to judge THIS initiative by. Each: {name, definition, unit
                     (number|currency|percentage|ratio|duration), direction (above|below),
                     targetValue (a number), measurementSource}. These measure execution and
                     leading indicators, NOT the Master KPI itself.
  "budgetLines"    — 2-4 cost categories: {category, amount}. Base the total on what the analog
                     actually spent; do not invent a larger programme than the evidence supports.
  "durationDays"   — a whole number of days

Return ONLY a JSON array of the objects. No prose outside the JSON.
If an analog FAILED, the recommendation must say what to do differently — never propose repeating it unchanged.`

    let generated: Partial<RecommendationOption>[] = []
    try {
      const { text } = await generateText({
        model: anthropic(MODEL),
        prompt,
        maxOutputTokens: 4000,
      })
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        generated = JSON.parse(match[0]) as Partial<RecommendationOption>[]
      } else {
        // Truncated output leaves an unterminated array. Salvage the objects
        // that did complete rather than discarding the whole response.
        const objects = text.match(/\{[\s\S]*?\n\s{2}\}/g) ?? []
        generated = objects
          .map((o) => {
            try {
              return JSON.parse(o) as Partial<RecommendationOption>
            } catch {
              return null
            }
          })
          .filter((o): o is Partial<RecommendationOption> => o !== null)
      }
    } catch {
      /* fall through to the deterministic shell below */
    }

    const options: RecommendationOption[] = top.map((r, i) => {
      const g = generated[i] ?? {}
      return {
        id: `rec-${i}-${Date.now().toString(36)}`,
        // Without the model, the ranking still stands on its own — degraded
        // wording is acceptable, a missing recommendation is not.
        title: g.title ?? `Repeat the approach from "${r.candidate.name}"`,
        rationale: g.rationale ?? r.rationale,
        initiativeType: g.initiativeType ?? inferType(r.candidate.type),
        targetKpiSlug: targetKpi,
        expectedImpact:
          g.expectedImpact ??
          (r.candidate.roi != null
            ? `Comparable case returned ${r.candidate.roi.toFixed(0)}% ROI; treat that as the upper end.`
            : 'Not estimable from the record.'),
        effort: (g.effort as RecommendationOption['effort']) ?? 'medium',
        confidence: confidence.band,
        confidenceReason: confidence.reason,
        score: r.score,
        scoreBreakdown: r.breakdown as unknown as Record<string, number>,
        analogs: [
          {
            name: r.candidate.name,
            outcome: r.candidate.goalAchieved,
            roi: r.candidate.roi ?? null,
          },
        ],
        limitations:
          r.breakdown.evidenceQuality < 0.5
            ? ['The comparable case has an incomplete results record, so its ROI is weakly supported.']
            : [],
        draft: buildDraft(g, r),
      }
    })

    // Persist so acceptance and feedback can be tracked (PRD §12.4).
    await persist(options, targetKpi)

    return Response.json({
      options,
      confidence: confidence.band,
      confidenceReason: confidence.reason,
      limitations: [],
      weights: DEFAULT_WEIGHTS,
      promptVersion: PROMPT_VERSION,
      model: MODEL,
    })
  } catch (e) {
    return Response.json(
      { options: [], confidence: 'low', confidenceReason: 'Recommendations are unavailable.', error: String(e) },
      { status: 200 },
    )
  }
}

function inferType(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Assemble the prefill payload, falling back to the analog's own shape when the
 * model gives nothing usable. A recommendation with no draft behind it would
 * leave the "Review draft" button doing nothing, which is worse than a sparse
 * draft the user can edit.
 */
function buildDraft(
  g: Partial<RecommendationOption> & Record<string, unknown>,
  r: { candidate: { name: string; actualSpend: number; lessonsLearned: string } },
): RecommendationOption['draft'] {
  const rawKpis = Array.isArray(g['projectKpis']) ? (g['projectKpis'] as unknown[]) : []
  const projectKpis: SuggestedProjectKpi[] = rawKpis
    .filter((k): k is Record<string, unknown> => Boolean(k) && typeof k === 'object')
    .map((k) => ({
      name: String(k['name'] ?? '').trim(),
      definition: String(k['definition'] ?? '').trim(),
      unit: String(k['unit'] ?? 'number'),
      direction: (k['direction'] === 'below' ? 'below' : 'above') as 'above' | 'below',
      targetValue: Number(k['targetValue']) || 0,
      measurementSource: String(k['measurementSource'] ?? '').trim(),
    }))
    .filter((k) => k.name && k.definition && k.measurementSource)

  const rawLines = Array.isArray(g['budgetLines']) ? (g['budgetLines'] as unknown[]) : []
  const budgetLines = rawLines
    .filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === 'object')
    .map((l) => ({ category: String(l['category'] ?? '').trim(), amount: Number(l['amount']) || 0 }))
    .filter((l) => l.category)

  // Anchor spend to the comparable case when the model proposed nothing.
  const suggestedBudget =
    budgetLines.length > 0
      ? budgetLines.reduce((sum, l) => sum + l.amount, 0)
      : Math.round(r.candidate.actualSpend)

  return {
    objective: String(g['objective'] ?? g.title ?? '').trim() ||
      `Improve performance by repeating what worked in "${r.candidate.name}", with the recorded lesson applied.`,
    mechanics: String(g['mechanics'] ?? r.candidate.lessonsLearned).trim(),
    projectKpis,
    budgetLines,
    suggestedBudget,
    durationDays: Number(g['durationDays']) || 14,
  }
}

async function persist(options: RecommendationOption[], kpiSlug?: string): Promise<void> {
  try {
    const sb = getClient()
    if (!sb) return
    const orgId = await getOrgId(sb)
    if (!orgId) return
    await sb.from('ai_recommendations').insert(
      options.map((o) => ({
        id: undefined,
        org_id: orgId,
        type: 'initiative',
        kpi_slug: kpiSlug ?? null,
        title: o.title,
        rationale: o.rationale,
        score: o.score,
        score_breakdown: o.scoreBreakdown,
        confidence_band: o.confidence,
        limitations: o.limitations.join(' '),
        evidence_refs: o.analogs.map((a) => a.name),
        expected_impact: o.expectedImpact,
        effort: o.effort,
        model_version: MODEL,
        prompt_version: PROMPT_VERSION,
        user_action: 'viewed',
      })),
    )
  } catch {
    /* pre-migration or transient — recommendations still render */
  }
}
