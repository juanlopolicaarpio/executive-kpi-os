import type { Actor } from './actor'
import { SCOPES_FOR_PRD_ROLE } from './capabilities'

// The one place a requested scope becomes an effective scope.
//
// The scope selector is a VIEW filter for roles that hold more than one scope
// (a manager may legitimately look at the whole organization), and a PERMISSION
// BOUNDARY for roles that hold only one (a contributor may not). Both readings
// live here so an endpoint cannot accidentally implement only the first.
//
// Every read endpoint must clamp through `effectiveScope` rather than trusting
// `?scope=`. A query string is client-supplied: without clamping, a contributor
// could type `?scope=organization` and read KPIs they were never granted.

export type ScopeType = 'individual' | 'organization'

export const SCOPE_LABELS: Record<ScopeType, string> = {
  individual: 'My KPIs',
  organization: 'Organization',
}

/**
 * The scope a role lands on before the user chooses for themselves.
 *
 * PRD §4.2 says "the narrowest USEFUL scope" — which is the role's primary
 * scope from §3.1, not the narrowest one it is technically allowed to select.
 * An executive's primary scope is the whole organization; defaulting them to
 * "My KPIs" shows an empty screen, because nothing is assigned to them at
 * individual scope. Useful is doing the work in that sentence.
 *
 * Lives here rather than in the client store so the server's default and the
 * selector's default cannot drift apart — they were briefly two different
 * answers, and the CEO's dashboard came back empty.
 */
const PRIMARY_SCOPE: Record<string, ScopeType> = {
  executive: 'organization',
  admin: 'organization',
  viewer: 'organization',
  // A manager's own KPIs are the useful default; the organization view is one
  // click away when they need it.
  manager: 'individual',
  contributor: 'individual',
}

export function scopesForRole(role: string | null | undefined): ScopeType[] {
  return SCOPES_FOR_PRD_ROLE[(role ?? 'viewer') as keyof typeof SCOPES_FOR_PRD_ROLE] ?? ['organization']
}

/** The scope a role starts on, guaranteed to be one it may select. */
export function defaultScopeFor(role: string | null | undefined): ScopeType {
  const allowed = scopesForRole(role)
  const primary = PRIMARY_SCOPE[role ?? ''] ?? 'organization'
  return allowed.includes(primary) ? primary : (allowed[0] ?? 'organization')
}

export function parseScope(raw: string | null | undefined): ScopeType | null {
  return raw === 'individual' || raw === 'organization' ? raw : null
}

/**
 * The scope this actor is actually permitted to read, given what they asked for.
 *
 * An unrecognised or disallowed request falls back to the role's default and is
 * never widened past what the role holds. A public no-session read lands on the
 * organization view so the hosted KPI OS opens directly to the business
 * dashboard. Mutating routes still require an actor.
 */
export function effectiveScope(actor: Actor | null, requested: string | null | undefined): ScopeType {
  if (!actor) return 'organization'
  const allowed = scopesForRole(actor.role)
  const asked = parseScope(requested)
  if (asked && allowed.includes(asked)) return asked
  return defaultScopeFor(actor.role)
}

/**
 * Whether a record owned by `ownerId` is visible at this scope.
 *
 * KPIs belong to people, so "My KPIs" means exactly what you own. There is no
 * department layer between the individual and the organization.
 */
export function visibleAtScope(
  actor: Actor | null,
  scope: ScopeType,
  ownerId: string | null | undefined,
): boolean {
  if (scope === 'organization') return true
  if (!actor) return false
  return ownerId === actor.memberId
}

/** Convenience: resolve the scope and get a predicate in one step. */
export function scopeFilter(
  actor: Actor | null,
  requested: string | null | undefined,
): { scope: ScopeType; visible: (ownerId: string | null | undefined) => boolean } {
  const scope = effectiveScope(actor, requested)
  return { scope, visible: (ownerId) => visibleAtScope(actor, scope, ownerId) }
}
