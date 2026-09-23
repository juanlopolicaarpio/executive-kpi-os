export type MessageRole = 'user' | 'assistant' | 'system'
export type ChatSource = 'web' | 'telegram'

export interface ChatMessage {
  id: string
  userId: string
  role: MessageRole
  content: string
  source: ChatSource
  createdAt: string
  metadata?: {
    kpiReferences?: string[]
    planReferences?: string[]
    tokensUsed?: number
  }
}

export interface ChatSession {
  userId: string
  messages: ChatMessage[]
  lastActivityAt: string
}

export interface KpiContextItem {
  id: string
  name: string
  status: string
  currentValue: string
  target: string
  trend: string
  cadence?: string
  lastChecked: string
  asOf?: string
  isStale?: boolean
  ownerName: string
  platform: string
  recentHistory: { date: string; value: number; target: number }[]
  latestPlan?: string
}

export interface PlanContextItem {
  id: string
  kpiName: string
  ownerName: string
  status: string
  summary: string
  rootCause: string
  targetDate: string
  aiWarning?: string
  failedPreviousApproaches: string[]
}

export interface MissContextItem {
  kpiName: string
  actual: string
  target: string
  missedOn: string
  consecutiveMisses: number
  ownerName: string
}

export interface MarketContextItem {
  platform: string
  subcategory: string
  period: string
  companyRank: number
  companyShare: number
  leader: string
  leaderShare: number
}

export interface UploadContextItem {
  kpiName: string
  uploadedAt: string
  status: string
  uploadedByName: string
}

/** An initiative currently being executed. */
export interface InitiativeContextItem {
  id: string
  name: string
  type: string
  status: string
  ownerName: string
  approverName?: string
  progressPercent: number
  timeline: string
  approvedBudget?: number
  actualSpend?: number
  targetKpis: string[]
  overdue: boolean
}

/**
 * A closed initiative — the organization's institutional memory. This is what
 * makes evidence-based recommendations possible.
 */
export interface ClosedInitiativeContextItem {
  name: string
  type: string
  ownerName: string
  timeline: string
  targetKpis: string[]
  approvedBudget?: number
  actualSpend: number
  revenueGenerated?: number
  incrementalProfit?: number
  roi?: number
  roas?: number
  goalAchieved: string
  businessResults: string
  lessonsLearned: string
}

/** Aggregate return by initiative type — answers "where should we invest?" */
export interface RoiRollupItem {
  label: string
  count: number
  totalSpend: number
  totalIncrementalProfit: number
  roi: number | null
  successRatePct: number
}

export interface PersonPerformanceContextItem {
  memberId: string
  name: string
  role: string
  ownedKpiCount: number
  onTrack: number
  offTrack: number
  noData: number
  latestAsOf?: string
  cadences: string[]
  kpis: {
    name: string
    status: string
    currentValue: string
    target: string
    cadence: string
    asOf?: string
    isStale?: boolean
  }[]
}

export interface CompanyContext {
  user: {
    id: string
    name: string
    role: string
    ownedKpis: string[]
  }
  kpis: KpiContextItem[]
  openPlans: PlanContextItem[]
  recentMisses: MissContextItem[]
  marketWatch: MarketContextItem[]
  recentUploads: UploadContextItem[]
  activeInitiatives: InitiativeContextItem[]
  closedInitiatives: ClosedInitiativeContextItem[]
  roiByType: RoiRollupItem[]
  peoplePerformance: PersonPerformanceContextItem[]
  portfolio: {
    activeCount: number
    budgetInFlight: number
    totalSpendClosed: number
    totalIncrementalProfit: number
    portfolioRoi: number | null
  }
  orgSummary: {
    totalKpis: number
    onTrack: number
    atRisk: number
    missed: number
    lastUpdated: string
  }
}
