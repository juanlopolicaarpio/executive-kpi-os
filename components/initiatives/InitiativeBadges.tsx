'use client'
import {
  CircleDashed,
  PlayCircle,
  CheckCircle2,
  FileText,
  Archive,
  XCircle,
  ShieldCheck,
  Hourglass,
  Search,
  Ban,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, TYPE_LABELS, PRIORITY_LABELS } from '@/lib/initiatives/lifecycle'
import type {
  InitiativeStatus,
  InitiativeType,
  InitiativePriority,
  GoalAchieved,
} from '@/types/initiative'

// Small status vocabulary shared by the cards, the board, and the detail page.
// Status is always text + icon + colour, never colour alone (PRD §4.2).

const STATUS_STYLE: Record<InitiativeStatus, { cls: string; Icon: React.ElementType }> = {
  draft: { cls: 'bg-slate-100 text-slate-600', Icon: CircleDashed },
  'pending-approval': { cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', Icon: Hourglass },
  approved: { cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', Icon: ShieldCheck },
  active: { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', Icon: PlayCircle },
  completed: { cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', Icon: CheckCircle2 },
  'results-submitted': { cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', Icon: FileText },
  'under-review': { cls: 'bg-violet-50 text-violet-800 ring-1 ring-violet-300', Icon: Search },
  closed: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', Icon: Archive },
  rejected: { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', Icon: Ban },
  cancelled: { cls: 'bg-slate-100 text-slate-500', Icon: XCircle },
}

export function StatusBadge({ status, className }: { status: InitiativeStatus; className?: string }) {
  const { cls, Icon } = STATUS_STYLE[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function TypeBadge({ type, className }: { type: InitiativeType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600',
        // Recovery initiatives are reactive — flag them so they read differently
        // from work the team chose to do.
        type === 'recovery' && 'bg-red-50 text-red-700 ring-1 ring-red-200',
        className,
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  )
}

const PRIORITY_STYLE: Record<InitiativePriority, string> = {
  low: 'text-slate-400',
  medium: 'text-slate-500',
  high: 'text-orange-600',
  critical: 'text-red-600',
}

export function PriorityLabel({ priority }: { priority: InitiativePriority }) {
  if (priority === 'low' || priority === 'medium') return null
  return (
    <span className={cn('text-[11px] font-semibold uppercase tracking-wide', PRIORITY_STYLE[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

const GOAL_STYLE: Record<GoalAchieved, { cls: string; label: string }> = {
  yes: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'Goal achieved' },
  partial: { cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', label: 'Partially achieved' },
  no: { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', label: 'Goal missed' },
}

export function GoalBadge({ goal }: { goal: GoalAchieved }) {
  const { cls, label } = GOAL_STYLE[goal]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>
      {label}
    </span>
  )
}

/** ROI, coloured by sign. Null renders nothing — never a fake zero. */
export function RoiBadge({ roi, className }: { roi?: number | null; className?: string }) {
  if (roi == null) return null
  const positive = roi >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {positive ? '+' : '−'}
      {Math.abs(roi).toFixed(0)}% ROI
    </span>
  )
}
