import {
  getClient,
  getOrgId,
  loadLookups,
  assembleInitiatives,
  logEvent,
  statusToDb,
} from '@/lib/initiatives/mapping'
import { routeBudget } from '@/lib/initiatives/routing'
import {
  TRANSITIONS,
  canPerform,
  viewerMayPerform,
  type InitiativeAction,
} from '@/lib/initiatives/lifecycle'
import {
  requireActor,
  requireCapability,
  permissionResponse,
  PermissionError,
} from '@/lib/permissions/actor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/initiatives/[id]/actions — every lifecycle transition except the
// results submission and the closure decision, which carry payloads and live in
// ./results.
//
// Authorization is entirely server-side (PRD §12.1): the acting member is
// resolved from headers and their capabilities come from the database, so a
// forged role in the body buys nothing. Separation of duty is checked against
// stored owner/approver/reviewer ids.

interface ActionBody {
  action: InitiativeAction
  comment?: string
}

/** Transitions handled here. The results routes own the rest. */
const HANDLED: InitiativeAction[] = [
  'submit',
  'approve',
  'request-revision',
  'reject',
  'withdraw',
  'start',
  'complete',
  'reopen',
  'cancel',
  'begin-review',
]

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: ActionBody
  try {
    body = (await req.json()) as ActionBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const action = body.action
  if (!action || !(action in TRANSITIONS)) {
    return Response.json({ error: 'Unknown action' }, { status: 400 })
  }
  if (!HANDLED.includes(action)) {
    return Response.json(
      { error: `Use /api/initiatives/${id}/results for ${action}` },
      { status: 400 },
    )
  }

  const rule = TRANSITIONS[action]
  const comment = body.comment?.trim()
  if (rule.requiresComment && !comment) {
    return Response.json({ error: `A comment is required to ${action.replace(/-/g, ' ')}.` }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, rule.capability)

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

    if (!canPerform(current, action)) {
      return Response.json(
        { error: `Cannot ${action.replace(/-/g, ' ')} an initiative that is ${current.status}.` },
        { status: 409 },
      )
    }

    // Separation of duty + designated-actor check, against stored ids.
    if (!viewerMayPerform(current, action, { memberId: actor.memberId, role: actor.role })) {
      throw new PermissionError(
        rule.actor === 'approver' || rule.actor === 'reviewer'
          ? 'The owner of an initiative cannot approve or review it.'
          : 'You are not the designated actor for this step.',
      )
    }

    const now = new Date().toISOString()
    let nextStatus = rule.to
    const patch: Record<string, unknown> = {}

    // §11.5: submission is the moment routing decides. Recomputed here rather
    // than trusted from the client's preview, so a stale or tampered preview
    // cannot choose its own approver.
    let route: Awaited<ReturnType<typeof routeBudget>> | null = null
    if (action === 'submit') {
      if (!current.masterKpiId) {
        return Response.json(
          { error: 'Exactly one Master KPI is required before submitting' },
          { status: 400 },
        )
      }
      if (current.projectKpis.length === 0) {
        return Response.json(
          { error: 'At least one Project KPI is required before submitting' },
          { status: 400 },
        )
      }
      route = await routeBudget(sb, orgId, {
        total: current.totalBudget ?? 0,
        ownerId: current.ownerId ?? actor.memberId
      })
      if (!route.ok) return Response.json({ error: route.error }, { status: 409 })
      nextStatus = route.resultingStatus === 'approved' ? 'approved' : 'pending-approval'
    }

    if (nextStatus) patch['status'] = statusToDb(nextStatus)

    switch (action) {
      case 'submit':
        patch['submitted_for_approval_at'] = now
        patch['approver_id'] = route!.approverId
        patch['approval_policy_version'] = route!.policyVersion
        patch['matched_tier_id'] = route!.tier?.id ?? null
        patch['auto_approved'] = !route!.approvalRequired
        if (!route!.approvalRequired) {
          patch['approved_at'] = now
          patch['approved_budget'] = route!.totalBudget
        }
        break
      case 'approve':
        patch['approved_at'] = now
        // Approval sets the spending ceiling (§7.5).
        patch['approved_budget'] = current.totalBudget ?? null
        break
      case 'reject':
        patch['rejection_reason'] = comment
        break
      case 'start':
        patch['started_at'] = now
        break
      case 'complete':
        patch['completed_at'] = now
        break
      case 'reopen':
        patch['completed_at'] = null
        break
      case 'cancel':
        patch['cancellation_reason'] = comment
        break
    }

    const { error } = await sb.from('initiatives').update(patch).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Capture where each target KPI landed when execution finishes.
    if (action === 'complete' && current.targetKpis.length > 0) {
      await captureResultValues(sb, orgId, id, current.targetKpis.map((k) => k.kpiSlug))
    }

    if (action === 'submit' && route && !route.approvalRequired) {
      await sb.from('initiative_approvals').insert({
        initiative_id: id,
        stage: 'approval',
        actor_id: null,
        decision: 'approved',
        comment: `Auto-approved: ${route.currency} ${route.totalBudget.toLocaleString()} is within the no-approval tier.`,
      })
    }

    // Approval-gate decisions go in the decision audit trail (PRD §12.4).
    if (action === 'approve' || action === 'reject' || action === 'request-revision') {
      await sb.from('initiative_approvals').insert({
        initiative_id: id,
        stage: 'approval',
        actor_id: actor.memberId,
        decision:
          action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revision_requested',
        comment: comment ?? null,
      })
    }

    await logEvent(sb, id, action, { id: actor.memberId, name: actor.name }, messageFor(action, comment))

    const { data: updated } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, updated ? [updated] : [], deps)
    return Response.json({ initiative })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

function messageFor(action: InitiativeAction, comment?: string): string {
  switch (action) {
    case 'submit':
      return 'Submitted. Budget routed through the approval policy.'
    case 'approve':
      return comment || 'Approved. The owner may now start execution.'
    case 'request-revision':
      return `Revision requested: ${comment}`
    case 'reject':
      return `Rejected: ${comment}`
    case 'withdraw':
      return 'Withdrawn by the owner and returned to draft.'
    case 'start':
      return 'Execution started.'
    case 'complete':
      return 'Execution finished. Results submission required before this can close.'
    case 'begin-review':
      return 'Review started.'
    case 'reopen':
      return 'Reopened — execution was not actually complete.'
    case 'cancel':
      return `Cancelled: ${comment}`
    default:
      return action
  }
}

/** Write the latest KPI value into initiative_kpis.result_value. */
async function captureResultValues(
  sb: NonNullable<ReturnType<typeof getClient>>,
  orgId: string,
  initiativeId: string,
  slugs: string[],
): Promise<void> {
  const { data } = await sb
    .from('kpi_snapshots')
    .select('kpi_slug,value,computed_at')
    .eq('org_id', orgId)
    .in('kpi_slug', slugs)
    .order('computed_at', { ascending: false })

  const latest: Record<string, number> = {}
  for (const row of data ?? []) {
    const slug = String(row.kpi_slug)
    if (!(slug in latest)) latest[slug] = Number(row.value)
  }

  await Promise.all(
    Object.entries(latest).map(([slug, value]) =>
      sb
        .from('initiative_kpis')
        .update({ result_value: value })
        .eq('initiative_id', initiativeId)
        .eq('kpi_slug', slug),
    ),
  )
}
