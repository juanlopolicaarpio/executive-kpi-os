// Shared formatters. Dates are always spelled out ("June 2026", "June 30, 2026")
// never numeric (no 06-30-2026). Northstar demo sheets mix daily and weekly
// grains, so surfaces use human-readable period labels.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parts(input: string | Date) {
  const d = typeof input === 'string'
    ? new Date(input.length <= 10 ? `${input}T00:00:00Z` : input)
    : input
  if (isNaN(d.getTime())) return null
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() }
}

/** "June 2026" */
export function formatMonth(input: string | Date): string {
  const p = parts(input)
  return p ? `${MONTHS[p.m]} ${p.y}` : '—'
}

/** "Jun 2026" — for dense axes only. */
export function formatMonthShort(input: string | Date): string {
  const p = parts(input)
  return p ? `${MONTHS[p.m]!.slice(0, 3)} ${p.y}` : '—'
}

/** "June 30, 2026" */
export function formatDay(input: string | Date): string {
  const p = parts(input)
  return p ? `${MONTHS[p.m]} ${p.day}, ${p.y}` : '—'
}

/** Peso, compact: ₱12.1M / ₱850K / ₱271 */
export function formatPeso(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`
  return `₱${Math.round(v).toLocaleString()}`
}

/** Signed percent: +4% / −7% (true minus sign, never "+-7%") */
export function formatDelta(v: number): string {
  if (v > 0) return `+${v}%`
  if (v < 0) return `−${Math.abs(v)}%`
  return '0%'
}
