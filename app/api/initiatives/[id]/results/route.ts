import {
  getClient,
  getOrgId,
  loadLookups,
  assembleInitiatives,
  logEvent,
} from '@/lib/initiatives/mapping'
import { canPerform, viewerMayPerform, TYPE_LABELS, roasApplies } from '@/lib/initiatives/lifecycle'
import {
  requireActor,
  requireCapability,
  permissionResponse,
  PermissionError,
} from '@/lib/permissions/actor'
import type { GoalAchieved } from '@/types/initiative'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST  /api/initiatives/[id]/results — the owner's mandatory results submission.
// PATCH /api/initiatives/[id]/results — the reviewer's closure decision.
//
// PRD §8.4: no initiative reaches Closed without reviewer approval. Enforced
// here, and again by the Postgres trigger in 007/008.

interface SubmitBody {
  goalAchieved: GoalAchieved
  measurementWindowStart: string
  measurementWindowEnd: string
  actualSpend?: number
  businessResults: string
  lessonsLearned: string
  revenueGenerated?: number
  incrementalRevenue?: number
  incrementalProfit?: number
  /** Per-KPI result values keyed by slug (PRD §8.1 KPI outcomes). */
  kpiResults?: Record<string, number>
  evidenceRefs?: string[]
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: SubmitBody
  try {
    body = (await req.json()) as SubmitBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!['yes', 'partial', 'no'].includes(body.goalAchieved)) {
    return Response.json({ error: 'Goal achieved must be yes, partial, or no' }, { status: 400 })
  }
  if (!body.measurementWindowStart || !body.measurementWindowEnd) {
    return Response.json({ error: 'A result measurement window is required' }, { status: 400 })
  }
  if (body.measurementWindowEnd < body.measurementWindowStart) {
    return Response.json({ error: 'Measurement window end cannot precede its start' }, { status: 400 })
  }
  // PRD §8.1: 50–2,000 characters.
  const impact = body.businessResults?.trim() ?? ''
  if (impact.length < 50 || impact.length > 2000) {
    return Response.json(
      { error: 'Business impact summary must be between 50 and 2,000 characters' },
      { status: 400 },
    )
  }
  if (!body.lessonsLearned?.trim()) {
    return Response.json(
      { error: 'Lessons learned are required — this is what the AI learns from' },
      { status: 400 },
    )
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'initiative:submit-results')

    const deps = await loadLookups(sb, orgId)
    const { data: row } = await sb
      .from('initiatives')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!row) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    const [current] = await assembleInitiatives(sb, [row], deps)
    if (!current) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    if (!canPerform(current, 'submit-results')) {
      return Response.json(
        { error: `Results can only be submitted once execution is complete (this one is ${current.status}).` },
        { status: 409 },
      )
    }
    if (!viewerMayPerform(current, 'submit-results', { memberId: actor.memberId, role: actor.role })) {
      throw new PermissionError('Only the initiative owner may submit its results.')
    }

    // PRD §8.1: actual spend is required when an approved budget exists.
    if (current.approvedBudget != null && !(Number(body.actualSpend) >= 0)) {
      return Response.json(
        { error: 'Actual spend is required because this initiative has an approved budget' },
        { status: 400 },
      )
    }
    const spend = Number(body.actualSpend ?? 0)

    const { error: resErr } = await sb.from('initiative_results').upsert(
      {
        initiative_id: id,
        goal_achieved: body.goalAchieved,
        actual_spend: spend,
        business_results: impact,
        lessons_learned: body.lessonsLearned.trim(),
        revenue_generated: body.revenueGenerated ?? null,
        incremental_revenue: body.incrementalRevenue ?? null,
        incremental_profit: body.incrementalProfit ?? null,
        submitted_by: actor.memberId,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'initiative_id' },
    )
    if (resErr) return Response.json({ error: resErr.message }, { status: 500 })

    // Per-KPI outcomes, if the owner corrected the auto-captured values.
    for (const [slug, value] of Object.entries(body.kpiResults ?? {})) {
      await sb
        .from('initiative_kpis')
        .update({ result_value: value })
        .eq('initiative_id', id)
        .eq('kpi_slug', slug)
    }

    await sb
      .from('initiatives')
      .update({ status: 'results_submitted', actual_spend: spend })
      .eq('id', id)

    await logEvent(
      sb,
      id,
      'results-submitted',
      { id: actor.memberId, name: actor.name },
      `Results submitted — goal achieved: ${body.goalAchieved}. Measurement window ${body.measurementWindowStart} to ${body.measurementWindowEnd}.`,
      {
        goalAchieved: body.goalAchieved,
        actualSpend: spend,
        measurementWindow: [body.measurementWindowStart, body.measurementWindowEnd],
        evidenceRefs: body.evidenceRefs ?? [],
      },
    )

    const { data: updated } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, updated ? [updated] : [], deps)
    return Response.json({ initiative })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

