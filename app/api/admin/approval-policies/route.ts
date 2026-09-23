import { getClient, getOrgId, loadLookups } from '@/lib/initiatives/mapping'
import { requireActor, requireCapability, permissionResponse } from '@/lib/permissions/actor'
import { validateTiers, type ApprovalTier } from '@/lib/initiatives/routing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET  /api/admin/approval-policies — the active policy and its tiers.
// PUT  /api/admin/approval-policies — replace the tier set.
//
// PRD §7.5: tiers must cover the permitted range without overlaps or gaps, and
// activation is BLOCKED until validation passes. A policy with a hole in it
// would silently make some budgets unroutable at submission time — far worse
// than refusing to save it.

interface TierInput {
  lowerBound: number
  upperBound: number | null
  approvalRequired: boolean
  approverRole?: 'manager' | 'executive' | 'admin' | null
  approverUserId?: string | null
  delegateUserId?: string | null
}

export async function GET(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ policy: null, tiers: [], members: [] })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ policy: null, tiers: [], members: [] })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'admin:manage')

    const deps = await loadLookups(sb, orgId)
    const { data: policy } = await sb
      .from('approval_policies')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .maybeSingle()

    if (!policy) return Response.json({ policy: null, tiers: [], members: deps.members })

    const { data: tiers } = await sb
      .from('approval_tiers')
      .select('*')
      .eq('policy_id', policy.id)
      .order('sort_order', { ascending: true })

    return Response.json({
      policy: { id: policy.id, version: policy.version, currency: policy.currency },
      tiers: (tiers ?? []).map((t) => ({
        id: t.id,
        sortOrder: t.sort_order,
        lowerBound: Number(t.lower_bound),
        upperBound: t.upper_bound == null ? null : Number(t.upper_bound),
        approvalRequired: t.approval_required,
        approverRole: t.approver_role,
        approverUserId: t.approver_user_id,
        delegateUserId: t.delegate_user_id,
      })),
      members: deps.members,
    })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ policy: null, tiers: [], members: [] })
  }
}

export async function PUT(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: { tiers: TierInput[]; currency?: string }
  try {
    body = (await req.json()) as { tiers: TierInput[]; currency?: string }
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'admin:manage')

    const asTiers: ApprovalTier[] = (body.tiers ?? []).map((t, i) => ({
      id: `new-${i}`,
      sortOrder: i + 1,
      lowerBound: Number(t.lowerBound),
      upperBound: t.upperBound == null ? null : Number(t.upperBound),
      approvalRequired: Boolean(t.approvalRequired),
      approverRole: t.approverRole ?? null,
      approverUserId: t.approverUserId ?? null,
      delegateUserId: t.delegateUserId ?? null,
    }))

    const invalid = validateTiers(asTiers)
    if (invalid) return Response.json({ error: invalid }, { status: 400 })

    // Version the policy rather than mutating it: existing initiatives hold a
    // snapshot of the version that routed them, and that reference must stay
    // meaningful (§11.6 — policies are versioned, never hard-deleted).
    const { data: existing } = await sb
      .from('approval_policies')
      .select('id,version')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .maybeSingle()

    const nextVersion = (Number(existing?.version) || 0) + 1

    if (existing) {
      await sb.from('approval_policies').update({ is_active: false }).eq('id', existing.id)
    }

    const { data: policy, error } = await sb
      .from('approval_policies')
      .insert({
        org_id: orgId,
        version: nextVersion,
        currency: body.currency ?? 'PHP',
        is_active: true,
      })
      .select('id,version')
      .single()

    if (error || !policy) {
      return Response.json({ error: error?.message ?? 'Could not save policy' }, { status: 500 })
    }

    await sb.from('approval_tiers').insert(
      asTiers.map((t, i) => ({
        policy_id: policy.id,
        sort_order: i + 1,
        lower_bound: t.lowerBound,
        upper_bound: t.upperBound,
        approval_required: t.approvalRequired,
        approver_role: t.approverRole,
        approver_user_id: t.approverUserId,
        delegate_user_id: t.delegateUserId,
      })),
    )

    return Response.json({ ok: true, version: policy.version })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 })
  }
}
