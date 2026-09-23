import type {
  Initiative,
  InitiativeSection,
  InitiativeStatus,
  InitiativeType,
  InitiativePriority,
} from '@/types/initiative'
import type { PrdRole, Capability } from '@/lib/permissions/capabilities'

// The initiative state machine, per PRD §11.4.
//
//   Draft → Pending Approval → Approved → Active → Completed
//         → Results Submitted → Under Review → Closed
//   (+ Rejected, Cancelled)
//
// Approval is a BLOCKING gate: execution cannot begin until an approver
// approves and the owner explicitly starts. Closure is equally blocking —
// nothing reaches Closed without a reviewer approving submitted results
// (enforced in Postgres too, see 007/008).
//
// Separation of duty (§12.1) is checked here for the UI and again server-side
// in lib/permissions/actor.ts, which compares database ids.

export const STATUS_ORDER: InitiativeStatus[] = [
  'draft',
  'pending-approval',
  'approved',
  'active',
  'completed',
  'results-submitted',
  'under-review',
  'closed',
]

export const STATUS_LABELS: Record<InitiativeStatus, string> = {
  draft: 'Draft',
  'pending-approval': 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
  completed: 'Completed',
  'results-submitted': 'Results Submitted',
  'under-review': 'Under Review',
  closed: 'Closed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const TYPE_LABELS: Record<InitiativeType, string> = {
  campaign: 'Campaign',
  'mega-sale': 'Mega Sale',
  'bundle-promo': 'Bundle Promo',
  media: 'Media',
  'product-launch': 'Product Launch',
  pricing: 'Pricing',
  crm: 'CRM',
  'ai-deployment': 'AI Deployment',
  'ops-improvement': 'Ops Improvement',
  hiring: 'Hiring',
  process: 'Process',
  recovery: 'Recovery',
  other: 'Other',
}

export const PRIORITY_LABELS: Record<InitiativePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

// ---------------------------------------------------------------------------
// Sections (PRD §7.1)
// ---------------------------------------------------------------------------

export const SECTION_META: Record<
  InitiativeSection,
  { key: InitiativeSection; label: string; description: string }
> = {
  drafts: {
    key: 'drafts',
    label: 'Drafts',
    description:
      'Not yet submitted. AI-generated drafts wait here too — they never enter the approval queue until a person submits them.',
  },
  active: {
    key: 'active',
    label: 'Active',
    description: 'Approved and currently being executed.',
  },
  'pending-approval': {
    key: 'pending-approval',
    label: 'Pending Approval',
    description: 'Submitted and waiting on an approver. Execution has not started.',
  },
  'for-review': {
    key: 'for-review',
    label: 'For Review',
    description: 'Completed initiatives awaiting results submission or reviewer decision.',
  },
  closed: {
    key: 'closed',
    label: 'Closed',
    description: 'Archived. Every one of these is now institutional memory.',
  },
  all: {
    key: 'all',
    label: 'All',
    description: 'Every initiative, including drafts, approved-but-not-started, rejected and cancelled.',
  },
}

export const SECTION_ORDER: InitiativeSection[] = [
  'drafts',
  'active',
  'pending-approval',
  'for-review',
  'closed',
  'all',
]

/** Which section an initiative belongs to. `all` is handled by the caller. */
export function sectionsFor(initiative: Initiative): InitiativeSection[] {
  switch (initiative.status) {
    case 'active':
      return ['active']
    case 'pending-approval':
      return ['pending-approval']
    case 'completed':
    case 'results-submitted':
    case 'under-review':
      return ['for-review']
    case 'closed':
      return ['closed']
    case 'draft':
      return ['drafts']
    // Approved-but-not-started, Rejected and Cancelled are only reachable
    // through the All view, per §7.1.
    case 'approved':
    case 'rejected':
    case 'cancelled':
      return []
  }
}

export function isInSection(initiative: Initiative, section: InitiativeSection): boolean {
  if (section === 'all') return true
  return sectionsFor(initiative).includes(section)
}

// ---------------------------------------------------------------------------
// Transitions (PRD §11.4)
// ---------------------------------------------------------------------------

export type InitiativeAction =
  | 'submit' // Draft → Pending Approval (owner)
  | 'approve' // Pending Approval → Approved (approver)
  | 'request-revision' // Pending Approval → Draft (approver)
  | 'reject' // Pending Approval → Rejected (approver)
  | 'withdraw' // Pending Approval → Draft (owner)
  | 'start' // Approved → Active (owner)
  | 'complete' // Active → Completed (owner)
  | 'submit-results' // Completed → Results Submitted (owner)
  | 'begin-review' // Results Submitted → Under Review (reviewer/system)
  | 'approve-closure' // Under Review → Closed (reviewer)
  | 'request-results-revision' // Under Review → Completed (reviewer)
  | 'reopen' // Completed → Active (manager)
  | 'cancel' // Approved/Active → Cancelled (manager/admin)

