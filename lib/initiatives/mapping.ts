import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Initiative,
  InitiativeEvent,
  InitiativeKpi,
  InitiativeResults,
  InitiativeStatus,
  InitiativeType,
  InitiativeSource,
  InitiativeUpdate,
  InitiativeApproval,
  ProjectKpi,
  BudgetLine,
  BudgetRevision,
  InitiativeSourceType,
} from '@/types/initiative'
import { SLUG_TO_APP_ID } from '@/lib/kpi-map'

// Server-side bridge between the `initiatives` tables and the app's domain
// types. Postgres enums are snake_case; the app is kebab-case throughout, so
// every enum crosses this file and nowhere else.

// ---------------------------------------------------------------------------
// Supabase access
// ---------------------------------------------------------------------------

export function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getOrgId(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb
    .from('organizations')
    .select('id')
    .eq('slug', 'northstar-demo')
    .single()
  return data?.id ?? null
}

/**
 * Pick the approver and results reviewer for an owner.
 *
 * PRD §12.1 separation of duty: neither may be the owner. Preference order is
 * the owner's manager, then any other member holding a manager-or-above role.
 * Returns null rather than falling back to the owner — the database CHECK
 * constraints would reject that anyway, and a null approver surfaces honestly
 * in the UI as "no approver assigned".
 */
export async function resolveGovernors(
  sb: SupabaseClient,
  orgId: string,
  ownerId: string | null,
): Promise<{ approverId: string | null; reviewerId: string | null }> {
  const { data: members } = await sb
    .from('members')
    .select('id,role,manager_id')
    .eq('org_id', orgId)

  const all = members ?? []
  const owner = ownerId ? all.find((m) => m.id === ownerId) : null

  const eligible = all.filter(
    (m) => m.id !== ownerId && isManagerish(String(m.role)),
  )

  const managerId =
    owner?.manager_id && owner.manager_id !== ownerId ? String(owner.manager_id) : null

  const approverId = managerId ?? eligible[0]?.id ?? null

  // Prefer a different person for the review so the two gates are genuinely
  // independent; fall back to the approver when the org is too small.
  const reviewerId = eligible.find((m) => m.id !== approverId)?.id ?? approverId ?? null

  return { approverId: approverId ?? null, reviewerId }
}

const MANAGERISH = new Set(['founder', 'ceo', 'admin', 'ecomm_lead', 'category_lead', 'manager'])
const isManagerish = (dbRole: string) => MANAGERISH.has(dbRole)

// ---------------------------------------------------------------------------
// Enum conversion (snake_case in Postgres <-> kebab-case in the app)
// ---------------------------------------------------------------------------

const toKebab = (v: string) => v.replace(/_/g, '-')
const toSnake = (v: string) => v.replace(/-/g, '_')

export const statusToDb = (s: InitiativeStatus) => toSnake(s)
export const statusFromDb = (s: string) => toKebab(s) as InitiativeStatus
export const typeToDb = (t: InitiativeType) => toSnake(t)
export const typeFromDb = (t: string) => toKebab(t) as InitiativeType
export const sourceToDb = (s: InitiativeSource) => toSnake(s)
export const sourceFromDb = (s: string) => toKebab(s) as InitiativeSource

// ---------------------------------------------------------------------------
// Row -> domain
// ---------------------------------------------------------------------------

const num = (v: unknown): number | undefined =>
  v === null || v === undefined ? undefined : Number(v)
const str = (v: unknown): string | undefined => (v === null || v === undefined ? undefined : String(v))

export interface MemberLite {
  id: string
  name: string
  role?: string
}

export type NameLookup = Record<string, string>

export function toInitiativeKpi(
  row: Record<string, unknown>,
  kpiNames: Record<string, { name: string; unit: string }> = {},
): InitiativeKpi {
  const slug = String(row['kpi_slug'])
  const meta = kpiNames[slug]
  return {
    id: String(row['id']),
    kpiSlug: slug,
    appId: SLUG_TO_APP_ID[slug],
    name: meta?.name,
    unit: meta?.unit,
    isPrimary: Boolean(row['is_primary']),
    baselineValue: num(row['baseline_value']),
    targetDelta: num(row['target_delta']),
    resultValue: num(row['result_value']),
  }
}

