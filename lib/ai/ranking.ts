import type { ClosedInitiativeContextItem } from '@/types/chat'

// PRD §9.4 recommendation ranking.
//
// The score is deliberately TRANSPARENT rather than learned: every component is
// computed from records the user can inspect, and the breakdown is returned so
// a recommendation can be argued with. An opaque score would be worse than no
// score, because it would look authoritative without being checkable.

export interface RankingWeights {
  kpiRelevance: number
  historicalOutcome: number
  contextSimilarity: number
  impactVsEffort: number
  evidenceQuality: number
}

/** PRD §9.4 defaults. Configurable after testing, per the spec. */
export const DEFAULT_WEIGHTS: RankingWeights = {
  kpiRelevance: 0.3,
  historicalOutcome: 0.25,
  contextSimilarity: 0.2,
  impactVsEffort: 0.15,
  evidenceQuality: 0.1,
}

export interface RankingContext {
  /** The KPI slug/name the recommendation is meant to move. */
  targetKpi?: string
  initiativeType?: string
}

export interface ScoreBreakdown {
  kpiRelevance: number
  historicalOutcome: number
  contextSimilarity: number
  impactVsEffort: number
  evidenceQuality: number
}

export interface RankedCandidate {
  candidate: ClosedInitiativeContextItem
  score: number
  breakdown: ScoreBreakdown
  /** Plain-language justification of the score, for the UI. */
  rationale: string
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Callers pass a KPI slug (`net_sales`) but closed initiatives record display
 * names ("Net Sales"). Normalising both sides is what makes the comparison
 * meaningful — without it every match scores as a near-miss.
 */
const normalizeKpi = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** 0–1 overlap between the candidate's target KPIs and the one in question. */
function kpiRelevance(c: ClosedInitiativeContextItem, ctx: RankingContext): number {
  if (!ctx.targetKpi) return 0.5 // no specific KPI asked about — neutral
  const needle = normalizeKpi(ctx.targetKpi)
  const hit = c.targetKpis.some((k) => {
    const candidate = normalizeKpi(k)
    return candidate === needle || candidate.includes(needle) || needle.includes(candidate)
  })
  if (hit) return 1
  // Partial credit when it moved *something*, so an initiative with no KPI
  // link never outranks one that at least measured itself.
  return c.targetKpis.length > 0 ? 0.2 : 0
}

/** Reviewer-approved success plus direction-aware ROI. */
function historicalOutcome(c: ClosedInitiativeContextItem): number {
  const goal = c.goalAchieved === 'yes' ? 1 : c.goalAchieved === 'partial' ? 0.5 : 0
  // ROI mapped onto 0–1 with 100% ROI as the "clearly good" anchor.
  const roi = c.roi == null ? 0.5 : clamp01((c.roi + 50) / 150)
  return clamp01(goal * 0.6 + roi * 0.4)
}

/** Type and template similarity (PRD §9.5 "context and template fit"). */
function contextSimilarity(c: ClosedInitiativeContextItem, ctx: RankingContext): number {
  if (!ctx.initiativeType) return 0.5
  return c.type.toLowerCase() === ctx.initiativeType.toLowerCase() ? 1 : 0
}

/** Upside relative to what it cost. */
function impactVsEffort(c: ClosedInitiativeContextItem): number {
  if (!c.actualSpend || c.actualSpend <= 0) return 0.5
  if (c.incrementalProfit == null) return 0.4
  const multiple = c.incrementalProfit / c.actualSpend
  // 2x return on spend anchors the top of the scale.
  return clamp01(multiple / 2)
}

/** Completeness of the record — an incomplete case is weaker evidence. */
function evidenceQuality(c: ClosedInitiativeContextItem): number {
  const checks = [
    c.actualSpend > 0,
    c.incrementalProfit != null,
    c.revenueGenerated != null,
    c.targetKpis.length > 0,
    c.lessonsLearned.trim().length >= 40,
    c.businessResults.trim().length >= 50,
  ]
  return checks.filter(Boolean).length / checks.length
}

export function scoreCandidate(
  candidate: ClosedInitiativeContextItem,
  ctx: RankingContext,
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankedCandidate {
  const breakdown: ScoreBreakdown = {
    kpiRelevance: kpiRelevance(candidate, ctx),
    historicalOutcome: historicalOutcome(candidate),
    contextSimilarity: contextSimilarity(candidate, ctx),
    impactVsEffort: impactVsEffort(candidate),
    evidenceQuality: evidenceQuality(candidate),
  }

  const score =
    breakdown.kpiRelevance * weights.kpiRelevance +
    breakdown.historicalOutcome * weights.historicalOutcome +
    breakdown.contextSimilarity * weights.contextSimilarity +
    breakdown.impactVsEffort * weights.impactVsEffort +
    breakdown.evidenceQuality * weights.evidenceQuality

  const parts: string[] = []
  if (breakdown.kpiRelevance >= 0.9) parts.push('targeted the same KPI')
  if (candidate.goalAchieved === 'yes') parts.push('met its goal')
  else if (candidate.goalAchieved === 'no') parts.push('did NOT meet its goal')
  if (candidate.roi != null) parts.push(`returned ${candidate.roi.toFixed(0)}% ROI`)
  if (breakdown.evidenceQuality < 0.5) parts.push('but its record is incomplete')

  return {
    candidate,
    score: Math.round(score * 1000) / 10,
    breakdown,
    rationale: parts.length > 0 ? parts.join(', ') : 'limited comparable detail on record',
  }
}

export function rankCandidates(
  candidates: ClosedInitiativeContextItem[],
  ctx: RankingContext,
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankedCandidate[] {
  return candidates
    .map((c) => scoreCandidate(c, ctx, weights))
    .sort((a, b) => b.score - a.score)
}

/**
 * Confidence for a recommendation set. Sample size dominates: one strong
 * analog is a hint, six is a pattern. High/Medium/Low only — the PRD rules out
 * precise probabilities for MVP.
 */
export function recommendationConfidence(ranked: RankedCandidate[]): {
  band: 'high' | 'medium' | 'low'
  reason: string
} {
  const strong = ranked.filter((r) => r.score >= 60)
  if (ranked.length === 0) {
    return { band: 'low', reason: 'No comparable closed initiatives on record.' }
  }
  if (strong.length >= 4) {
    return { band: 'high', reason: `${strong.length} closely comparable cases with verified outcomes.` }
  }
  if (strong.length >= 1) {
    return {
      band: 'medium',
      reason: `${strong.length} comparable case${strong.length === 1 ? '' : 's'} — indicative, not established.`,
    }
  }
  return { band: 'low', reason: 'Closed initiatives exist but none closely match this situation.' }
}
