export interface MarketWatchEntry {
  id: string
  platform: 'all' | 'shopee' | 'lazada' | 'tiktok-shop'
  category: string
  subcategory: string
  period: string
  rank: number
  brand: string
  isDemoCompany: boolean
  marketShare: number
  salesEstLow: number
  salesEstHigh: number
  unitsEstLow: number
  unitsEstHigh: number
  growth?: number
  snapshotDate: string
}

export interface MarketWatchFilter {
  platform: string
  category: string
  subcategory: string
  period: string
}

export interface PlatformDistribution {
  platform: string
  percentage: number
  salesEstLow: number
  salesEstHigh: number
  color: string
}
