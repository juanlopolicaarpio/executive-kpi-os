import {
  getClient,
  getOrgId,
  loadLookups,
  assembleInitiatives,
  resolveGovernors,
  logEvent,
  statusToDb,
  typeToDb,
  sourceToDb,
} from '@/lib/initiatives/mapping'
import { isInSection, isOverdue } from '@/lib/initiatives/lifecycle'
import { routeBudget, calculateTotal, type BudgetLineInput } from '@/lib/initiatives/routing'
import {
  requireActor,
  requireCapability,
  permissionResponse,
} from '@/lib/permissions/actor'
import type {
  Initiative,
  InitiativeSection,
  InitiativeStatus,
  InitiativeType,
  InitiativePriority,
  InitiativeSource,
} from '@/types/initiative'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET  /api/initiatives  — the list, with every filter the Initiatives page needs.
// POST /api/initiatives  — create a draft.
//
// Returns [] rather than throwing when the backend is unreachable or the
// initiatives tables have not been migrated yet, so the UI degrades to an empty
// state instead of an error screen.

export async function GET(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ initiatives: [], members: [] })

  const qs = new URL(req.url).searchParams
  const section = qs.get('section') as InitiativeSection | null
  const kpiSlug = qs.get('kpi')
  const ownerId = qs.get('owner')
  const approverId = qs.get('approver')
  const status = qs.get('status') as InitiativeStatus | null
  const initiativeType = qs.get('type') as InitiativeType | null
  const priority = qs.get('priority') as InitiativePriority | null
  const masterKpiSlug = qs.get('masterKpi')
  const sourceType = qs.get('source')
  const templateId = qs.get('template')
  const from = qs.get('from')
  const to = qs.get('to')
  const search = qs.get('search')?.trim()
  const hasBudget = qs.get('hasBudget') === 'true'
  const overdueOnly = qs.get('overdue') === 'true'

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ initiatives: [], members: [] })

    const deps = await loadLookups(sb, orgId)

    let query = sb.from('initiatives').select('*').eq('org_id', orgId)

    if (status) query = query.eq('status', statusToDb(status))
    if (initiativeType) query = query.eq('initiative_type', typeToDb(initiativeType))
    if (priority) query = query.eq('priority', priority)
    if (ownerId) query = query.eq('owner_id', ownerId)
    if (approverId) query = query.eq('approver_id', approverId)
    if (sourceType) query = query.eq('source_type', sourceType)
    if (templateId) query = query.eq('source_template_id', templateId)
    if (hasBudget) query = query.not('total_budget', 'is', null)
    if (search) query = query.ilike('name', `%${search}%`)
    // Overlap, not containment: an initiative counts if it was running at any
    // point inside the requested window.
    if (from) query = query.or(`end_date.is.null,end_date.gte.${from}`)
    if (to) query = query.or(`start_date.is.null,start_date.lte.${to}`)

    const { data: rows, error } = await query.order('updated_at', { ascending: false })
    if (error) return Response.json({ initiatives: [], members: deps.members, unavailable: true })

    let initiatives = await assembleInitiatives(sb, rows ?? [], deps)

    // Filters that need the assembled shape.
    if (masterKpiSlug) initiatives = initiatives.filter((i) => i.masterKpiSlug === masterKpiSlug)
    // `kpi` matches the Master KPI first, falling back to the legacy links so
    // pre-v1.1 initiatives still surface on their KPI page.
    if (kpiSlug)
      initiatives = initiatives.filter(
        (i) => i.masterKpiSlug === kpiSlug || i.targetKpis.some((k) => k.kpiSlug === kpiSlug),
      )
    if (section) initiatives = initiatives.filter((i) => isInSection(i, section))
    if (overdueOnly) initiatives = initiatives.filter((i) => isOverdue(i))

    return Response.json({ initiatives, members: deps.members })
  } catch {
    return Response.json({ initiatives: [], members: [] })
  }
}