interface TransitionRule {
  from: InitiativeStatus[]
  to: InitiativeStatus | null
  /** Who may perform it: 'owner', 'approver', 'reviewer', or 'manager'. */
  actor: 'owner' | 'approver' | 'reviewer' | 'manager'
  capability: Capability
  /** A comment/reason is mandatory for this transition. */
  requiresComment?: boolean
}

export const TRANSITIONS: Record<InitiativeAction, TransitionRule> = {
  submit: { from: ['draft'], to: 'pending-approval', actor: 'owner', capability: 'initiative:create' },
  approve: {
    from: ['pending-approval'],
    to: 'approved',
    actor: 'approver',
    capability: 'initiative:approve',
  },
  'request-revision': {
    from: ['pending-approval'],
    to: 'draft',
    actor: 'approver',
    capability: 'initiative:approve',
    requiresComment: true,
  },
  reject: {
    from: ['pending-approval'],
    to: 'rejected',
    actor: 'approver',
    capability: 'initiative:approve',
    requiresComment: true,
  },
  withdraw: { from: ['pending-approval'], to: 'draft', actor: 'owner', capability: 'initiative:create' },
  start: { from: ['approved'], to: 'active', actor: 'owner', capability: 'initiative:update' },
  complete: { from: ['active'], to: 'completed', actor: 'owner', capability: 'initiative:update' },
  'submit-results': {
    from: ['completed'],
    to: 'results-submitted',
    actor: 'owner',
    capability: 'initiative:submit-results',
  },
  'begin-review': {
    from: ['results-submitted'],
    to: 'under-review',
    actor: 'reviewer',
    capability: 'initiative:review-results',
  },
  'approve-closure': {
    from: ['under-review'],
    to: 'closed',
    actor: 'reviewer',
    capability: 'initiative:review-results',
  },
  'request-results-revision': {
    from: ['under-review'],
    to: 'completed',
    actor: 'reviewer',
    capability: 'initiative:review-results',
    requiresComment: true,
  },
  reopen: { from: ['completed'], to: 'active', actor: 'manager', capability: 'initiative:update' },
  cancel: {
    from: ['approved', 'active'],
    to: 'cancelled',
    actor: 'manager',
    capability: 'initiative:cancel',
    requiresComment: true,
  },
}

export function canPerform(initiative: Initiative, action: InitiativeAction): boolean {
  return TRANSITIONS[action].from.includes(initiative.status)
}

export function statusAfter(action: InitiativeAction): InitiativeStatus | null {
  return TRANSITIONS[action].to
}

// ---------------------------------------------------------------------------
// Next action
// ---------------------------------------------------------------------------

export interface NextAction {
  label: string
  actor: 'owner' | 'approver' | 'reviewer' | 'manager' | 'system'
  forViewer: boolean
  action?: InitiativeAction
}

export interface ViewerCtx {
  /** The viewer's member id — compared against owner/approver/reviewer ids. */
  memberId: string
  role: PrdRole
}

const MANAGER_ROLES = new Set<PrdRole>(['executive', 'manager', 'admin'])
export const isManagerRole = (role: PrdRole) => MANAGER_ROLES.has(role)

/**
 * Whether the viewer may perform an action on this initiative, applying both
 * the capability matrix and separation of duty. Mirrors the server-side check
 * so the UI does not offer buttons the API will refuse.
 */
export function viewerMayPerform(
  initiative: Initiative,
  action: InitiativeAction,
  ctx: ViewerCtx,
): boolean {
  const rule = TRANSITIONS[action]
  if (!canPerform(initiative, action)) return false

  const isOwner = initiative.ownerId === ctx.memberId
  switch (rule.actor) {
    case 'owner':
      return isOwner
    case 'approver':
      // Designated approver, or any manager standing in — but never the owner.
      if (isOwner) return false
      return initiative.approverId === ctx.memberId || isManagerRole(ctx.role)
    case 'reviewer':
      if (isOwner) return false
      return initiative.reviewerId === ctx.memberId || isManagerRole(ctx.role)
    case 'manager':
      return isManagerRole(ctx.role)
  }
}

