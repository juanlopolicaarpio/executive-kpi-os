import type { UserRole } from './user'

// Matches KpiStatusValue in lib/kpi/status.ts exactly — one vocabulary for
// status across the app, so a KPI reading At Risk on Home reads At Risk
// everywhere. PRD §11.1 defines three tiers plus No Data; dropping At Risk
// would collapse "watch this" and "intervene now" into one signal.
export type KpiStatus = 'on-track' | 'at-risk' | 'off-track' | 'no-data'
export type KpiCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export type KpiType = 'primary' | 'shared' | 'alert' | 'track'
export type Platform = 'shopee' | 'lazada' | 'tiktok-shop' | 'all'
export type KpiCategory = 'business-performance' | 'profitability' | 'growth-engine' | 'operations'

export interface KpiDataPoint {
  date: string
  value: number
  target: number
  uploadId?: string
}

export interface Kpi {
  id: string
  name: string
  category: KpiCategory
  strategicPurpose: string
  target: string
  targetNumeric?: number
  currentValue?: number
  currentValueDisplay: string
  cadence: KpiCadence
  nextCheckDate: string
  ownerId: string
  ownerName: string
  ownerRole: UserRole
  sharedOwnerIds?: string[]
  type: KpiType
  status: KpiStatus
  platform: Platform
  trend?: 'up' | 'down' | 'flat'
  whyItsCore: string
  history: KpiDataPoint[]
  uploadSchemaId: string
  visibleToRoles: UserRole[]
  /** 'live' when values come from the real backend (kpi_snapshots), else mock. */
  dataSource?: 'live' | 'mock'
  /** Backend unit: currency | percentage | number | ratio — for formatting. */
  unit?: string
  /** 'above' = higher is better, 'below' = lower is better. */
  targetDirection?: 'above' | 'below'
}
