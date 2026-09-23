import type {
  Initiative,
  InitiativeFilters,
  InitiativeTemplate,
  ApprovalRoute,
  ProjectKpi,
  InitiativeType,
  InitiativePriority,
  InitiativeSource,
  GoalAchieved,
} from '@/types/initiative'
import type { InitiativeAction } from '@/lib/initiatives/lifecycle'
import type { MemberLite } from '@/lib/initiatives/mapping'
import { sessionFetch } from '@/lib/api/session-fetch'

// Thin client fetchers for the initiatives API. Mirrors lib/api/kpis.ts: no
// mock fallback — where the backend has nothing, the UI shows an empty state.

export interface InitiativeListResult {
  initiatives: Initiative[]
  members: MemberLite[]
  /** True when the initiatives tables are not reachable (e.g. pre-migration). */
  unavailable?: boolean
}

export interface KpiSeriesPoint {
  date: string
  value: number
  target: number | null
}

export interface InitiativeDetail {
  initiative: Initiative
  kpiSeries: Record<string, KpiSeriesPoint[]>
}

export interface InitiativeStats {
  counts: {
    drafts: number
    active: number
    pendingApproval: number
    forReview: number
    closed: number
    draft: number
    approvedNotStarted: number
  }
  budget: {
    approvedInFlight: number
    spentInFlight: number
    totalSpendClosed: number
    totalIncrementalProfit: number
  }
  portfolioRoi: number | null
  byType: {
    initiativeType: InitiativeType
    label: string
    count: number
    totalSpend: number
    totalIncrementalProfit: number
    roi: number | null
    successRatePct: number
  }[]
  byKpi: { kpiSlug: string; name: string; initiativeCount: number; totalSpend: number; roi: number | null }[]
  topPerformers: Initiative[]
  underPerformers: Initiative[]
  recentlyClosed: Initiative[]
  unavailable?: boolean
}

function toQuery(filters: InitiativeFilters = {}): string {
  const p = new URLSearchParams()
  if (filters.section) p.set('section', filters.section)
  if (filters.kpiSlug) p.set('kpi', filters.kpiSlug)
  if (filters.ownerId) p.set('owner', filters.ownerId)
  if (filters.approverId) p.set('approver', filters.approverId)
  if (filters.status) p.set('status', filters.status)
  if (filters.initiativeType) p.set('type', filters.initiativeType)
  if (filters.priority) p.set('priority', filters.priority)
  if (filters.from) p.set('from', filters.from)
  if (filters.to) p.set('to', filters.to)
  if (filters.search) p.set('search', filters.search)
  if (filters.hasBudget) p.set('hasBudget', 'true')
  if (filters.overdue) p.set('overdue', 'true')
  if (filters.masterKpiSlug) p.set('masterKpi', filters.masterKpiSlug)
  if (filters.sourceType) p.set('source', filters.sourceType)
  if (filters.templateId) p.set('template', filters.templateId)
  return p.toString()
}

/** Surfaces the server's message so dialogs can show why something was rejected. */
async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`
    throw new Error(message)
  }
  return json as T
}

export async function getInitiatives(filters?: InitiativeFilters): Promise<InitiativeListResult> {
  const qs = toQuery(filters)
  const res = await sessionFetch(`/api/initiatives${qs ? `?${qs}` : ''}`)
  if (!res.ok) return { initiatives: [], members: [], unavailable: true }
  return (await res.json()) as InitiativeListResult
}

export async function getInitiative(id: string): Promise<InitiativeDetail | null> {
  const res = await sessionFetch(`/api/initiatives/${id}`)
  if (!res.ok) return null
  return (await res.json()) as InitiativeDetail
}

export async function getInitiativeStats(): Promise<InitiativeStats | null> {
  const res = await sessionFetch('/api/initiatives/stats')
  if (!res.ok) return null
  return (await res.json()) as InitiativeStats
}


// --- PRD v1.1: templates, routing preview, project KPIs ---

export interface ProjectKpiInput {
  name: string
  definition: string
  unit?: string
  direction?: 'above' | 'below' | 'range'
  baselineValue?: number
  baselineReason?: string
  targetValue: number
  measurementSource: string
  measurementFrequency?: string
}

export interface BudgetLineInput {
  category: string
  description?: string
  amount: number
}

export async function getTemplates(): Promise<InitiativeTemplate[]> {
  const res = await sessionFetch('/api/initiative-templates')
  if (!res.ok) return []
  const { templates } = (await res.json()) as { templates: InitiativeTemplate[] }
  return templates
}

/** §7.5 Approval Route Preview. Informative — the server re-routes on submit. */
export async function previewRoute(input: {
  total?: number
  lines?: BudgetLineInput[]
}): Promise<ApprovalRoute> {
  const res = await sessionFetch('/api/initiatives/route-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return (await res.json()) as ApprovalRoute
}

export async function updateProjectKpi(
  initiativeId: string,
  projectKpiId: string,
  input: { currentValue?: number; resultValue?: number; resultUnavailableReason?: string },
): Promise<ProjectKpi> {
  const res = await sessionFetch(`/api/initiatives/${initiativeId}/project-kpis`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: projectKpiId, ...input }),
  })
  const { projectKpi } = await unwrap<{ projectKpi: ProjectKpi }>(res)
  return projectKpi
}

export async function requestBudgetRevision(
  initiativeId: string,
  input: { proposedTotal: number; reason: string },
): Promise<Initiative> {
  const res = await sessionFetch(`/api/initiatives/${initiativeId}/budget-revisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}

