'use client'
import { AlertTriangle, CheckCircle2, AlertOctagon, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDay } from '@/lib/format'
import type { KpiStatusValue } from '@/lib/kpi/status'

interface Props {
  score: number | null
  band: string
  bandStatus: KpiStatusValue
  includedCount: number
  excludedCount: number
  counts: Record<KpiStatusValue, number>
  asOf: string | null
  staleCount: number
  staleKpis: string[]
  activeFilter: KpiStatusValue | null
  onFilter: (status: KpiStatusValue | null) => void
}

const BAND_RING: Record<KpiStatusValue, string> = {
  'on-track': 'text-emerald-600',
  'at-risk': 'text-amber-600',
  'off-track': 'text-red-600',
  'no-data': 'text-slate-400',
}

const COUNT_META: { key: KpiStatusValue; label: string; Icon: React.ElementType; color: string }[] = [
  { key: 'on-track', label: 'On Track', Icon: CheckCircle2, color: 'text-emerald-600' },
  { key: 'at-risk', label: 'At Risk', Icon: AlertTriangle, color: 'text-amber-600' },
  { key: 'off-track', label: 'Off Track', Icon: AlertOctagon, color: 'text-red-600' },
  { key: 'no-data', label: 'No Data', Icon: CircleDashed, color: 'text-slate-400' },
]

export function HealthSummary({
  score,
  band,
  bandStatus,
  includedCount,
  excludedCount,
  counts,
  asOf,
  activeFilter,
  onFilter,
}: Props) {
  const pct = score ?? 0
  const circumference = 2 * Math.PI * 26

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" role="img" aria-label={`KPI health score ${score ?? 'unavailable'}`}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
            {score != null && (
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
                className={BAND_RING[bandStatus]}
              />
            )}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums text-slate-950">
            {score ?? '-'}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            KPI Health <span className="text-slate-300">|</span> <span className={BAND_RING[bandStatus]}>{band}</span>
          </p>
          <p className="text-xs text-slate-500">
            {includedCount} KPI{includedCount === 1 ? '' : 's'} included
            {excludedCount > 0 && ` | ${excludedCount} excluded for having no data`}
          </p>
          {asOf && <p className="mt-0.5 text-[11px] text-slate-400">Data as of {formatDay(asOf)}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {COUNT_META.map(({ key, label, Icon, color }) => {
          const isActive = activeFilter === key
          return (
            <button
              key={key}
              onClick={() => onFilter(isActive ? null : key)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : color)} aria-hidden />
              <span className="font-semibold tabular-nums">{counts[key]}</span>
              <span className={cn(isActive ? 'text-slate-200' : 'text-slate-500')}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
