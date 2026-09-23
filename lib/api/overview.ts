import type { BusinessHealth, DailySales, PlatformPerformance } from '@/types/domain'

export interface OverviewLive {
  health: BusinessHealth
  salesHistory: DailySales[]
  platforms: PlatformPerformance[]
}

// Client-side fetch of real Overview data, memoized briefly so the three
// Overview hooks share one round-trip instead of three.
let cache: { t: number; promise: Promise<OverviewLive | null> } | null = null

export function getOverviewLive(): Promise<OverviewLive | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (cache && Date.now() - cache.t < 15000) return cache.promise
  const promise = fetch('/api/overview/live')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d && d.health ? (d as OverviewLive) : null))
    .catch(() => null)
  cache = { t: Date.now(), promise }
  return promise
}
