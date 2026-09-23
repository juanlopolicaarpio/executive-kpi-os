// The KPI status engine (PRD §11.1), trend logic (§11.2) and Health Score
// (§11.3).
//
// This is the single normative implementation. The PRD is explicit that these
// rules must live in one place rather than being re-derived per screen.

export type KpiStatusValue = 'on-track' | 'at-risk' | 'off-track' | 'no-data'
export type TargetDirection = 'above' | 'below' | 'range'

export const STATUS_LABELS: Record<KpiStatusValue, string> = {
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'off-track': 'Off Track',
  'no-data': 'No Data',
}

export interface Thresholds {
  /** Performance ratio at or above which a KPI is On Track. Default 1.0. */
  onTrack: number
  /** Deprecated compatibility field. KPI status is binary: on target/off target. */
  atRisk: number
}

export const DEFAULT_THRESHOLDS: Thresholds = { onTrack: 1.0, atRisk: 0.9 }

export interface StatusInput {
  value: number | null | undefined
  target: number | null | undefined
  direction: TargetDirection
  /** Required when direction is 'range'. */
  lower?: number | null
  upper?: number | null
  thresholds?: Thresholds | null
}

export interface StatusResult {
  status: KpiStatusValue
  /** Direction-aware performance ratio. Null when it cannot be computed. */
  ratio: number | null
  /** Signed distance from target as a percentage; negative means short. */
  deviationPct: number | null
}

/**
 * Direction-aware performance ratio.
 *
 * Higher-is-better: actual / target. Lower-is-better: target / actual, so
 * coming in UNDER a spend ceiling reads as >= 1.0.
 *
 * Returns null rather than dividing by zero. A target of zero is not a
 * degenerate case to paper over — the PRD requires such KPIs to use range
 * logic instead, and silently returning Infinity would hide the misconfiguration.
 */
export function performanceRatio(input: StatusInput): number | null {
  const { value, target, direction, lower, upper } = input
  if (value == null) return null

  if (direction === 'range') {
    if (lower == null || upper == null) return null
    if (value >= lower && value <= upper) return 1
    // Outside the band: express how far out, relative to the band's own width,
    // so a narrow target is not judged as leniently as a wide one.
    const width = upper - lower
    if (width <= 0) return null
    const distance = value < lower ? lower - value : value - upper
    return Math.max(0, 1 - distance / width)
  }

  if (target == null || target === 0) return null
  if (direction === 'below') {
    if (value === 0) return 2 // comfortably under any positive ceiling
    return target / value
  }
  return value / target
}

/** PRD §11.1. Missing value or target yields No Data — never a fabricated status. */
export function computeStatus(input: StatusInput): StatusResult {
  const t = input.thresholds ?? DEFAULT_THRESHOLDS
  const ratio = performanceRatio(input)

  if (ratio == null) {
    return { status: 'no-data', ratio: null, deviationPct: null }
  }

  // PRD §11.1 defines THREE tiers. Collapsing to two makes the atRisk
  // threshold dead configuration and erases the distinction between a KPI to
  // watch and one to intervene on.
  const status: KpiStatusValue =
    ratio >= t.onTrack ? 'on-track' : ratio >= t.atRisk ? 'at-risk' : 'off-track'

  return {
    status,
    ratio,
    deviationPct: Math.round((ratio - 1) * 1000) / 10,
  }
}

/** Parse a thresholds JSON blob defensively; fall back to defaults. */
export function parseThresholds(raw: unknown): Thresholds {
  if (!raw || typeof raw !== 'object') return DEFAULT_THRESHOLDS
  const r = raw as Record<string, unknown>
  const onTrack = Number(r['onTrack'])
  const atRisk = Number(r['atRisk'])
  if (!Number.isFinite(onTrack) || !Number.isFinite(atRisk)) return DEFAULT_THRESHOLDS
  // A nonsensical override (at-risk above on-track) would invert the whole
  // scale; refuse it rather than produce backwards statuses.
  if (atRisk > onTrack) return DEFAULT_THRESHOLDS
  return { onTrack, atRisk }
}

