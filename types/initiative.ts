// The Initiative — the operating engine of KPI OS.
//
// "Any meaningful activity intended to improve one or more KPIs." That covers a
// mega-sale campaign, a product launch, a pricing change, a key hire — and also
// a recovery plan for a missed KPI, which is simply `initiativeType: 'recovery'`
// rather than a separate object.
//
// Mirrors supabase/migrations/007_initiatives.sql.

// PRD §11.4. Approval is a blocking gate: nothing executes until an approver
// approves and the owner starts.
export type InitiativeStatus =
  | 'draft' // being written, not yet submitted
  | 'pending-approval' // submitted, waiting on the approver
  | 'approved' // approved but execution not yet started
  | 'active' // owner has started; execution under way
  | 'completed' // execution finished, awaiting results submission
  | 'results-submitted' // results in, awaiting reviewer pickup
  | 'under-review' // reviewer is evaluating the results
  | 'closed' // closure approved; written to institutional memory
  | 'rejected' // approver rejected it
  | 'cancelled' // stopped after approval

export type InitiativeType =
  | 'campaign'
  | 'mega-sale'
  | 'bundle-promo'
  | 'media'
  | 'product-launch'
  | 'pricing'
  | 'crm'
  | 'ai-deployment'
  | 'ops-improvement'
  | 'hiring'
  | 'process'
  | 'recovery'
  | 'other'

export type InitiativePriority = 'low' | 'medium' | 'high' | 'critical'

export type GoalAchieved = 'yes' | 'partial' | 'no'

export type InitiativeSource = 'manual' | 'recovery' | 'ai-suggested'

/** One of the KPIs this initiative intends to move. */
export interface InitiativeKpi {
  id: string
  /** Backend slug, e.g. `net_sales`. Use lib/kpi-map to reach the app route id. */
  kpiSlug: string
  /** App route id, e.g. `kpi-1`. Resolved for convenience. */
  appId?: string
  name?: string
  unit?: string
  isPrimary: boolean
  /** KPI value when the initiative went active. */
  baselineValue?: number
  /** Optional explicit goal for this KPI. */
  targetDelta?: number
  /** KPI value captured at results submission. */
  resultValue?: number
}

/** The mandatory results submission. No initiative closes without one. */
export interface InitiativeResults {
  id: string
  initiativeId: string

  goalAchieved: GoalAchieved
  actualSpend: number
  businessResults: string
  lessonsLearned: string

  revenueGenerated?: number
  incrementalRevenue?: number
  incrementalProfit?: number

  /** Derived in Postgres: (incremental profit − spend) / spend, as a percent. */
  roi?: number
  /** Derived in Postgres: revenue generated / spend. */
  roas?: number

  submittedById?: string
  submittedByName?: string
  submittedAt: string

  reviewedById?: string
  reviewedByName?: string
  reviewedAt?: string
  reviewNotes?: string
}

export interface InitiativeEvent {
  id: string
  initiativeId: string
  /** Matches the InitiativeAction vocabulary plus lifecycle notes. */
  eventType: string
  actorId?: string
  actorName?: string
  message?: string
  data?: Record<string, unknown>
  createdAt: string
}

/** A progress update on an active initiative (PRD §7.4). */
export interface InitiativeUpdate {
  id: string
  initiativeId: string
  authorId?: string
  authorName?: string
  progressPercent: number
  note: string
  isBlocked: boolean
  blockerNote?: string
  createdAt: string
}

/** An approval or review decision (PRD §12.4). */
export interface InitiativeApproval {
  id: string
  initiativeId: string
  stage: 'approval' | 'review'
  actorId?: string
  actorName?: string
  decision: 'approved' | 'rejected' | 'revision-requested'
  comment?: string
  createdAt: string
}

export interface Initiative {
  id: string
  orgId: string

  name: string
  description?: string
  initiativeType: InitiativeType
  status: InitiativeStatus
  priority: InitiativePriority

  /** §7.2 — the plain-language outcome this initiative exists to achieve. */
  overallObjective?: string
  /** §7.2 — action, audience/process, mechanics, dependencies, assumptions. */
  descriptionMechanics?: string

  /** §7.3 — exactly one existing organizational KPI. */
  masterKpiId?: string
  masterKpiSlug?: string
  masterKpiName?: string

  sourceType: InitiativeSourceType
  sourceTemplateId?: string
  sourceTemplateName?: string
  sourceAiRecommendationId?: string

  ownerId?: string
  ownerName?: string
  /** Gates execution. Never the owner (PRD §12.1). */
  approverId?: string
  approverName?: string
  /** Reviews submitted results. Never the owner (PRD §12.1). */
  reviewerId?: string
  reviewerName?: string

  startDate?: string
  endDate?: string

