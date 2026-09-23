import { getClient, getOrgId } from '@/lib/initiatives/mapping'
import { requireActor, permissionResponse } from '@/lib/permissions/actor'
import { routeBudget, calculateTotal, describeRoute, type BudgetLineInput } from '@/lib/initiatives/routing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/initiatives/route-preview — PRD §7.5 Approval Route Preview.
//
// Shown before submission so the user knows who will decide and whether it
// auto-approves. This is INFORMATIVE only: the same routeBudget() runs again on
// submit, so a stale or tampered preview cannot pick its own approver.

interface Body {
  total?: number
  lines?: BudgetLineInput[]
  /** Owner override for editing someone else's draft; defaults to the actor. */
  ownerId?: string
}

export async function POST(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ ok: false, error: 'Backend unavailable' }, { status: 503 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ ok: false, error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    const total = calculateTotal(body.lines ?? [], body.total)

    const route = await routeBudget(sb, orgId, {
      total,
      ownerId: body.ownerId ?? actor.memberId
    })

    return Response.json({
      ...route,
      tierLabel: route.tier
        ? `${route.currency} ${Number(route.tier.lowerBound).toLocaleString()} – ${
            route.tier.upperBound == null
              ? 'above'
              : Number(route.tier.upperBound).toLocaleString()
          }`
        : undefined,
      description: describeRoute(route),
    })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 })
  }
}
