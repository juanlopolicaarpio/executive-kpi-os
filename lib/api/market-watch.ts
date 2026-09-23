import type { MarketWatchEntry } from '@/types/market-watch'
import { mockMarketWatchData } from '@/lib/mock-data/market-watch'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

export async function getMarketWatch(): Promise<MarketWatchEntry[]> {
  if (USE_MOCK) return mockMarketWatchData
  throw new Error('Live DB not configured')
}