  /** What the user entered / lines sum to. */
  totalBudget?: number
  /** The ceiling the approval actually granted. Diverges during a revision. */
  approvedBudget?: number
  actualSpend?: number
  currency?: string
  approvalPolicyVersion?: number
  matchedTierId?: string
  autoApproved?: boolean

  /** Manual only — never inferred from KPI movement (PRD §7.4). */
  progressPercent: number
  latestUpdateAt?: string

  rejectionReason?: string
  cancellationReason?: string

  source: InitiativeSource
  /** Set when this initiative was spawned by a KPI-miss ticket. */
  ticketId?: string
  triggerKpiSlug?: string
  parentInitiativeId?: string

  aiSuggestion?: string
  aiWarning?: string

  createdAt: string
  updatedAt: string
  submittedForApprovalAt?: string
  approvedAt?: string
  startedAt?: string
  completedAt?: string
  closedAt?: string

  /** Target KPIs — an initiative may intend to move several. */
  /** Legacy many-to-many links from before v1.1. Read-only history. */
  targetKpis: InitiativeKpi[]
  projectKpis: ProjectKpi[]
  budgetLines: BudgetLine[]
  results?: InitiativeResults
  events?: InitiativeEvent[]
  updates?: InitiativeUpdate[]
  approvals?: InitiativeApproval[]
  budgetRevisions?: BudgetRevision[]
}


// ---------------------------------------------------------------------------
// PRD v1.1 §7.3 — Master KPI and Project KPIs
// ---------------------------------------------------------------------------

export type InitiativeSourceType = 'blank' | 'template' | 'ai'

/**
 * A metric created specifically to evaluate THIS initiative. Distinct from the
 * Master KPI (an existing organizational KPI) — Project KPIs measure execution
 * quality, leading indicators or direct output, and do not become permanent
 * organizational KPIs.
 */
export interface ProjectKpi {
  id: string
  initiativeId: string
  name: string
  definition: string
  unit: string
  direction: 'above' | 'below' | 'range'
  baselineValue?: number
  /** Required when a baseline is genuinely unavailable. */
  baselineReason?: string
  targetValue: number
  measurementSource: string
  measurementFrequency?: string
  currentValue?: number
  resultValue?: number
  resultPeriodStart?: string
  resultPeriodEnd?: string
  resultUnavailableReason?: string
  sortOrder: number
}

export interface BudgetLine {
  id: string
  initiativeId: string
  revisionId?: string
  lineType: 'planned' | 'actual'
  category: string
  description?: string
  amount: number
  currency: string
  sortOrder: number
}

export interface BudgetRevision {
  id: string
  initiativeId: string
  previousTotal: number
  proposedTotal: number
  reason: string
  policyVersion?: number
  tierId?: string
  routedApproverId?: string
  routedApproverName?: string
  status: 'pending' | 'approved' | 'rejected'
  decidedById?: string
  decidedByName?: string
  decidedAt?: string
  decisionComment?: string
  createdAt: string
}

export interface InitiativeTemplate {
  id: string
  /** Null for system templates. */
  orgId?: string
  name: string
  initiativeType: InitiativeType
  objectivePrompt?: string
  mechanicsTemplate?: string
  projectKpiDefaults: {
    name: string
    definition: string
    unit: string
    direction: 'above' | 'below' | 'range'
    measurement_source: string
  }[]
  budgetCategories: string[]
  defaultDurationDays?: number
  version: number
  isActive: boolean
}

/** The result of the §11.5 routing engine, as returned to the client. */
export interface ApprovalRoute {
  ok: boolean
  totalBudget: number
  currency: string
  policyVersion: number | null
  approvalRequired: boolean
  approverId: string | null
  approverName: string | null
  usedDelegate: boolean
  resultingStatus: 'approved' | 'pending_approval'
  tierLabel?: string
  description: string
  error?: string
}

/** Shape used by list views — no events, no full results body. */
export type InitiativeSummary = Omit<Initiative, 'events' | 'updates' | 'approvals'>

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface InitiativeFilters {
  section?: InitiativeSection
  kpiSlug?: string
  ownerId?: string
  approverId?: string
  status?: InitiativeStatus
  initiativeType?: InitiativeType
  priority?: InitiativePriority
  masterKpiSlug?: string
  sourceType?: InitiativeSourceType
  templateId?: string
  /** ISO dates — matches initiatives overlapping the range. */
  from?: string
  to?: string
  search?: string
  hasBudget?: boolean
  overdue?: boolean
}

/**
 * PRD §7.1: four default status groups, plus a separate All view that exposes
 * Draft, Approved, Rejected and Cancelled.
 */
export type InitiativeSection =
  | 'drafts'
  | 'active'
  | 'pending-approval'
  | 'for-review'
  | 'closed'
  | 'all'