// ---------------------------------------------------------------------------
// Trend and material change (PRD §11.2)
// ---------------------------------------------------------------------------

export type TrendDirection = 'improving' | 'flat' | 'declining'

export interface TrendResult {
  direction: TrendDirection
  /** Raw percentage change, sign as measured (not direction-adjusted). */
  changePct: number | null
  /** True when the movement clears the material-change threshold. */
  isMaterial: boolean
}

export interface TrendOptions {
  /** Absolute change below this reads as Flat. Default 2%. */
  flatTolerancePct?: number
  /** Direction-aware change at or above this is material. Default 5%. */
  materialPct?: number
}

/**
 * Direction-aware trend. For lower-is-better KPIs a decrease is an
 * improvement, so the sign is interpreted, never assumed.
 */
export function computeTrend(
  current: number | null | undefined,
  previous: number | null | undefined,
  direction: TargetDirection,
  opts: TrendOptions = {},
): TrendResult {
  const flat = opts.flatTolerancePct ?? 2
  const material = opts.materialPct ?? 5

  if (current == null || previous == null || previous === 0) {
    return { direction: 'flat', changePct: null, isMaterial: false }
  }

  const changePct = ((current - previous) / Math.abs(previous)) * 100
  if (Math.abs(changePct) < flat) {
    return { direction: 'flat', changePct, isMaterial: false }
  }

  // 'range' has no monotonic better direction; treat movement as neutral.
  const improving =
    direction === 'range' ? false : direction === 'below' ? changePct < 0 : changePct > 0

  return {
    direction: direction === 'range' ? 'flat' : improving ? 'improving' : 'declining',
    changePct,
    isMaterial: Math.abs(changePct) >= material,
  }
}

// ---------------------------------------------------------------------------
// KPI Health Score (PRD §11.3)
// ---------------------------------------------------------------------------

const STATUS_SCORE: Record<Exclude<KpiStatusValue, 'no-data'>, number> = {
  'on-track': 100,
  'at-risk': 60,
  'off-track': 20,
}

export interface HealthScoreInput {
  status: KpiStatusValue
  /** 1-5. */
  weight: number
}

export interface HealthScoreResult {
  /** 0-100, rounded. Null when nothing could be included. */
  score: number | null
  includedCount: number
  /** No Data KPIs are excluded from the score but must still be surfaced. */
  excludedCount: number
  counts: Record<KpiStatusValue, number>
}

/**
 * Weighted health score. No Data KPIs are EXCLUDED from the average rather
 * than scored as zero — counting absent data as failure would let a broken
 * pipeline masquerade as poor performance. They are counted separately so the
 * UI can say how many were left out.
 */
export function healthScore(kpis: HealthScoreInput[]): HealthScoreResult {
  const counts: Record<KpiStatusValue, number> = {
    'on-track': 0,
    'at-risk': 0,
    'off-track': 0,
    'no-data': 0,
  }

  let weighted = 0
  let totalWeight = 0
  let included = 0

  for (const k of kpis) {
    counts[k.status] += 1
    if (k.status === 'no-data') continue
    const weight = Number.isFinite(k.weight) ? Math.min(5, Math.max(1, k.weight)) : 3
    weighted += STATUS_SCORE[k.status] * weight
    totalWeight += weight
    included += 1
  }

  return {
    score: totalWeight > 0 ? Math.round(weighted / totalWeight) : null,
    includedCount: included,
    excludedCount: counts['no-data'],
    counts,
  }
}

/** Band for presentation. Deliberately coarse — this is a summary, not a grade. */
export function healthBand(score: number | null): { label: string; status: KpiStatusValue } {
  if (score == null) return { label: 'No data', status: 'no-data' }
  if (score >= 85) return { label: 'Healthy', status: 'on-track' }
  return { label: 'Struggling', status: 'off-track' }
}
