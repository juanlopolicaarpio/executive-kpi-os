// Attainment = how far a KPI is toward its target, direction-aware.
// 100% means "at target". For "higher is better" it's value/target; for
// "lower is better" (spend %, OOS) it's target/value, so being *under* the
// ceiling reads as ≥100%.
export function attainment(value: number | null | undefined, target: number | null | undefined, direction: 'above' | 'below' = 'above'): number | null {
  if (value == null || target == null || target === 0) return null
  const raw = direction === 'below' ? (value === 0 ? 2 : target / value) : value / target
  return Math.round(raw * 1000) / 10 // one decimal, as a percent
}
