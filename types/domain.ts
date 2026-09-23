// KPI OS domain model.
// These types describe the business domain independently of where the data
// comes from. The mock generators in lib/data implement them today; a real
// Supabase-backed repository can implement the same shapes later.

export type Platform = 'shopee' | 'lazada' | 'tiktok-shop'

export const PLATFORM_LABELS: Record<Platform, string> = {
  'shopee': 'Paid Search',
  'lazada': 'Paid Social',
  'tiktok-shop': 'Affiliate',
}

/** Functional owner of a KPI or intervention (per the KPI Ownership Engine). */
export type OwnerRole =
  | 'E-Commerce Lead'
  | 'Media Lead'
  | 'Marketplace Lead'
  | 'Operations Lead'
  | 'Growth Lead'

export interface Owner {
  name: string
  role: OwnerRole
}

// ---------------------------------------------------------------------------
// Sales & performance
// ---------------------------------------------------------------------------

export interface DailySales {
  date: string // ISO date (yyyy-MM-dd)
  totalSales: number // PHP
  target: number
  orders: number
  byPlatform: Record<Platform, number>
}

export interface PlatformPerformance {
  platform: Platform
  /** Conclusion-first headline, e.g. "Paid Search Recovery" */
  takeaway: string
  sales30d: number
  growthPct: number // vs previous 30 days
  conversionPct: number
  conversionTrend: 'up' | 'down' | 'flat'
  traffic30d: number
  roas: number
}

export interface SkuPerformance {
  id: string
  name: string
  category: string
  revenue30d: number
  unitsSold30d: number
  growthPct: number
  topPlatform: Platform
}

export type InventoryStatus = 'healthy' | 'low' | 'critical' | 'overstocked'

export interface InventoryItem {
  skuId: string
  skuName: string
  stockOnHand: number
  dailyVelocity: number // avg units/day
  daysOfCover: number
  reorderPoint: number
  status: InventoryStatus
}

// ---------------------------------------------------------------------------
// KPI health (conclusion-first)
// ---------------------------------------------------------------------------

export type KpiHealthStatus = 'healthy' | 'watch' | 'attention'

export interface KpiHealth {
  id: string
  /** Strategic conclusion, e.g. "Marketing Efficiency Remains Healthy" — never a bare metric name */
  headline: string
  metric: string // underlying metric name, e.g. "ROAS"
  valueDisplay: string
  targetDisplay: string
  attainmentPct: number
  trend: 'up' | 'down' | 'flat'
  status: KpiHealthStatus
  owner: Owner
  sparkline: number[] // recent values for mini-chart
}

// ---------------------------------------------------------------------------
// Signals (Universal Intervention Rule: every issue carries an intervention)
// ---------------------------------------------------------------------------

export type SignalType = 'risk' | 'opportunity' | 'change'
export type SignalStatus = 'new' | 'acknowledged' | 'actioned' | 'resolved'

export interface Signal {
  id: string
  type: SignalType
  /** Conclusion-first headline, e.g. "Conversion Requires Attention" */
  headline: string
  observation: string
  implication: string
  recommendedIntervention: string
  owner: Owner
  expectedOutcome: string
  confidencePct: number
  detectedAt: string // ISO datetime
  relatedKpi?: string
  status: SignalStatus
  playbookId?: string
}

// ---------------------------------------------------------------------------
// Interventions / Priorities (Accountability Engine)
// ---------------------------------------------------------------------------

export type InterventionStatus =
  | 'not-started'
  | 'in-progress'
  | 'awaiting-review'
  | 'complete'
  | 'overdue'

export interface Intervention {
  id: string
  title: string
  issue: string
  owner: Owner
  dueDate: string // ISO date
  status: InterventionStatus
  progressPct: number
  expectedOutcome: string
  actualOutcome?: string
  sourceSignalId?: string
  /** Set when the Follow-Up Engine has prompted "Record Learning?" */
  learningRecorded?: boolean
}

// ---------------------------------------------------------------------------
// Playbooks (intervention library)
// ---------------------------------------------------------------------------

export type EffortLevel = 'low' | 'medium' | 'high'

export interface Playbook {
  id: string
  issueType: string
  intervention: string
  description: string
  expectedImpact: string
  effortLevel: EffortLevel
  defaultOwnerRole: OwnerRole
  successRatePct: number
  timesUsed: number
  relatedLearningIds: string[]
}

// ---------------------------------------------------------------------------
// Institutional memory (Insights)
// ---------------------------------------------------------------------------

export interface Learning {
  id: string
  title: string
  summary: string
  context: string
  outcome: string
  recordedAt: string
  sourceInterventionId?: string
  tags: string[]
}

export type DecisionStatus = 'monitoring' | 'validated' | 'failed'

export interface DecisionRecord {
  id: string
  decision: string
  date: string
  reason: string
  owner: Owner
  expectedOutcome: string
  actualOutcome?: string
  status: DecisionStatus
}

// ---------------------------------------------------------------------------
// Daily Brief & Overview
// ---------------------------------------------------------------------------

export interface DailyBrief {
  date: string
  /** e.g. "Sales Momentum Positive" */
  headline: string
  /**
   * Sales for the most recent closed period. Named `yesterdaySales` for
   * historical reasons — the actual period is described by `periodLabel`
   * (some demo source sheets are weekly, not daily).
   */
  yesterdaySales: number
  /** Human label for the period the figures cover, e.g. "June 2026". */
  periodLabel?: string
  growthPct: number
  targetAchievementPct: number
  attentionItems: Signal[]
  opportunities: Signal[]
  actionsDueToday: Intervention[]
  recommendedFocus: string
}

export interface BusinessHealth {
  /** Overall strategic takeaway for the Overview screen */
  takeaway: string
  summary: string
  kpis: KpiHealth[]
  risks: Signal[]
  opportunities: Signal[]
}

// ---------------------------------------------------------------------------
// Publications
// ---------------------------------------------------------------------------

export type PublicationType = 'executive-brief' | 'marketplace-review' | 'ai-narrative'
export type PublicationStatus = 'draft' | 'published'

export interface Publication {
  id: string
  type: PublicationType
  title: string
  summary: string
  period: string // e.g. "Week of Jun 1–7, 2026"
  generatedAt: string
  status: PublicationStatus
  /** Section structure follows the Reporting Rule: Conclusion → Evidence → Intervention */
  sections: PublicationSection[]
}

export interface PublicationSection {
  conclusion: string
  supportingEvidence: string[]
  recommendedIntervention: string
}