/** What this initiative is waiting on next, and whether the viewer owns it. */
export function nextActionFor(initiative: Initiative, ctx: ViewerCtx): NextAction {
  const mine = (action: InitiativeAction) => viewerMayPerform(initiative, action, ctx)

  switch (initiative.status) {
    case 'draft':
      return {
        label: mine('submit') ? 'Submit for approval' : 'Owner to submit for approval',
        actor: 'owner',
        forViewer: mine('submit'),
        action: mine('submit') ? 'submit' : undefined,
      }
    case 'pending-approval':
      return {
        label: mine('approve')
          ? 'Approve, reject or request revision'
          : `Awaiting approval from ${initiative.approverName ?? 'the approver'}`,
        actor: 'approver',
        forViewer: mine('approve'),
        action: mine('approve') ? 'approve' : undefined,
      }
    case 'approved':
      return {
        label: mine('start') ? 'Start execution' : 'Approved — owner to start',
        actor: 'owner',
        forViewer: mine('start'),
        action: mine('start') ? 'start' : undefined,
      }
    case 'active':
      return {
        label: mine('complete') ? 'Update progress, then mark complete' : 'Executing',
        actor: 'owner',
        forViewer: mine('complete'),
        action: mine('complete') ? 'complete' : undefined,
      }
    case 'completed':
      return {
        label: mine('submit-results') ? 'Submit results' : 'Owner to submit results',
        actor: 'owner',
        forViewer: mine('submit-results'),
        action: mine('submit-results') ? 'submit-results' : undefined,
      }
    case 'results-submitted':
      return {
        label: mine('begin-review') ? 'Begin review' : 'Awaiting reviewer',
        actor: 'reviewer',
        forViewer: mine('begin-review'),
        action: mine('begin-review') ? 'begin-review' : undefined,
      }
    case 'under-review':
      return {
        label: mine('approve-closure')
          ? 'Approve closure or request revision'
          : `Under review by ${initiative.reviewerName ?? 'the reviewer'}`,
        actor: 'reviewer',
        forViewer: mine('approve-closure'),
        action: mine('approve-closure') ? 'approve-closure' : undefined,
      }
    case 'closed':
      return { label: 'Closed — written to memory', actor: 'system', forViewer: false }
    case 'rejected':
      return { label: 'Rejected', actor: 'system', forViewer: false }
    case 'cancelled':
      return { label: 'Cancelled', actor: 'system', forViewer: false }
  }
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

/** Manual progress only — never inferred from KPI movement (PRD §7.4). */
export function progressPct(initiative: Initiative): number {
  return initiative.progressPercent ?? 0
}

export function budgetUsedPct(initiative: Initiative): number | null {
  const spend = initiative.results?.actualSpend ?? initiative.actualSpend
  if (spend == null || !initiative.approvedBudget) return null
  return Math.round((spend / initiative.approvedBudget) * 100)
}

/**
 * PRD §7.4: overdue means the end date has passed and the initiative is not
 * Completed, Under Review, Closed, Cancelled or Rejected.
 */
const NOT_OVERDUE_STATUSES = new Set<InitiativeStatus>([
  'completed',
  'results-submitted',
  'under-review',
  'closed',
  'cancelled',
  'rejected',
])

export function isOverdue(initiative: Initiative, now = new Date()): boolean {
  if (NOT_OVERDUE_STATUSES.has(initiative.status)) return false
  if (!initiative.endDate) return false
  return +new Date(initiative.endDate) < +now
}

/** PRD §8.3. Keep identical to the generated column in 007_initiatives.sql. */
export function computeRoi(incrementalProfit?: number, actualSpend?: number): number | null {
  if (incrementalProfit == null || !actualSpend || actualSpend <= 0) return null
  return ((incrementalProfit - actualSpend) / actualSpend) * 100
}

/** PRD §8.3: ROAS is only meaningful for advertising/media initiatives. */
const MEDIA_TYPES = new Set<InitiativeType>(['media', 'campaign', 'mega-sale'])
export function roasApplies(type: InitiativeType): boolean {
  return MEDIA_TYPES.has(type)
}

export function computeRoas(revenueGenerated?: number, actualSpend?: number): number | null {
  if (revenueGenerated == null || !actualSpend || actualSpend <= 0) return null
  return revenueGenerated / actualSpend
}

/** PRD §8.3 budget variance. Percentage only when the budget is non-zero. */
export function budgetVariance(
  initiative: Initiative,
): { absolute: number; percent: number | null } | null {
  const spend = initiative.results?.actualSpend ?? initiative.actualSpend
  if (spend == null || initiative.approvedBudget == null) return null
  const absolute = spend - initiative.approvedBudget
  return {
    absolute,
    percent: initiative.approvedBudget !== 0 ? (absolute / initiative.approvedBudget) * 100 : null,
  }
}
