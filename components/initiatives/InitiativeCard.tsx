'use client'
import Link from 'next/link'
import {
  CalendarDays,
  User2,
  Target,
  Wallet,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  LayoutTemplate,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPeso, formatDay } from '@/lib/format'
import { progressPct, budgetUsedPct, isOverdue, nextActionFor } from '@/lib/initiatives/lifecycle'
import { StatusBadge, TypeBadge, PriorityLabel, RoiBadge } from './InitiativeBadges'
import type { Initiative } from '@/types/initiative'
import type { PrdRole } from '@/lib/permissions/capabilities'

interface Props {
  initiative: Initiative
  viewer: { memberId: string; role: PrdRole }
  /** Highlight when this card is what the viewer must act on. */
  emphasize?: boolean
}

/**
 * The lightweight initiative card from the spec: name, status, owner,
 * department, timeline, budget, target KPIs — and, once closed, the ROI that
 * makes it worth remembering.
 */
export function InitiativeCard({ initiative, viewer, emphasize }: Props) {
  const progress = progressPct(initiative)
  const budgetUsed = budgetUsedPct(initiative)
  const overdue = isOverdue(initiative)
  const next = nextActionFor(initiative, viewer)
  const roi = initiative.results?.roi

  return (
    <Link
      href={`/initiatives/${initiative.id}`}
      className={cn(
        'group flex flex-col rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
        emphasize ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200',
        overdue && 'border-orange-300',
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <PriorityLabel priority={initiative.priority} />
            <p className="truncate text-sm font-semibold text-slate-900">{initiative.name}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={initiative.status} />
            <TypeBadge type={initiative.initiativeType} />
            {initiative.sourceType === 'ai' && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-200">
                <Sparkles className="h-2.5 w-2.5" aria-hidden /> AI
              </span>
            )}
            {initiative.sourceType === 'template' && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                <LayoutTemplate className="h-2.5 w-2.5" aria-hidden /> Template
              </span>
            )}
            <RoiBadge roi={roi} />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </div>

      {/* Meta */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <User2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <dt className="sr-only">Owner</dt>
          <dd className="truncate">{initiative.ownerName ?? 'Unassigned'}</dd>
        </div>
        {(initiative.startDate || initiative.endDate) && (
          <div className="col-span-2 flex items-center gap-1.5 truncate">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <dt className="sr-only">Timeline</dt>
            <dd className={cn('truncate', overdue && 'font-medium text-orange-700')}>
              {initiative.startDate ? formatDay(initiative.startDate) : '—'}
              {initiative.endDate ? ` → ${formatDay(initiative.endDate)}` : ''}
              {overdue && ' · overdue'}
            </dd>
          </div>
        )}
        {(initiative.approvedBudget ?? initiative.totalBudget) != null && (
          <div className="col-span-2 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <dt className="sr-only">Budget</dt>
            <dd className="flex flex-wrap items-center gap-1">
              {initiative.approvedBudget == null ? (
                // Nothing is approved yet, so "spent of budget" would imply a
                // ceiling that does not exist. Show what was requested instead.
                <span>
                  {formatPeso(initiative.totalBudget ?? 0)}
                  <span className="text-slate-400"> requested</span>
                </span>
              ) : (
                <span>
                  {formatPeso(initiative.results?.actualSpend ?? initiative.actualSpend ?? 0)}
                  <span className="text-slate-400">
                    {' of '}
                    {formatPeso(initiative.approvedBudget)}
                  </span>
                </span>
              )}
              {initiative.autoApproved && (
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700">
                  <ShieldCheck className="h-2.5 w-2.5" aria-hidden /> auto-approved
                </span>
              )}
              {budgetUsed != null && budgetUsed > 100 && (
                <span className="font-medium text-red-600">· {budgetUsed}% of budget</span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {/* Master KPI + Project KPI summary (§7.1) */}
      <div className="mt-3 space-y-1.5">
        {initiative.masterKpiName ? (
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] text-white">
              {initiative.masterKpiName}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">master</span>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            No Master KPI — this cannot be submitted
          </p>
        )}

        {initiative.projectKpis.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {initiative.projectKpis.slice(0, 3).map((k) => (
              <span
                key={k.id}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
              >
                {k.name}
              </span>
            ))}
            {initiative.projectKpis.length > 3 && (
              <span className="text-[11px] text-slate-400">
                +{initiative.projectKpis.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Manual progress — only while the work is actually in flight */}
      {initiative.status === 'active' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', overdue ? 'bg-orange-500' : 'bg-blue-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {progress}% complete
            {initiative.latestUpdateAt ? ` · updated ${formatDay(initiative.latestUpdateAt)}` : ' · no updates yet'}
          </p>
        </div>
      )}

      {/* What this is waiting on */}
      {next.forViewer && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs font-medium text-blue-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {next.label}
        </p>
      )}
    </Link>
  )
}