export function toInitiativeResults(
  row: Record<string, unknown>,
  names: NameLookup = {},
): InitiativeResults {
  const submittedBy = str(row['submitted_by'])
  const reviewedBy = str(row['reviewed_by'])
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    goalAchieved: row['goal_achieved'] as InitiativeResults['goalAchieved'],
    actualSpend: Number(row['actual_spend'] ?? 0),
    businessResults: String(row['business_results'] ?? ''),
    lessonsLearned: String(row['lessons_learned'] ?? ''),
    revenueGenerated: num(row['revenue_generated']),
    incrementalRevenue: num(row['incremental_revenue']),
    incrementalProfit: num(row['incremental_profit']),
    roi: num(row['roi']),
    roas: num(row['roas']),
    submittedById: submittedBy,
    submittedByName: submittedBy ? names[submittedBy] : undefined,
    submittedAt: String(row['submitted_at']),
    reviewedById: reviewedBy,
    reviewedByName: reviewedBy ? names[reviewedBy] : undefined,
    reviewedAt: str(row['reviewed_at']),
    reviewNotes: str(row['review_notes']),
  }
}

export function toInitiativeEvent(row: Record<string, unknown>): InitiativeEvent {
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    eventType: toKebab(String(row['event_type'])) as InitiativeEvent['eventType'],
    actorId: str(row['actor_id']),
    actorName: str(row['actor_name']),
    message: str(row['message']),
    data: (row['data'] as Record<string, unknown>) ?? {},
    createdAt: String(row['created_at']),
  }
}

export function toProjectKpi(row: Record<string, unknown>): ProjectKpi {
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    name: String(row['name']),
    definition: String(row['definition'] ?? ''),
    unit: String(row['unit'] ?? 'number'),
    direction: (row['direction'] as ProjectKpi['direction']) ?? 'above',
    baselineValue: num(row['baseline_value']),
    baselineReason: str(row['baseline_reason']),
    targetValue: Number(row['target_value'] ?? 0),
    measurementSource: String(row['measurement_source'] ?? ''),
    measurementFrequency: str(row['measurement_frequency']),
    currentValue: num(row['current_value']),
    resultValue: num(row['result_value']),
    resultPeriodStart: str(row['result_period_start']),
    resultPeriodEnd: str(row['result_period_end']),
    resultUnavailableReason: str(row['result_unavailable_reason']),
    sortOrder: Number(row['sort_order'] ?? 0),
  }
}

export function toBudgetLine(row: Record<string, unknown>): BudgetLine {
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    revisionId: str(row['revision_id']),
    lineType: (row['line_type'] as BudgetLine['lineType']) ?? 'planned',
    category: String(row['category']),
    description: str(row['description']),
    amount: Number(row['amount'] ?? 0),
    currency: String(row['currency'] ?? 'PHP'),
    sortOrder: Number(row['sort_order'] ?? 0),
  }
}

export function toBudgetRevision(
  row: Record<string, unknown>,
  names: NameLookup = {},
): BudgetRevision {
  const routed = str(row['routed_approver_id'])
  const decided = str(row['decided_by'])
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    previousTotal: Number(row['previous_total'] ?? 0),
    proposedTotal: Number(row['proposed_total'] ?? 0),
    reason: String(row['reason'] ?? ''),
    policyVersion: num(row['policy_version']),
    tierId: str(row['tier_id']),
    routedApproverId: routed,
    routedApproverName: routed ? names[routed] : undefined,
    status: (row['status'] as BudgetRevision['status']) ?? 'pending',
    decidedById: decided,
    decidedByName: decided ? names[decided] : undefined,
    decidedAt: str(row['decided_at']),
    decisionComment: str(row['decision_comment']),
    createdAt: String(row['created_at']),
  }
}

export interface AssembleDeps {
  names: NameLookup
  kpiMeta: Record<string, { name: string; unit: string }>
  /** active_kpis.id -> { slug, name } so a Master KPI resolves without a join. */
  activeKpis: Record<string, { slug: string; name: string }>
  templateNames: Record<string, string>
}

