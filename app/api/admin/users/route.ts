import { getClient, getOrgId } from '@/lib/initiatives/mapping'
import { requireActor, requireCapability, permissionResponse, PermissionError } from '@/lib/permissions/actor'
import { prdRoleFromDb, PRD_ROLE_LABELS, type PrdRole } from '@/lib/permissions/capabilities'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET    /api/admin/users — everyone in the org, with their access level.
// POST   /api/admin/users — invite someone (creates the auth user + emails them).
// PATCH  /api/admin/users — change a role, or activate/deactivate.
//
// Deliberately no DELETE: a member may own KPIs, initiatives and approval
// decisions (§11.6). Deactivating removes access while keeping that history
// attributable — a deleted approver would leave decisions signed by nobody.

/** The stored role each access level maps to when an admin picks one. */
const ROLE_FOR_LEVEL: Record<PrdRole, string> = {
  executive: 'founder',
  admin: 'admin',
  manager: 'manager',
  contributor: 'ecomm_officer',
  viewer: 'viewer',
}

export async function GET(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ users: [] })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ users: [] })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'admin:manage')

    const { data } = await sb
      .from('members')
      .select('id,name,email,role,is_active,auth_user_id,manager_id,invited_at,last_seen_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    // KPI ownership decides whether deactivating someone leaves work stranded.
    const { data: kpis } = await sb.from('active_kpis').select('owner_id').eq('org_id', orgId)
    const owned: Record<string, number> = {}
    for (const k of kpis ?? []) {
      const id = String(k.owner_id ?? '')
      if (id) owned[id] = (owned[id] ?? 0) + 1
    }

    return Response.json({
      users: (data ?? []).map((m) => {
        const level = prdRoleFromDb(String(m.role))
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          dbRole: m.role,
          level,
          levelLabel: PRD_ROLE_LABELS[level],
          isActive: m.is_active !== false,
          // Has this person ever actually signed in?
          hasSignedIn: Boolean(m.auth_user_id),
          managerId: m.manager_id,
          invitedAt: m.invited_at,
          lastSeenAt: m.last_seen_at,
          ownedKpiCount: owned[String(m.id)] ?? 0,
        }
      }),
      levels: Object.entries(PRD_ROLE_LABELS).map(([value, label]) => ({ value, label })),
    })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ users: [] })
  }
}

interface InviteBody {
  name: string
  email: string
  level: PrdRole
  managerId?: string | null
}

export async function POST(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: InviteBody
  try {
    body = (await req.json()) as InviteBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const name = body.name?.trim()

  if (!name) return Response.json({ error: 'A name is required' }, { status: 400 })
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'That email address is not valid' }, { status: 400 })
  }
  if (!ROLE_FOR_LEVEL[body.level]) {
    return Response.json({ error: 'Pick an access level' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'admin:manage')

    const { data: existing } = await sb
      .from('members')
      .select('id,is_active')
      .eq('org_id', orgId)
      .ilike('email', email)
      .maybeSingle()

    if (existing) {
      return Response.json(
        {
          error: existing.is_active
            ? 'Someone with that email is already in KPI OS.'
            : 'That email belongs to a deactivated member — reactivate them instead.',
        },
        { status: 409 },
      )
    }

    // Create the member row first. If the email send fails afterwards they can
    // still be re-invited; the reverse would leave an auth user with no member
    // row, which reads as "not invited" and is harder to diagnose.
    const { data: member, error } = await sb
      .from('members')
      .insert({
        org_id: orgId,
        name,
        email,
        role: ROLE_FOR_LEVEL[body.level],
        manager_id: body.managerId ?? actor.memberId,
        is_active: true,
        invited_at: new Date().toISOString(),
        invited_by: actor.memberId,
        notification_channels: {},
      })
      .select('id')
      .single()

    if (error || !member) {
      return Response.json({ error: error?.message ?? 'Could not add that person' }, { status: 500 })
    }

    // Creates the auth user AND emails the invitation. Without this the login
    // page (which refuses to create users) would reject them.
    const redirectTo = new URL('/auth/callback', new URL(req.url).origin).toString()
    const { error: inviteError } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo })

    if (inviteError) {
      return Response.json(
        {
          id: member.id,
          warning: `${name} was added, but the invitation email failed: ${inviteError.message}. They can still request a sign-in link from the login page.`,
        },
        { status: 201 },
      )
    }

    return Response.json({ id: member.id }, { status: 201 })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

interface PatchBody {
  id: string
  level?: PrdRole
  isActive?: boolean
  managerId?: string | null
}

export async function PATCH(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.id) return Response.json({ error: 'A member id is required' }, { status: 400 })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'admin:manage')

    // Locking yourself out is a one-click mistake with no in-app recovery.
    if (body.id === actor.memberId && (body.isActive === false || body.level)) {
      throw new PermissionError('You cannot change your own access level or deactivate yourself.')
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.level) {
      if (!ROLE_FOR_LEVEL[body.level]) {
        return Response.json({ error: 'Unknown access level' }, { status: 400 })
      }
      patch['role'] = ROLE_FOR_LEVEL[body.level]
    }
    if (body.isActive !== undefined) patch['is_active'] = body.isActive
    if (body.managerId !== undefined) patch['manager_id'] = body.managerId

    const { error } = await sb.from('members').update(patch).eq('id', body.id).eq('org_id', orgId)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
