import type { UserRole } from '@/types/user'

// The PRD capability matrix.
//
// Two role vocabularies exist in this codebase: the five PRD roles below, and
// the inherited KPI OS job-title union in types/user.ts. Those titles are
// job descriptions, not permission levels, so they map onto the PRD roles here.

export type PrdRole = 'executive' | 'manager' | 'contributor' | 'viewer' | 'admin'

export type Capability =
  | 'kpi:view'
  | 'kpi:create'
  | 'kpi:edit'
  | 'kpi:measure'
  | 'initiative:view'
  | 'initiative:create'
  | 'initiative:approve'
  | 'initiative:update'
  | 'initiative:submit-results'
  | 'initiative:review-results'
  | 'initiative:cancel'
  // Seeing how OTHER people are performing against their KPIs. Distinct from
  // `kpi:view`, which every role holds — a contributor may read the KPIs in
  // their own scope without being shown a scorecard for their colleagues.
  | 'people:view-performance'
  | 'admin:manage'
  | 'admin:audit'

const MATRIX: Record<PrdRole, Capability[]> = {
  executive: [
    'kpi:view',
    'kpi:create',
    'kpi:edit',
    'kpi:measure',
    'initiative:view',
    'initiative:create',
    'initiative:approve',
    'initiative:update',
    'initiative:submit-results',
    'initiative:review-results',
    'initiative:cancel',
    'people:view-performance',
    'admin:audit',
  ],
  manager: [
    'kpi:view',
    'kpi:create',
    'kpi:edit',
    'kpi:measure',
    'initiative:view',
    'initiative:create',
    'initiative:approve',
    'initiative:update',
    'initiative:submit-results',
    'initiative:review-results',
    'initiative:cancel',
    'people:view-performance',
  ],
  contributor: [
    'kpi:view',
    'kpi:measure',
    'initiative:view',
    'initiative:create',
    'initiative:update',
    'initiative:submit-results',
  ],
  viewer: ['kpi:view', 'initiative:view'],
  admin: [
    'kpi:view',
    'kpi:create',
    'kpi:edit',
    'kpi:measure',
    'initiative:view',
    'initiative:create',
    'initiative:update',
    'initiative:cancel',
    'people:view-performance',
    'admin:manage',
    'admin:audit',
  ],
}

/**
 * Backend `members.role` values → PRD roles.
 *
 * These are the values actually stored in Supabase today. An unrecognised role
 * falls through to `viewer` — the least privileged option — so a typo or a new
 * job title can never accidentally grant access.
 */
const DB_ROLE_TO_PRD: Record<string, PrdRole> = {
  founder: 'executive',
  ceo: 'executive',
  admin: 'admin',
  ecomm_lead: 'manager',
  growth_lead: 'manager',
  category_lead: 'manager',
  manager: 'manager',
  finance: 'contributor',
  affiliate_officer: 'contributor',
  affiliate_marketing: 'contributor',
  ecomm_officer: 'contributor',
  paid_acquisition: 'contributor',
  tts_ops: 'contributor',
  telesales: 'contributor',
  shopee_lazada_ops: 'contributor',
  brand: 'contributor',
  customer_intelligence: 'contributor',
  viewer: 'viewer',
}

/** App-side `UserRole` (kebab-case demo personas) → PRD roles. */
const APP_ROLE_TO_PRD: Record<UserRole, PrdRole> = {
  ceo: 'executive',
  'econs-manager': 'manager',
  'category-lead': 'manager',
  'econs-officer': 'contributor',
  'affiliate-officer': 'contributor',
  'tts-ops': 'contributor',
  'shopee-lazada-ops': 'contributor',
  finance: 'contributor',
  brand: 'contributor',
  viewer: 'viewer',
}

/**
 * Exact app-persona → stored-role mapping.
 *
 * Needed because several personas share a PRD role: `econs-manager` and
 * `category-lead` are both `manager`, so matching on PRD role alone would
 * resolve both to whichever manager the query returned first — and switching
 * persona in the demo would silently not switch person.
 */
const APP_ROLE_TO_DB_ROLE: Partial<Record<UserRole, string>> = {
  ceo: 'founder',
  'econs-manager': 'ecomm_lead',
  'category-lead': 'category_lead',
  'econs-officer': 'ecomm_officer',
  'affiliate-officer': 'affiliate_officer',
  'tts-ops': 'tts_ops',
  'shopee-lazada-ops': 'shopee_lazada_ops',
  finance: 'finance',
  brand: 'brand',
  viewer: 'viewer',
}

export function dbRoleForAppRole(role: UserRole): string | undefined {
  return APP_ROLE_TO_DB_ROLE[role]
}

export function prdRoleFromDb(dbRole: string | null | undefined): PrdRole {
  if (!dbRole) return 'viewer'
  return DB_ROLE_TO_PRD[dbRole] ?? 'viewer'
}

export function prdRoleFromApp(role: UserRole): PrdRole {
  return APP_ROLE_TO_PRD[role] ?? 'viewer'
}

export function can(role: PrdRole, capability: Capability): boolean {
  return MATRIX[role].includes(capability)
}

export const PRD_ROLE_LABELS: Record<PrdRole, string> = {
  executive: 'Executive',
  manager: 'Manager',
  contributor: 'Contributor',
  viewer: 'Viewer',
  admin: 'Organization Admin',
}

/**
 * Scopes each role may select (PRD §4.2). This is the PERMITTED set; which of
 * them can actually resolve depends on the data and is computed in /api/me.
 */
export const SCOPES_FOR_PRD_ROLE: Record<PrdRole, ('organization' | 'individual')[]> = {
  executive: ['organization', 'individual'],
  admin: ['organization', 'individual'],
  manager: ['organization', 'individual'],
  contributor: ['individual'],
  viewer: ['organization'],
}
