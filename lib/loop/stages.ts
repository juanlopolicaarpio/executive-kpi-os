import type { Kpi } from '@/types/kpi'
import type { RecoveryPlan, AccountabilityEvent } from '@/types/accountability'
import type { UserRole } from '@/types/user'

// The accountability loop every missed KPI travels through. CEO review is
// intentionally NOT a stage — the CEO oversees plans without the loop ever
// waiting on an approval gate (plans go active on submission).
export type LoopStage =
  | 'missed' // 1. Target missed, detected by the system
  | 'alerted' // 2. Owner notified (Telegram + dashboard)
  | 'plan-needed' // 3. Owner must diagnose and submit a recovery plan (AI suggests)
  | 'in-progress' // 4. Plan submitted and executing (CEO oversight, non-blocking)
  | 'outcome' // 5. Outcome recorded -> written to institutional memory

export const LOOP_STAGE_ORDER: LoopStage[] = [
  'missed',
  'alerted',
  'plan-needed',
  'in-progress',
  'outcome',
]

export interface StageMeta {
  key: LoopStage
  label: string
  /** Conclusion-first description of what this stage means. */
  description: string
  /** Tailwind classes for the column accent. */
  accent: string
  dot: string
}

export const STAGE_META: Record<LoopStage, StageMeta> = {
  missed: {
    key: 'missed',
    label: 'Missed',
    description: 'Target missed. Detected automatically from the latest data.',
    accent: 'border-red-200 bg-red-50/60',
    dot: 'bg-red-500',
  },
  alerted: {
    key: 'alerted',
    label: 'Owner Alerted',
    description: 'Owner notified via Telegram and dashboard. Awaiting a recovery plan.',
    accent: 'border-orange-200 bg-orange-50/60',
    dot: 'bg-orange-500',
  },
  'plan-needed': {
    key: 'plan-needed',
    label: 'Plan Needed',
    description: 'Owner is drafting a recovery plan. AI suggests what worked last time.',
    accent: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
  },
  'in-progress': {
    key: 'in-progress',
    label: 'In Progress',
    description: 'Recovery plan is live and executing. CEO has oversight.',
    accent: 'border-blue-200 bg-blue-50/60',
    dot: 'bg-blue-500',
  },
  outcome: {
    key: 'outcome',
    label: 'Outcome Recorded',
    description: 'Result captured and written to institutional memory.',
    accent: 'border-emerald-200 bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
}

const ACTIVE_PLAN_STATUSES = new Set(['draft', 'submitted', 'approved', 'in-progress'])
const TERMINAL_PLAN_STATUSES = new Set(['resolved', 'failed'])

/** The plan currently driving recovery for a KPI (most recent non-terminal). */
export function getActivePlan(plans: RecoveryPlan[]): RecoveryPlan | undefined {
  return [...plans]
    .filter((p) => ACTIVE_PLAN_STATUSES.has(p.status))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0]
}

/** The most recent plan of any status (used to detect a recorded outcome). */
export function getLatestPlan(plans: RecoveryPlan[]): RecoveryPlan | undefined {
  return [...plans].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0]
}

function hasEvent(events: AccountabilityEvent[], ...types: AccountabilityEvent['type'][]) {
  return events.some((e) => types.includes(e.type))
}

/**
 * Derive where a KPI sits in the accountability loop from its plans and events.
 * A KPI is "in the loop" once it has missed a target.
 */
export function deriveLoopStage(
  kpi: Pick<Kpi, 'status'>,
  plans: RecoveryPlan[],
  events: AccountabilityEvent[],
): LoopStage {
  const latest = getLatestPlan(plans)

  // Outcome recorded — the loop has closed on its most recent plan.
  if (latest && TERMINAL_PLAN_STATUSES.has(latest.status)) {
    // If the KPI recovered, it stays in Outcome; if a fresh plan is needed
    // after a failure, a newer active plan would have superseded `latest`.
    return 'outcome'
  }

  // A plan is live and executing.
  if (getActivePlan(plans)) return 'in-progress'

  // No active plan but the owner has been pushed to act (alert/escalation/
  // rejected plan / telegram ack) — they owe a plan.
  if (hasEvent(events, 'escalation', 'plan-rejected', 'telegram-response', 'check-in')) {
    return 'plan-needed'
  }

  // Miss detected and an alert was fired.
  if (hasEvent(events, 'miss')) return 'alerted'

  // Freshly missed, no activity yet.
  return 'missed'
}

export interface NextAction {
  /** Imperative label for the action this stage is waiting on. */
  label: string
  /** Whose move it is. */
  actor: 'owner' | 'ceo' | 'system'
  /** True when the current viewer is the one who must act. */
  forViewer: boolean
  /** Which interactive control to surface, if any. */
  cta?: 'draft-plan' | 'review-plan' | 'record-outcome'
}

interface ViewerCtx {
  role: UserRole
  isOwner: boolean
}

/** What the loop is waiting on next, and whether the current viewer owns it. */
export function nextActionFor(stage: LoopStage, ctx: ViewerCtx): NextAction {
  const isCeo = ctx.role === 'ceo'
  switch (stage) {
    case 'missed':
      return { label: 'Alerting owner via Telegram', actor: 'system', forViewer: false }
    case 'alerted':
    case 'plan-needed':
      return {
        label: ctx.isOwner ? 'Submit a recovery plan' : 'Owner to submit a recovery plan',
        actor: 'owner',
        forViewer: ctx.isOwner,
        cta: ctx.isOwner ? 'draft-plan' : undefined,
      }
    case 'in-progress':
      return {
        label: isCeo
          ? 'Review plan or send back'
          : ctx.isOwner
            ? 'Execute plan, then record outcome'
            : 'Plan executing',
        actor: isCeo ? 'ceo' : 'owner',
        forViewer: isCeo || ctx.isOwner,
        cta: isCeo ? 'review-plan' : ctx.isOwner ? 'record-outcome' : undefined,
      }
    case 'outcome':
      return { label: 'Outcome written to memory', actor: 'system', forViewer: false }
  }
}
