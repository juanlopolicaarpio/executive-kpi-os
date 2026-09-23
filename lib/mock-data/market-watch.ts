import type { MarketWatchEntry, PlatformDistribution } from '@/types/market-watch'

export const mockMarketWatchData: MarketWatchEntry[] = [
  {
    id: 'ns-partner-1',
    platform: 'all',
    category: 'Partner Ecosystem',
    subcategory: 'Bank Partners',
    period: 'August 2026',
    rank: 1,
    brand: 'Pioneer Bank',
    isDemoCompany: false,
    marketShare: 26,
    salesEstLow: 800000,
    salesEstHigh: 900000,
    unitsEstLow: 0,
    unitsEstHigh: 0,
    growth: 22.6,
    snapshotDate: '2026-08-23',
  },
  {
    id: 'ns-partner-2',
    platform: 'all',
    category: 'Partner Ecosystem',
    subcategory: 'Digital Banks',
    period: 'August 2026',
    rank: 2,
    brand: 'Orbit Wallet',
    isDemoCompany: false,
    marketShare: 19,
    salesEstLow: 550000,
    salesEstHigh: 620000,
    unitsEstLow: 0,
    unitsEstHigh: 0,
    growth: 19,
    snapshotDate: '2026-08-23',
  },
]

export const mockPlatformDistributions: PlatformDistribution[] = [
  { platform: 'Paid Search', percentage: 32, salesEstLow: 900000, salesEstHigh: 1000000, color: '#0f766e' },
  { platform: 'Paid Social', percentage: 24, salesEstLow: 700000, salesEstHigh: 780000, color: '#2563eb' },
  { platform: 'Affiliate', percentage: 21, salesEstLow: 620000, salesEstHigh: 700000, color: '#9333ea' },
  { platform: 'CRM', percentage: 14, salesEstLow: 390000, salesEstHigh: 450000, color: '#ca8a04' },
  { platform: 'Offline/Corporate', percentage: 9, salesEstLow: 240000, salesEstHigh: 290000, color: '#64748b' },
]
