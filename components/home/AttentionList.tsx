'use client'
import Link from 'next/link'
import {
  AlertOctagon,
  FileCheck2,
  ShieldQuestion,
  CalendarX,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AttentionItem } from '@/app/api/home/route'

// PRD §5.5. Each item gets ONE clear primary action; the sort is done
// server-side so Home and notifications cannot disagree about what is urgent.

const META: Record<
  AttentionItem['type'],
  { Icon: React.ElementType; tint: string; label: string }
> = {
  'approval-request': { Icon: ShieldQuestion, tint: 'text-blue-600', label: 'Approval' },
  'results-due': { Icon: FileCheck2, tint: 'text-blue-600', label: 'Results due' },
  'review-due': { Icon: FileCheck2, tint: 'text-blue-600', label: 'Review due' },
  'kpi-off-track': { Icon: AlertOctagon, tint: 'text-red-600', label: 'Off target' },
  'initiative-overdue': { Icon: CalendarX, tint: 'text-orange-600', label: 'Overdue' },
}

export function AttentionList({
  items,
  total,
}: {
  items: AttentionItem[]
  total: number
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 py-8 text-center">
        <p className="text-sm text-slate-500">Nothing needs attention right now.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const { Icon, tint, label } = META[item.type]
        const showAction = item.primaryAction.trim().toLowerCase() !== item.detail.trim().toLowerCase()
        return (
          <Link
            key={item.id}
            href={item.link}
            className={cn(
              'group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors',
              item.requiresYou
                ? 'border-blue-300 ring-1 ring-blue-100 hover:bg-blue-50/40'
                : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', tint)} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium text-slate-900">{item.title}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    item.requiresYou ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {item.requiresYou ? 'Needs you' : label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{item.detail}</span>
            </span>
            {showAction ? (
              <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-slate-900 sm:flex">
                {item.primaryAction}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : (
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block" aria-hidden />
            )}
          </Link>
        )
      })}

      {total > items.length && (
        <p className="pt-1 text-center text-xs text-slate-400">
          Showing {items.length} of {total} items needing attention
        </p>
      )}
    </div>
  )
}