export function toInitiative(
  row: Record<string, unknown>,
  deps: AssembleDeps,
  targetKpis: InitiativeKpi[] = [],
  results?: InitiativeResults,
  events?: InitiativeEvent[],
  projectKpis: ProjectKpi[] = [],
  budgetLines: BudgetLine[] = [],
): Initiative {
  const ownerId = str(row['owner_id'])
  const approverId = str(row['approver_id'])
  const reviewerId = str(row['reviewer_id'])
  return {
    id: String(row['id']),
    orgId: String(row['org_id']),
    name: String(row['name']),
    description: str(row['description']),
    initiativeType: typeFromDb(String(row['initiative_type'])),
    status: statusFromDb(String(row['status'])),
    priority: row['priority'] as Initiative['priority'],
    overallObjective: str(row['overall_objective']),
    descriptionMechanics: str(row['description_mechanics']),
    masterKpiId: str(row['master_kpi_id']),
    masterKpiSlug: row['master_kpi_id']
      ? deps.activeKpis[String(row['master_kpi_id'])]?.slug
      : undefined,
    masterKpiName: row['master_kpi_id']
      ? deps.activeKpis[String(row['master_kpi_id'])]?.name
      : undefined,
    sourceType: (str(row['source_type']) as InitiativeSourceType) ?? 'blank',
    sourceTemplateId: str(row['source_template_id']),
    sourceTemplateName: row['source_template_id']
      ? deps.templateNames[String(row['source_template_id'])]
      : undefined,
    sourceAiRecommendationId: str(row['source_ai_recommendation_id']),
    ownerId,
    ownerName: ownerId ? deps.names[ownerId] : undefined,
    approverId,
    approverName: approverId ? deps.names[approverId] : undefined,
    reviewerId,
    reviewerName: reviewerId ? deps.names[reviewerId] : undefined,
    startDate: str(row['start_date']),
    endDate: str(row['end_date']),
    totalBudget: num(row['total_budget']),
    approvedBudget: num(row['approved_budget']),
    actualSpend: num(row['actual_spend']),
    approvalPolicyVersion: num(row['approval_policy_version']),
    matchedTierId: str(row['matched_tier_id']),
    autoApproved: Boolean(row['auto_approved']),
    currency: str(row['currency']) ?? 'PHP',
    progressPercent: Number(row['progress_percent'] ?? 0),
    latestUpdateAt: str(row['latest_update_at']),
    rejectionReason: str(row['rejection_reason']),
    cancellationReason: str(row['cancellation_reason']),
    source: sourceFromDb(String(row['source'])),
    ticketId: str(row['ticket_id']),
    triggerKpiSlug: str(row['trigger_kpi_slug']),
    parentInitiativeId: str(row['parent_initiative_id']),
    aiSuggestion: str(row['ai_suggestion']),
    aiWarning: str(row['ai_warning']),
    createdAt: String(row['created_at']),
    updatedAt: String(row['updated_at']),
    submittedForApprovalAt: str(row['submitted_for_approval_at']),
    approvedAt: str(row['approved_at']),
    startedAt: str(row['started_at']),
    completedAt: str(row['completed_at']),
    closedAt: str(row['closed_at']),
    targetKpis,
    projectKpis,
    budgetLines,
    results,
    events,
  }
}

export function toInitiativeUpdate(
  row: Record<string, unknown>,
  names: NameLookup = {},
): InitiativeUpdate {
  const authorId = str(row['author_id'])
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    authorId,
    authorName: authorId ? names[authorId] : undefined,
    progressPercent: Number(row['progress_percent'] ?? 0),
    note: String(row['note'] ?? ''),
    isBlocked: Boolean(row['is_blocked']),
    blockerNote: str(row['blocker_note']),
    createdAt: String(row['created_at']),
  }
}

export function toInitiativeApproval(
  row: Record<string, unknown>,
  names: NameLookup = {},
): InitiativeApproval {
  const actorId = str(row['actor_id'])
  return {
    id: String(row['id']),
    initiativeId: String(row['initiative_id']),
    stage: row['stage'] as InitiativeApproval['stage'],
    actorId,
    actorName: actorId ? names[actorId] : undefined,
    decision: toKebab(String(row['decision'])) as InitiativeApproval['decision'],
    comment: str(row['comment']),
    createdAt: String(row['created_at']),
  }
}

