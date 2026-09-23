import { useUiStore } from '@/store/uiStore'
import { MEMBER_HEADER, PERSONA_HEADER } from '@/lib/permissions/headers'

// Every request carries the demo persona in a header. The server resolves it to
// a real `members` row and reads that row's stored role — the header states WHO
// is acting, never WHAT they may do, so nothing here is a trusted authorization
// claim. A real signed-in session always takes precedence over both headers,
// and the server ignores them entirely unless DEMO_PERSONAS is on.

export function sessionHeaders(extra?: HeadersInit): HeadersInit {
  const { currentUserRole, personaMemberId } = useUiStore.getState()
  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined),
    [PERSONA_HEADER]: currentUserRole,
  }
  // A member id names one specific person, so it wins over the role when set.
  if (personaMemberId) headers[MEMBER_HEADER] = personaMemberId
  return headers
}

/** fetch() with the persona header attached. */
export function sessionFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, headers: sessionHeaders(init.headers) })
}

export interface MeActor {
  memberId: string
  name: string
  role: 'executive' | 'manager' | 'contributor' | 'viewer' | 'admin'
  roleLabel: string
  dbRole: string
  orgId: string
  /** Scopes that can actually resolve for this user, from the data. */
  availableScopes: ('organization' | 'individual')[]
  /** The scope this role lands on before the user chooses one. */
  defaultScope: 'organization' | 'individual'
  ownedKpiCount: number
  /** How the server identified you — a real session, or the people switcher. */
  via: 'session' | 'persona'
  /** True when the server is honouring people-switcher headers. */
  demoPersonas: boolean
}

export async function getMe(): Promise<MeActor | null> {
  const res = await sessionFetch('/api/me')
  if (!res.ok) return null
  const { actor, demoPersonas } = (await res.json()) as {
    actor: Omit<MeActor, 'demoPersonas'> | null
    demoPersonas?: boolean
  }
  return actor ? { ...actor, demoPersonas: demoPersonas === true } : null
}
