import { getClient, getOrgId, loadLookups, assembleInitiatives, logEvent } from '@/lib/initiatives/mapping'
import { routeBudget } from '@/lib/initiatives/routing'
import { requireActor, requireCapability, permissionResponse, PermissionError } from '@/lib/permissions/actor'
import { isManagerRole } from '@/lib/initiatives/lifecycle'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST  /api/initiatives/[id]/budget-revisions — request an increase (§7.5).
// PATCH /api/initiatives/[id]/budget-revisions — the approver's decision.
//
// The critical rule: an Active initiative stays Active while a revision is
// pending, and the PRIOR approved ceiling remains enforceable until the
// revision is approved. Raising the ceiling optimistically would let spend run
// ahead of the authority for it.

interface CreateBody {
  proposedTotal: number
  reason: string
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!(Number(body.proposedTotal) >= 0)) {
    return Response.json({ error: 'Proposed budget must be zero or greater' }, { status: 400 })
  }
  if (!body.reason?.trim()) {
    return Response.json({ error: 'A reason is required for a budget revision' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'initiative:update')

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

    if (current.ownerId !== actor.memberId && !isManagerRole(actor.role)) {
      throw new PermissionError('Only the owner or a manager may request a budget revision.')
    }
    if (current.status !== 'active') {
      return Response.json(
        {
          error: `Budget revisions apply to active initiatives. This one is ${current.status} — edit the budget directly instead.`,
        },
        { status: 409 },
      )
    }

    const { data: pending } = await sb
      .from('initiative_budget_revisions')
      .select('id')
      .eq('initiative_id', id)
      .eq('status', 'pending')
      .maybeSingle()
    if (pending) {
      return Response.json(
        { error: 'A budget revision is already pending on this initiative.' },
        { status: 409 },
      )
    }

    const previous = current.approvedBudget ?? current.totalBudget ?? 0
    const proposed = Number(body.proposedTotal)

    // Route the NEW total through the same tiers — a raise may cross into a
    // higher approval band, which is the whole point of re-routing.
    const route = await routeBudget(sb, orgId, {
      total: proposed,
      ownerId: current.ownerId ?? actor.memberId
    })
    if (!route.ok) return Response.json({ error: route.error }, { status: 409 })

    const { data: created, error } = await sb
      .from('initiative_budget_revisions')
      .insert({
        initiative_id: id,
        previous_total: previous,
        proposed_total: proposed,
        reason: body.reason.trim(),
        policy_version: route.policyVersion,
        tier_id: route.tier?.id ?? null,
        routed_approver_id: route.approverId,
        // A revision into a no-approval tier is approved on the spot.
        status: route.approvalRequired ? 'pending' : 'approved',
        decided_at: route.approvalRequired ? null : new Date().toISOString(),
        created_by: actor.memberId,
      })
      .select('id')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    if (!route.approvalRequired) {
      await sb
        .from('initiatives')
        .update({ approved_budget: proposed, total_budget: proposed })
        .eq('id', id)
    }

    await logEvent(
      sb,
      id,
      'budget-revision-submitted',
      { id: actor.memberId, name: actor.name },
      route.approvalRequired
        ? `Budget revision ${previous.toLocaleString()} → ${proposed.toLocaleString()} routed to ${route.approverName}. The prior ceiling stays in force until approved.`
        : `Budget revised ${previous.toLocaleString()} → ${proposed.toLocaleString()} (within the no-approval tier).`,
      { revisionId: created?.id, previous, proposed },
    )

    const { data: after } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, after ? [after] : [], deps)
    return Response.json({ initiative, route }, { status: 201 })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

interface DecideBody {
  revisionId: string
  approve: boolean
  comment?: string
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: DecideBody
  try {
    body = (await req.json()) as DecideBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.revisionId) return Response.json({ error: 'revisionId is required' }, { status: 400 })
  if (!body.approve && !body.comment?.trim()) {
    return Response.json({ error: 'A comment is required to reject a revision' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'initiative:approve')

    const deps = await loadLookups(sb, orgId)
    const { data: rev } = await sb
      .from('initiative_budget_revisions')
      .select('*')
      .eq('id', body.revisionId)
      .eq('initiative_id', id)
      .maybeSingle()
    if (!rev) return Response.json({ error: 'Revision not found' }, { status: 404 })
    if (rev.status !== 'pending') {
      return Response.json({ error: `This revision is already ${rev.status}` }, { status: 409 })
    }

    const { data: row } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [current] = await assembleInitiatives(sb, row ? [row] : [], deps)
    if (!current) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    // §12.1 separation of duty applies to revisions exactly as to approvals.
    if (current.ownerId === actor.memberId) {
      throw new PermissionError('The owner of an initiative cannot approve its budget revision.')
    }

    const now = new Date().toISOString()
    await sb
      .from('initiative_budget_revisions')
      .update({
        status: body.approve ? 'approved' : 'rejected',
        decided_by: actor.memberId,
        decided_at: now,
        decision_comment: body.comment?.trim() ?? null,
      })
      .eq('id', body.revisionId)

    if (body.approve) {
      await sb
        .from('initiatives')
        .update({ approved_budget: rev.proposed_total, total_budget: rev.proposed_total })
        .eq('id', id)
    }

    await logEvent(
      sb,
      id,
      body.approve ? 'budget-revision-approved' : 'budget-revision-rejected',
      { id: actor.memberId, name: actor.name },
      body.approve
        ? `Budget revision approved. New ceiling ${Number(rev.proposed_total).toLocaleString()}.`
        : `Budget revision rejected: ${body.comment?.trim()}`,
    )

    const { data: after } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, after ? [after] : [], deps)
    return Response.json({ initiative })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