export interface CreateInitiativeInput {
  overallObjective?: string
  descriptionMechanics?: string
  masterKpiId?: string
  projectKpis?: ProjectKpiInput[]
  budgetLines?: BudgetLineInput[]
  totalBudget?: number
  sourceType?: 'blank' | 'template' | 'ai'
  sourceTemplateId?: string
  sourceAiRecommendationId?: string
  name?: string
  description?: string
  initiativeType?: InitiativeType
  priority?: InitiativePriority
  startDate?: string
  endDate?: string
  approvedBudget?: number
  targetKpiSlugs?: string[]
  primaryKpiSlug?: string
  source?: InitiativeSource
  triggerKpiSlug?: string
  ticketId?: string
  aiSuggestion?: string
  aiWarning?: string
  submit?: boolean
}

export async function createInitiative(input: CreateInitiativeInput): Promise<Initiative> {
  const res = await sessionFetch('/api/initiatives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}

export type UpdateInitiativeInput = Partial<
  Pick<
    CreateInitiativeInput,
    | 'name'
    | 'description'
    | 'initiativeType'
    | 'priority'
    | 'startDate'
    | 'endDate'
    | 'approvedBudget'
    | 'targetKpiSlugs'
    | 'primaryKpiSlug'
  >
> & { actualSpend?: number }

export async function updateInitiative(id: string, input: UpdateInitiativeInput): Promise<Initiative> {
  const res = await sessionFetch(`/api/initiatives/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}

export async function performAction(
  id: string,
  action: InitiativeAction,
  opts: { comment?: string } = {},
): Promise<Initiative> {
  const res = await sessionFetch(`/api/initiatives/${id}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...opts }),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}

export interface ProgressUpdateInput {
  progressPercent: number
  note: string
  isBlocked?: boolean
  blockerNote?: string
}

export async function postProgressUpdate(
  id: string,
  input: ProgressUpdateInput,
): Promise<Initiative> {
  const res = await sessionFetch(`/api/initiatives/${id}/updates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}

export interface SubmitResultsInput {
  goalAchieved: GoalAchieved
  /** PRD §8.1 — the period used to evaluate impact. */
  measurementWindowStart: string
  measurementWindowEnd: string
  /** Required when the initiative has an approved budget. */
  actualSpend?: number
  businessResults: string
  lessonsLearned: string
  revenueGenerated?: number
  incrementalRevenue?: number
  incrementalProfit?: number
  /** Per-KPI result values keyed by slug. */
  kpiResults?: Record<string, number>
  evidenceRefs?: string[]
}

export async function submitResults(id: string, input: SubmitResultsInput): Promise<Initiative> {
  const res = await sessionFetch(`/api/initiatives/${id}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}

export async function reviewResults(
  id: string,
  input: { approve: boolean; reviewNotes?: string },
): Promise<Initiative> {
  const res = await sessionFetch(`/api/initiatives/${id}/results`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const { initiative } = await unwrap<{ initiative: Initiative }>(res)
  return initiative
}
