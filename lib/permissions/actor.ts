import type { SupabaseClient } from '@supabase/supabase-js'
import {
  prdRoleFromDb,
  prdRoleFromApp,
  dbRoleForAppRole,
  can,
  type PrdRole,
  type Capability,
} from './capabilities'
import type { UserRole } from '@/types/user'
import { MEMBER_HEADER, PERSONA_HEADER } from './headers'
import { createServerClient } from '@/lib/supabase/server'

// Who is acting, resolved SERVER-SIDE.
//
// Two paths, in strict order of trust:
//
//   1. A signed-in Supabase session. The auth user's id is matched against
//      `members.auth_user_id`. Nothing about this is client-supplied.
//   2. A people-switcher header. KPI OS is intentionally no-login for this
//      deployment, so the switcher is the way to view the app as each real
//      database member while still deriving permissions from Supabase rows.
//
// The property that matters either way (PRD §12.1: "the backend is
// authoritative"): capabilities always come from the member row in the
// database, never from the request. A body claiming `"role":"ceo"` gains
// nothing, and separation-of-duty compares database ids that no client can
// forge.

// Re-exported for server callers; defined in headers.ts so client code can
// import them without pulling in next/headers.
export { MEMBER_HEADER, PERSONA_HEADER } from './headers'

export interface Actor {
  memberId: string
  name: string
  dbRole: string
  role: PrdRole
  orgId: string
  /**
   * How this actor was identified. Not a permission — purely so the UI can say
   * when a real session overrides the people switcher.
   */
  via: 'session' | 'persona'
}

interface MemberRow {
  id: string
  name: string
  role: string
}

function toMemberRow(data: unknown): MemberRow | null {
  if (!data || typeof data !== 'object') return null
  const r = data as Record<string, unknown>
  if (!r['id']) return null
  return {
    id: String(r['id']),
    name: String(r['name'] ?? ''),
    role: String(r['role'] ?? ''),
  }
}

export class PermissionError extends Error {
  readonly status: number
  constructor(message: string, status = 403) {
    super(message)
    this.name = 'PermissionError'
    this.status = status
  }
}

/**
 * True when the people switcher is allowed. Default-on because this deployment
 * opens directly to KPI OS; set DEMO_PERSONAS=false to hide it.
 */
export function demoPersonasEnabled(): boolean {
  return process.env.DEMO_PERSONAS !== 'false'
}

/**
 * Resolve the acting member.
 *
 * Tries the real session first. Falls back to the people-switcher header when
 * enabled. Either path resolves to a real members row; the request never gets
 * to claim its own role.
 */
export async function resolveActor(
  sb: SupabaseClient,
  orgId: string,
  req: Request,
): Promise<Actor | null> {
  let row: MemberRow | null = null

  // ---- 1. Real session ----
  try {
    const auth = await createServerClient()
    const {
      data: { user },
    } = await auth.auth.getUser()

    if (user) {
      const { data } = await sb
        .from('members')
        .select('id,name,role,is_active')
        .eq('org_id', orgId)
        .eq('auth_user_id', user.id)
        .maybeSingle()

      // A deactivated member keeps their auth account but loses access —
      // offboarding must not require deleting rows they own.
      if (data && data.is_active !== false) row = toMemberRow(data)
      if (row) {
        return {
          memberId: row.id,
          name: row.name,
          dbRole: row.role,
          role: prdRoleFromDb(row.role),
          orgId,
          via: 'session',
        }
      }
    }
  } catch {
    // No cookie context (e.g. a background job). Fall through.
  }

  // ---- 2. People switcher, unless explicitly disabled ----
  if (!demoPersonasEnabled()) return null

  const memberId = req.headers.get(MEMBER_HEADER)?.trim()
  const persona = req.headers.get(PERSONA_HEADER)?.trim() as UserRole | undefined

  if (memberId) {
    const { data } = await sb
      .from('members')
      .select('id,name,role')
      .eq('org_id', orgId)
      .eq('id', memberId)
      .maybeSingle()
    row = toMemberRow(data)
  }

  if (!row && persona) {
    const { data: candidates } = await sb
      .from('members')
      .select('id,name,role')
      .eq('org_id', orgId)

    // Exact stored-role match first, so personas that share a PRD role (both
    // `econs-manager` and `category-lead` are managers) still resolve to
    // DIFFERENT people. Falling straight to PRD role would collapse them onto
    // whichever manager the query happened to return first.
    const exact = dbRoleForAppRole(persona)
    let match = exact ? (candidates ?? []).find((m) => String(m.role) === exact) : undefined

    if (!match) {
      const wanted = prdRoleFromApp(persona)
      match = (candidates ?? []).find((m) => prdRoleFromDb(String(m.role)) === wanted)
    }
    row = toMemberRow(match)
  }

  if (!row) return null

  return {
    memberId: row.id,
    name: row.name,
    dbRole: row.role,
    role: prdRoleFromDb(row.role),
    orgId,
    via: 'persona',
  }
}

/** Resolve, or throw a 401 the route can turn into a response. */
export async function requireActor(
  sb: SupabaseClient,
  orgId: string,
  req: Request,
): Promise<Actor> {
  const actor = await resolveActor(sb, orgId, req)
  if (!actor) {
    throw new PermissionError('Could not identify the acting user for this request.', 401)
  }
  return actor
}

export function requireCapability(actor: Actor, capability: Capability): void {
  if (!can(actor.role, capability)) {
    // PRD §4.3: do not reveal whether the record exists, only that the action
    // is not permitted for this role.
    throw new PermissionError('You do not have permission to perform this action.')
  }
}

/** PRD §12.1 separation of duty — compares database ids, not client claims. */
export function assertNotOwner(actor: Actor, ownerId: string | null | undefined, what: string): void {
  if (ownerId && actor.memberId === ownerId) {
    throw new PermissionError(`The owner of an initiative cannot ${what} it.`)
  }
}

/** Turn a PermissionError into a Response; rethrow anything else. */
export function permissionResponse(e: unknown): Response | null {
  if (e instanceof PermissionError) {
    return Response.json({ error: e.message }, { status: e.status })
  }
  return null
}