interface ReviewBody {
  approve: boolean
  reviewNotes?: string
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: ReviewBody
  try {
    body = (await req.json()) as ReviewBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const notes = body.reviewNotes?.trim()
  if (body.approve === false && !notes) {
    return Response.json({ error: 'Say what needs revising when sending results back' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'initiative:review-results')

    const deps = await loadLookups(sb, orgId)
    const { data: row } = await sb
      .from('initiatives')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!row) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    const [current] = await assembleInitiatives(sb, [row], deps)
    if (!current) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    const action = body.approve ? 'approve-closure' : 'request-results-revision'
    if (!canPerform(current, action)) {
      return Response.json(
        { error: `Nothing to review — this initiative is ${current.status}. Begin review first.` },
        { status: 409 },
      )
    }
    if (!viewerMayPerform(current, action, { memberId: actor.memberId, role: actor.role })) {
      throw new PermissionError('The owner of an initiative cannot review its results.')
    }

    const now = new Date().toISOString()

    await sb.from('initiative_approvals').insert({
      initiative_id: id,
      stage: 'review',
      actor_id: actor.memberId,
      decision: body.approve ? 'approved' : 'revision_requested',
      comment: notes ?? null,
    })

    if (!body.approve) {
      await sb.from('initiatives').update({ status: 'completed' }).eq('id', id)
      await sb
        .from('initiative_results')
        .update({ review_notes: notes, reviewed_by: actor.memberId, reviewed_at: null })
        .eq('initiative_id', id)
      await logEvent(
        sb,
        id,
        'request-results-revision',
        { id: actor.memberId, name: actor.name },
        `Results sent back: ${notes}`,
      )

      const { data: reopened } = await sb.from('initiatives').select('*').eq('id', id).single()
      const [initiative] = await assembleInitiatives(sb, reopened ? [reopened] : [], deps)
      return Response.json({ initiative })
    }

    // Mark reviewed, THEN close — the database trigger rejects the reverse order.
    const { error: revErr } = await sb
      .from('initiative_results')
      .update({ reviewed_by: actor.memberId, reviewed_at: now, review_notes: notes ?? null })
      .eq('initiative_id', id)
    if (revErr) return Response.json({ error: revErr.message }, { status: 500 })

    const { error: closeErr } = await sb
      .from('initiatives')
      .update({ status: 'closed', closed_at: now })
      .eq('id', id)
    if (closeErr) return Response.json({ error: closeErr.message }, { status: 500 })

    await logEvent(
      sb,
      id,
      'closed',
      { id: actor.memberId, name: actor.name },
      'Closure approved. Initiative closed and written to institutional memory.',
    )

    const { data: closed } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, closed ? [closed] : [], deps)
    if (initiative) await writeToMemory(sb, orgId, initiative, deps.kpiMeta)

    return Response.json({ initiative })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

/**
 * PRD §8.4 / §12.2: closure creates the AI Learning Record.
 *
 * Written to company_memory rather than playbook_entries, which is hard-wired
 * to KPI-miss tickets and cannot represent a campaign or a hire. `embedding` is
 * left null; the AI reads these rows directly until an embeddings provider is
 * configured.
 */
async function writeToMemory(
  sb: NonNullable<ReturnType<typeof getClient>>,
  orgId: string,
  initiative: Awaited<ReturnType<typeof assembleInitiatives>>[number],
  kpiMeta: Record<string, { name: string; unit: string }>,
): Promise<void> {
  const r = initiative.results
  if (!r) return

  const kpiNames = initiative.targetKpis.map((k) => kpiMeta[k.kpiSlug]?.name ?? k.kpiSlug)
  const money = (v?: number) => (v == null ? '—' : `₱${Math.round(v).toLocaleString()}`)
  const showRoas = roasApplies(initiative.initiativeType) && r.roas != null

  const content = [
    `INITIATIVE: ${initiative.name}`,
    `Type: ${TYPE_LABELS[initiative.initiativeType]} | Owner: ${initiative.ownerName ?? '—'}`,
    `Timeline: ${initiative.startDate ?? '—'} to ${initiative.endDate ?? '—'}`,
    `Target KPIs: ${kpiNames.join(', ') || '—'}`,
    `Budget approved: ${money(initiative.approvedBudget)} | Actual spend: ${money(r.actualSpend)}`,
    `Goal achieved: ${r.goalAchieved.toUpperCase()}`,
    `Revenue generated: ${money(r.revenueGenerated)} | Incremental revenue: ${money(r.incrementalRevenue)} | Incremental profit: ${money(r.incrementalProfit)}`,
    r.roi != null ? `ROI: ${r.roi.toFixed(1)}%` : 'ROI: —',
    showRoas ? `ROAS: ${r.roas!.toFixed(2)}x` : 'ROAS: not applicable to this initiative type',
    ``,
    `KPI OUTCOMES:`,
    ...initiative.targetKpis.map(
      (k) =>
        `  ${kpiMeta[k.kpiSlug]?.name ?? k.kpiSlug}: baseline ${k.baselineValue ?? '—'} → result ${k.resultValue ?? '—'}`,
    ),
    ``,
    `RESULTS: ${r.businessResults}`,
    ``,
    `LESSONS LEARNED: ${r.lessonsLearned}`,
  ].join('\n')

  try {
    await sb.from('company_memory').insert({
      org_id: orgId,
      source: 'initiative',
      data_type: 'closed_initiative',
      content,
      metadata: {
        initiative_id: initiative.id,
        name: initiative.name,
        initiative_type: initiative.initiativeType,
        owner: initiative.ownerName,
        approver: initiative.approverName,
        reviewer: initiative.reviewerName,
        target_kpis: initiative.targetKpis.map((k) => k.kpiSlug),
        kpi_outcomes: initiative.targetKpis.map((k) => ({
          slug: k.kpiSlug,
          baseline: k.baselineValue,
          result: k.resultValue,
        })),
        approved_budget: initiative.approvedBudget,
        actual_spend: r.actualSpend,
        revenue_generated: r.revenueGenerated,
        incremental_revenue: r.incrementalRevenue,
        incremental_profit: r.incrementalProfit,
        roi: r.roi,
        roas: showRoas ? r.roas : null,
        goal_achieved: r.goalAchieved,
        lessons_learned: r.lessonsLearned,
      },
      period_start: initiative.startDate ?? null,
      period_end: initiative.endDate ?? null,
    })
  } catch {
    /* memory write is best-effort; the initiative is already closed */
  }
}
