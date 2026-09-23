import type { SupabaseClient } from '@supabase/supabase-js'

// The budget approval routing engine (PRD §7.5 / §11.5).
//
// This is normative and server-side. The UI shows a preview using the same
// function, but the preview is informative only — routing is recalculated on
// submission so a stale client cannot choose its own approver.
//
// The ordered steps in §11.5 are followed literally: calculate → match tier →
// resolve scope → enforce separation of duty → route → snapshot → notify.
// Each failure mode returns a reason rather than silently picking someone,
// because a wrongly-routed approval is worse than a blocked submission.

export interface BudgetLineInput {
  category: string
  description?: string
  amount: number
}

export interface ApprovalTier {
  id: string
  sortOrder: number
  lowerBound: number
  upperBound: number | null
  approvalRequired: boolean
  approverRole: 'manager' | 'executive' | 'admin' | null
  approverUserId: string | null
  delegateUserId: string | null
}

export interface RouteResult {
  ok: boolean
  /** Total in the organization's default currency. */
  totalBudget: number
  currency: string
  policyVersion: number | null
  tier: ApprovalTier | null
  approvalRequired: boolean
  /** The member who must decide. Null when no approval is required. */
  approverId: string | null
  approverName: string | null
  /** True when the delegate was used because the primary was the owner. */
  usedDelegate: boolean
  /** Status the initiative should land in on submission. */
  resultingStatus: 'approved' | 'pending_approval'
  /** Set when ok is false — the configuration or separation-of-duty problem. */
  error?: string
}

/** §11.5 step 1. Line items sum to the total; zero is permitted. */
export function calculateTotal(lines: BudgetLineInput[], fallbackTotal?: number | null): number {
  if (lines.length > 0) {
    return lines.reduce((sum, l) => sum + (Number.isFinite(l.amount) ? l.amount : 0), 0)
  }
  return Number(fallbackTotal ?? 0)
}

/**
 * §11.5 step 2. Boundary convention: lower bound EXCLUSIVE except on the first
 * tier, upper bound INCLUSIVE. So with tiers 0–500k and 500k–1M, exactly
 * 500,000 matches the first tier and 500,000.01 matches the second.
 */
export function matchTier(total: number, tiers: ApprovalTier[]): ApprovalTier | null {
  const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder)
  for (let i = 0; i < ordered.length; i++) {
    const t = ordered[i]!
    const isFirst = i === 0
    const aboveLower = isFirst ? total >= t.lowerBound : total > t.lowerBound
    const belowUpper = t.upperBound == null || total <= t.upperBound
    if (aboveLower && belowUpper) return t
  }
  return null
}

/** Validation used by Admin before a policy can be activated (§7.5). */
export function validateTiers(tiers: ApprovalTier[]): string | null {
  if (tiers.length === 0) return 'A policy needs at least one tier.'
  const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder)

  if (ordered[0]!.lowerBound > 0) {
    return 'The first tier must start at 0 so every permitted amount is covered.'
  }
  for (let i = 0; i < ordered.length; i++) {
    const t = ordered[i]!
    const next = ordered[i + 1]
    if (t.upperBound == null) {
      if (next) return 'Only the last tier may be unbounded.'
      continue
    }
    if (t.upperBound < t.lowerBound) return `Tier ${i + 1} has an upper bound below its lower bound.`
    if (!next) return 'The last tier must be unbounded so large amounts cannot fall through.'
    // Contiguity: the next tier's exclusive lower bound must equal this
    // tier's inclusive upper bound, leaving neither gap nor overlap.
    if (Number(next.lowerBound) !== Number(t.upperBound)) {
      return `Tiers ${i + 1} and ${i + 2} leave a gap or overlap at ${t.upperBound}.`
    }
    if (t.approvalRequired && !t.approverRole && !t.approverUserId) {
      return `Tier ${i + 1} requires approval but names no approver.`
    }
  }
  return null
}

interface MemberRow {
  id: string
  name: string
  role: string
  manager_id: string | null
}

const EXEC_ROLES = new Set(['founder', 'ceo'])
const MANAGER_ROLES = new Set(['ecomm_lead', 'category_lead', 'manager'])
const ADMIN_ROLES = new Set(['admin'])

/**
 * §11.5 steps 3–5. Resolve the approver for a tier against the Master KPI's
 * scope, then enforce separation of duty.
 */