interface ProjectKpiInput {
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

interface CreateBody {
  /** §7.2 — the system generates an editable title from this. */
  overallObjective?: string
  descriptionMechanics?: string
  /** Either an active_kpis UUID or a KPI slug — the server resolves both. */
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
  /**
   * Submit for approval immediately instead of leaving it in Draft. This never
   * starts execution — approval is a blocking gate (PRD §11.4).
   */
  submit?: boolean
}

export async function POST(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const submitting = body.submit === true
  const objective = body.overallObjective?.trim() ?? ''
  // The title is derived from the objective when not given explicitly (§7.2).
  const title = (body.name?.trim() || objective).slice(0, 120)

  if (!title) {
    return Response.json({ error: 'An overall objective is required' }, { status: 400 })
  }
  if (body.startDate && body.endDate && body.endDate < body.startDate) {
    return Response.json({ error: 'End date must be on or after the start date' }, { status: 400 })
  }

  // §11.4: full validation applies on SUBMIT. A draft may be incomplete —
  // that is the point of a draft, and AI-generated drafts land here too.
  if (submitting) {
    if (!body.masterKpiId) {
      return Response.json(
        { error: 'Exactly one Master KPI is required before submitting' },
        { status: 400 },
      )
    }
    if (!(body.projectKpis && body.projectKpis.length > 0)) {
      return Response.json(
        { error: 'At least one Project KPI is required before submitting' },
        { status: 400 },
      )
    }
    const bad = (body.projectKpis ?? []).find(
      (k) => !k.name?.trim() || !k.definition?.trim() || !k.measurementSource?.trim(),
    )
    if (bad) {
      return Response.json(
        { error: 'Every Project KPI needs a name, definition and measurement source' },
        { status: 400 },
      )
    }
    if (!objective) {
      return Response.json({ error: 'An overall objective is required' }, { status: 400 })
    }
    if (!body.descriptionMechanics?.trim()) {
      return Response.json({ error: 'Project description and mechanics are required' }, { status: 400 })
    }
    if (!body.startDate || !body.endDate) {
      return Response.json({ error: 'Start and end dates are required' }, { status: 400 })
    }
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'initiative:create')

    const deps = await loadLookups(sb, orgId)
    // The creator owns it. The reviewer is resolved separately and can never be
    // the owner (§12.1); the APPROVER now comes from the budget policy (§11.5).
    const ownerId = actor.memberId
    const { reviewerId } = await resolveGovernors(sb, orgId, ownerId)

    // The form works in KPI slugs; the column is an active_kpis id. Accept
    // either so callers (form, AI draft, recovery flow) need not care.
    const masterKpiId = resolveMasterKpiId(body.masterKpiId, deps)
    if (body.masterKpiId && !masterKpiId) {
      return Response.json({ error: 'That Master KPI is not active in your organization' }, { status: 400 })
    }

    const total = calculateTotal(body.budgetLines ?? [], body.totalBudget ?? body.approvedBudget)

    // Routing decides both the approver and the resulting status.
    const route = submitting
      ? await routeBudget(sb, orgId, {
          total,
          ownerId
        })
      : null

    if (route && !route.ok) {
      // §10.1: a route that cannot resolve blocks submission and says why,
      // rather than silently landing in a queue nobody owns.
      return Response.json({ error: route.error }, { status: 409 })
    }

    const now = new Date().toISOString()

    const { data: created, error } = await sb
      .from('initiatives')
      .insert({
        org_id: orgId,
        name: title,
        description: body.description ?? null,
        initiative_type: typeToDb(body.initiativeType ?? 'other'),
        // §11.5: a no-approval tier lands directly in Approved; otherwise the
        // blocking gate applies. Never straight to Active either way.
        status: submitting ? (route!.resultingStatus) : 'draft',
        priority: body.priority ?? 'medium',
        overall_objective: objective || null,
        description_mechanics: body.descriptionMechanics ?? null,
        master_kpi_id: masterKpiId,
        source_type: body.sourceType ?? 'blank',
        source_template_id: body.sourceTemplateId ?? null,
        source_ai_recommendation_id: body.sourceAiRecommendationId ?? null,
        owner_id: ownerId,
        approver_id: route?.approverId ?? null,
        reviewer_id: reviewerId,
        start_date: body.startDate ?? null,
        end_date: body.endDate ?? null,
        total_budget: total,
        // The ceiling only exists once something has actually approved it.
        approved_budget: submitting && !route!.approvalRequired ? total : null,
        approval_policy_version: route?.policyVersion ?? null,
        matched_tier_id: route?.tier?.id ?? null,
        auto_approved: Boolean(route && !route.approvalRequired),
        approved_at: submitting && !route!.approvalRequired ? now : null,
        source: sourceToDb(body.source ?? 'manual'),
        ticket_id: body.ticketId ?? null,
        trigger_kpi_slug: body.triggerKpiSlug ?? null,
        ai_suggestion: body.aiSuggestion ?? null,
        ai_warning: body.aiWarning ?? null,
        submitted_for_approval_at: submitting ? now : null,
      })
      .select('*')
      .single()

    if (error || !created) {
      return Response.json({ error: error?.message ?? 'Could not create initiative' }, { status: 500 })
    }

    // Project KPIs (§7.3).
    if (body.projectKpis && body.projectKpis.length > 0) {
      await sb.from('initiative_project_kpis').insert(
        body.projectKpis.map((k, idx) => ({
          initiative_id: created.id,
          name: k.name.trim(),
          definition: k.definition.trim(),
          unit: k.unit ?? 'number',
          direction: k.direction ?? 'above',
          baseline_value: k.baselineValue ?? null,
          baseline_reason: k.baselineReason ?? null,
          target_value: k.targetValue,
          measurement_source: k.measurementSource.trim(),
          measurement_frequency: k.measurementFrequency ?? null,
          sort_order: idx,
        })),
      )
    }

    // Budget line items (§7.5).
    if (body.budgetLines && body.budgetLines.length > 0) {
      await sb.from('initiative_budget_lines').insert(
        body.budgetLines.map((l, idx) => ({
          initiative_id: created.id,
          line_type: 'planned',
          category: l.category,
          description: l.description ?? null,
          amount: l.amount,
          currency: route?.currency ?? 'PHP',
          sort_order: idx,
        })),
      )
    }

    // Legacy link, kept so the Master KPI still appears on its KPI page and
    // the baseline is captured for later impact measurement.
    if (masterKpiId) {
      const slug = deps.activeKpis[masterKpiId]?.slug
      if (slug) {
        const baselines = await latestValues(sb, orgId, [slug])
        await sb.from('initiative_kpis').insert({
          initiative_id: created.id,
          kpi_slug: slug,
          is_primary: true,
          baseline_value: baselines[slug] ?? null,
        })
      }
    }

    const sourceLabel =
      body.sourceType === 'ai'
        ? 'Draft created by the AI Coach — not submitted.'
        : body.sourceType === 'template'
          ? 'Draft created from a template.'
          : 'Initiative created'
    await logEvent(sb, created.id, 'created', { id: ownerId, name: actor.name }, sourceLabel)

    if (submitting && route) {
      await logEvent(
        sb,
        created.id,
        'submit',
        { id: ownerId, name: actor.name },
        route.approvalRequired
          ? `Submitted. Budget ${route.currency} ${total.toLocaleString()} routed to ${route.approverName} for approval.`
          : `Submitted. Budget ${route.currency} ${total.toLocaleString()} is within the no-approval tier and was approved automatically.`,
        {
          policyVersion: route.policyVersion,
          tierId: route.tier?.id,
          total,
          autoApproved: !route.approvalRequired,
        },
      )
      if (!route.approvalRequired) {
        await sb.from('initiative_approvals').insert({
          initiative_id: created.id,
          stage: 'approval',
          actor_id: null,
          decision: 'approved',
          comment: `Auto-approved: ${route.currency} ${total.toLocaleString()} is within the no-approval tier.`,
        })
      }
    }

    const [initiative] = await assembleInitiatives(sb, [created], deps)
    return Response.json({ initiative, route }, { status: 201 })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}


/** Accept an active_kpis UUID or a KPI slug and return the UUID. */
function resolveMasterKpiId(
  value: string | undefined,
  deps: { activeKpis: Record<string, { slug: string; name: string }> },
): string | null {
  if (!value) return null
  if (deps.activeKpis[value]) return value
  const bySlug = Object.entries(deps.activeKpis).find(([, v]) => v.slug === value)
  return bySlug ? bySlug[0] : null
}

/** Latest snapshot value per KPI slug — the baseline an initiative starts from. */
async function latestValues(
  sb: NonNullable<ReturnType<typeof getClient>>,
  orgId: string,
  slugs: string[],
): Promise<Record<string, number>> {
  const { data } = await sb
    .from('kpi_snapshots')
    .select('kpi_slug,value,computed_at')
    .eq('org_id', orgId)
    .in('kpi_slug', slugs)
    .order('computed_at', { ascending: false })

  const out: Record<string, number> = {}
  for (const row of data ?? []) {
    const slug = String(row.kpi_slug)
    if (!(slug in out)) out[slug] = Number(row.value)
  }
  return out
}

export type { Initiative }
