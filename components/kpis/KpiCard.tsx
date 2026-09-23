'use client'
import Link from 'next/link'
import { ChevronRight, User2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { Kpi } from '@/types/kpi'
import { KpiStatusBadge } from './KpiStatusBadge'
import { AttainmentBar } from './AttainmentBar'
import { TrendSparkline } from '@/components/shared/TrendSparkline'
import { formatMonth, formatDelta } from '@/lib/format'
import { attainment } from '@/lib/attainment'
import { cn } from '@/lib/utils'

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const history = kpi.history ?? []
  const last = history[history.length - 1]
  const prev = history[history.length - 2]
  const period = last ? formatMonth(last.date) : null
  const awaiting = kpi.status === 'no-data' || !last
  const onTrack = kpi.status === 'on-track'

  const momPct = prev?.value ? Math.round(((last!.value - prev.value) / Math.abs(prev.value)) * 1000) / 10 : null
  const attain = attainment(kpi.currentValue, kpi.targetNumeric, kpi.targetDirection ?? 'above')
  const targetComparison = targetComparisonText(kpi.currentValue, kpi.targetNumeric, kpi.targetDirection ?? 'above', attain)
  const fillPct =
    kpi.targetDirection === 'below' && kpi.currentValue != null && kpi.targetNumeric
      ? (kpi.currentValue / kpi.targetNumeric) * 100
      : attain

  return (
    <Link
      href={`/kpis/${kpi.id}`}
      className={cn(
        'group flex flex-col rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
        awaiting ? 'border-slate-200' : onTrack ? 'border-slate-200' : 'border-red-200',
      )}
    >
      {/* name + period + clickable chevron */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{kpi.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-400">
            {awaiting ? 'Awaiting data' : `as of ${period}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <KpiStatusBadge status={kpi.status} />
          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </div>
      </div>

      {awaiting ? (
        <p className="mt-6 mb-1 text-sm text-slate-400">No data uploaded yet</p>
      ) : (
        <>
          {/* value + momentum */}
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-2xl font-semibold leading-none text-slate-950">{kpi.currentValueDisplay}</span>
            {momPct != null && (
              <span className={cn('flex items-center gap-0.5 text-xs font-medium', momPct >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {momPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {formatDelta(momPct)}<span className="font-normal text-slate-400"> MoM</span>
              </span>
            )}
          </div>

          {/* the industry-standard bit: progress toward target */}
          <AttainmentBar
            className="mt-3.5"
            attainmentPct={attain}
            onTrack={onTrack}
            label={`Target ${kpi.target}`}
            valueLabel={targetComparison}
            fillPct={fillPct}
          />

          {/* clean trend accent + owner */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
            <span className="flex items-center gap-1 text-xs text-slate-500"><User2 className="h-3 w-3" />{kpi.ownerName}</span>
            <div className="h-6 w-20 shrink-0"><TrendSparkline data={history} status={kpi.status} /></div>
          </div>
        </>
      )}
    </Link>
  )
}

function targetComparisonText(
  value: number | null | undefined,
  target: number | null | undefined,
  direction: 'above' | 'below',
  attainmentPct: number | null,
) {
  if (direction !== 'below') return attainmentPct == null ? undefined : `${Math.round(attainmentPct)}% of target`
  if (value == null || target == null || target === 0) return undefined
  if (value <= target) return 'Within target'

  const multiple = value / target
  return `${formatMultiple(multiple)} higher than target`
}

function formatMultiple(value: number) {
  if (value >= 10) return `${Math.round(value)}x`
  return `${Number(value.toFixed(1)).toString()}x`
}
