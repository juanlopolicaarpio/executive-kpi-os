import { getClient, getOrgId, loadLookups, assembleInitiatives, toProjectKpi } from '@/lib/initiatives/mapping'
import { requireActor, requireCapability, permissionResponse, PermissionError } from '@/lib/permissions/actor'
import { isManagerRole } from '@/lib/initiatives/lifecycle'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PATCH /api/initiatives/[id]/project-kpis — update a Project KPI's current or
// final value (PRD §7.3, §7.7).
//
// §8.4: every Project KPI must carry a final result OR a documented reason it
// is unavailable before the initiative can close. That rule is enforced in the
// results route; here we make sure a blank result can never be recorded as if
// it were a measurement.

interface Body {
  id: string
  currentValue?: number
  resultValue?: number
  resultPeriodStart?: string
  resultPeriodEnd?: string
  resultUnavailableReason?: string
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.id) return Response.json({ error: 'Project KPI id is required' }, { status: 400 })

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

    const isOwner = current.ownerId === actor.memberId
    if (!isOwner && !isManagerRole(actor.role)) {
      throw new PermissionError('Only the owner or a manager may update this initiative.')
    }
    if (current.status === 'closed' || current.status === 'cancelled') {
      return Response.json({ error: `A ${current.status} initiative cannot be edited` }, { status: 409 })
    }

    const patch: Record<string, unknown> = {}
    if (body.currentValue !== undefined) patch['current_value'] = body.currentValue
    if (body.resultValue !== undefined) patch['result_value'] = body.resultValue
    if (body.resultPeriodStart !== undefined) patch['result_period_start'] = body.resultPeriodStart
    if (body.resultPeriodEnd !== undefined) patch['result_period_end'] = body.resultPeriodEnd
    if (body.resultUnavailableReason !== undefined)
      patch['result_unavailable_reason'] = body.resultUnavailableReason
    patch['updated_at'] = new Date().toISOString()

    const { data: updated, error } = await sb
      .from('initiative_project_kpis')
      .update(patch)
      .eq('id', body.id)
      .eq('initiative_id', id)
      .select('*')
      .single()

    if (error || !updated) {
      return Response.json({ error: error?.message ?? 'Project KPI not found' }, { status: 404 })
    }

    return Response.json({ projectKpi: toProjectKpi(updated) })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