/** Members + KPI definitions, fetched once and reused across a request. */
export async function loadLookups(
  sb: SupabaseClient,
  orgId: string,
): Promise<AssembleDeps & { members: MemberLite[] }> {
  const [{ data: members }, { data: defs }, { data: aks }, { data: templates }] = await Promise.all([
    sb.from('members').select('id,name,role').eq('org_id', orgId),
    sb.from('kpi_definitions').select('id,slug,name,unit'),
    sb.from('active_kpis').select('id,kpi_def_id').eq('org_id', orgId),
    sb.from('initiative_templates').select('id,name'),
  ])
  const names: NameLookup = Object.fromEntries((members ?? []).map((m) => [m.id, m.name]))
  const kpiMeta = Object.fromEntries(
    (defs ?? []).map((d) => [d.slug, { name: d.name as string, unit: d.unit as string }]),
  )
  const defById = Object.fromEntries((defs ?? []).map((d) => [d.id, d]))
  const activeKpis: Record<string, { slug: string; name: string }> = {}
  for (const a of aks ?? []) {
    const def = defById[a.kpi_def_id]
    if (def) activeKpis[String(a.id)] = { slug: String(def.slug), name: String(def.name) }
  }
  const templateNames = Object.fromEntries(
    (templates ?? []).map((t) => [String(t.id), String(t.name)]),
  )
  return {
    names,
    kpiMeta,
    activeKpis,
    templateNames,
    members: (members ?? []) as MemberLite[],
  }
}

/** Fetch initiatives with their target KPIs and results in one round of queries. */
export async function assembleInitiatives(
  sb: SupabaseClient,
  rows: Record<string, unknown>[],
  deps: AssembleDeps,
): Promise<Initiative[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => String(r['id']))

  const [{ data: kpiRows }, { data: resultRows }, { data: pkRows }, { data: blRows }] =
    await Promise.all([
      sb.from('initiative_kpis').select('*').in('initiative_id', ids),
      sb.from('initiative_results').select('*').in('initiative_id', ids),
      sb.from('initiative_project_kpis').select('*').in('initiative_id', ids),
      sb.from('initiative_budget_lines').select('*').in('initiative_id', ids),
    ])

  const kpisByInitiative: Record<string, InitiativeKpi[]> = {}
  for (const r of kpiRows ?? []) {
    ;(kpisByInitiative[String(r['initiative_id'])] ??= []).push(toInitiativeKpi(r, deps.kpiMeta))
  }
  const resultsByInitiative: Record<string, InitiativeResults> = {}
  for (const r of resultRows ?? []) {
    resultsByInitiative[String(r['initiative_id'])] = toInitiativeResults(r, deps.names)
  }

  const projectByInitiative: Record<string, ProjectKpi[]> = {}
  for (const r of pkRows ?? []) {
    ;(projectByInitiative[String(r['initiative_id'])] ??= []).push(toProjectKpi(r))
  }
  const linesByInitiative: Record<string, BudgetLine[]> = {}
  for (const r of blRows ?? []) {
    ;(linesByInitiative[String(r['initiative_id'])] ??= []).push(toBudgetLine(r))
  }

  return rows.map((row) => {
    const id = String(row['id'])
    return toInitiative(
      row,
      deps,
      kpisByInitiative[id] ?? [],
      resultsByInitiative[id],
      undefined,
      (projectByInitiative[id] ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
      linesByInitiative[id] ?? [],
    )
  })
}

/** Append to the accountability thread. Never throws — a lost event must not fail an action. */
export async function logEvent(
  sb: SupabaseClient,
  initiativeId: string,
  eventType: string,
  actor: { id?: string | null; name?: string | null },
  message?: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    await sb.from('initiative_events').insert({
      initiative_id: initiativeId,
      event_type: toSnake(eventType),
      actor_id: actor.id ?? null,
      actor_name: actor.name ?? null,
      message: message ?? null,
      data,
    })
  } catch {
    /* thread entry is best-effort */
  }
}