function resolveApprover(
  tier: ApprovalTier,
  members: MemberRow[],
  ownerId: string,
): { approverId: string | null; usedDelegate: boolean; error?: string } {
  if (!tier.approvalRequired) return { approverId: null, usedDelegate: false }

  const byId = new Map(members.map((m) => [m.id, m]))
  let candidate: string | null = tier.approverUserId ?? null

  if (!candidate && tier.approverRole) {
    const pool = members.filter((m) => {
      if (tier.approverRole === 'executive') return EXEC_ROLES.has(m.role)
      if (tier.approverRole === 'admin') return ADMIN_ROLES.has(m.role)
      return MANAGER_ROLES.has(m.role) || EXEC_ROLES.has(m.role)
    })
    // Prefer the owner's actual manager. Without a department layer, the
    // reporting line is the only real relationship to route along; anything
    // else would be picking a manager arbitrarily.
    const owner = byId.get(ownerId)
    const viaManager = owner?.manager_id ? pool.find((m) => m.id === owner.manager_id) : undefined
    candidate = (viaManager ?? pool.find((m) => m.id !== ownerId))?.id ?? null
  }

  if (!candidate) {
    return {
      approverId: null,
      usedDelegate: false,
      error: `No eligible ${tier.approverRole ?? 'approver'} is configured for this budget tier.`,
    }
  }

  // §12.1 separation of duty — the owner can never approve their own work.
  if (candidate === ownerId) {
    if (tier.delegateUserId && tier.delegateUserId !== ownerId) {
      return { approverId: tier.delegateUserId, usedDelegate: true }
    }
    const nextEligible = members.find(
      (m) => m.id !== ownerId && (EXEC_ROLES.has(m.role) || ADMIN_ROLES.has(m.role)),
    )
    if (nextEligible) return { approverId: nextEligible.id, usedDelegate: true }
    return {
      approverId: null,
      usedDelegate: false,
      error:
        'The resolved approver is the initiative owner and no delegate or higher authority is configured.',
    }
  }

  return { approverId: candidate, usedDelegate: false }
}

/**
 * Compute the full route for a budget. Used by both the preview endpoint and
 * the submit transition — the same function, so they can never disagree.
 */
export async function routeBudget(
  sb: SupabaseClient,
  orgId: string,
  opts: {
    total: number
    ownerId: string
  },
): Promise<RouteResult> {
  const base: RouteResult = {
    ok: false,
    totalBudget: opts.total,
    currency: 'PHP',
    policyVersion: null,
    tier: null,
    approvalRequired: false,
    approverId: null,
    approverName: null,
    usedDelegate: false,
    resultingStatus: 'pending_approval',
  }

  if (!(opts.total >= 0)) {
    return { ...base, error: 'Budget must be zero or greater.' }
  }

  const { data: policy } = await sb
    .from('approval_policies')
    .select('id,version,currency')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .maybeSingle()

  if (!policy) {
    return {
      ...base,
      error: 'No active budget approval policy is configured. An administrator must set one up.',
    }
  }

  const { data: tierRows } = await sb
    .from('approval_tiers')
    .select('*')
    .eq('policy_id', policy.id)
    .order('sort_order', { ascending: true })

  const tiers: ApprovalTier[] = (tierRows ?? []).map((t) => ({
    id: String(t.id),
    sortOrder: Number(t.sort_order),
    lowerBound: Number(t.lower_bound),
    upperBound: t.upper_bound == null ? null : Number(t.upper_bound),
    approvalRequired: Boolean(t.approval_required),
    approverRole: (t.approver_role as ApprovalTier['approverRole']) ?? null,
    approverUserId: t.approver_user_id ? String(t.approver_user_id) : null,
    delegateUserId: t.delegate_user_id ? String(t.delegate_user_id) : null,
  }))

  const tier = matchTier(opts.total, tiers)
  if (!tier) {
    return {
      ...base,
      currency: String(policy.currency),
      policyVersion: Number(policy.version),
      error: `No approval tier covers ${opts.total.toLocaleString()}. The policy has a gap.`,
    }
  }

  const { data: members } = await sb
    .from('members')
    .select('id,name,role,manager_id')
    .eq('org_id', orgId)

  const resolved = resolveApprover(tier, (members ?? []) as MemberRow[], opts.ownerId)

  if (resolved.error) {
    return {
      ...base,
      currency: String(policy.currency),
      policyVersion: Number(policy.version),
      tier,
      approvalRequired: tier.approvalRequired,
      error: resolved.error,
    }
  }

  const approverName =
    resolved.approverId != null
      ? ((members ?? []).find((m) => m.id === resolved.approverId)?.name ?? null)
      : null

  return {
    ok: true,
    totalBudget: opts.total,
    currency: String(policy.currency),
    policyVersion: Number(policy.version),
    tier,
    approvalRequired: tier.approvalRequired,
    approverId: resolved.approverId,
    approverName,
    usedDelegate: resolved.usedDelegate,
    // §11.5 step 5: a no-approval tier lands directly in Approved.
    resultingStatus: tier.approvalRequired ? 'pending_approval' : 'approved',
  }
}

/** Human-readable summary for the Approval Route Preview (§7.5). */
export function describeRoute(route: RouteResult): string {
  if (!route.ok) return route.error ?? 'This budget cannot be routed.'
  const amount = `${route.currency} ${route.totalBudget.toLocaleString()}`
  if (!route.approvalRequired) {
    return `${amount} falls in a no-approval tier — submitting will approve it automatically.`
  }
  return `${amount} routes to ${route.approverName ?? 'the configured approver'} for approval${
    route.usedDelegate ? ' (delegate, because the primary approver owns this initiative)' : ''
  }.`
}
