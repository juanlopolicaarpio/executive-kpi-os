'use client'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { KpiHealth } from '@/types/domain'
import { STATUS, CHROME } from '@/components/charts/viz'
import { cn } from '@/lib/utils'

/**
 * A single KPI is one number — so it's a stat tile, not a chart. Status is
 * carried by an icon + label + colour (never colour alone). The sparkline is
 * supporting texture only: no axes, no per-point labels.
 */
const STATUS_META = {
  healthy: { label: 'On track', color: STATUS.good, Icon: CheckCircle2, ring: 'ring-emerald-100' },
  watch: { label: 'Watch', color: STATUS.warning, Icon: AlertTriangle, ring: 'ring-amber-100' },
  attention: { label: 'Off target', color: STATUS.critical, Icon: AlertOctagon, ring: 'ring-red-100' },
} as const

export function KpiTile({ kpi, href }: { kpi: KpiHealth; href?: string }) {
  const meta = STATUS_META[kpi.status]
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const spark = kpi.sparkline.map((v, i) => ({ i, v }))

  const body = (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight text-slate-600">{kpi.metric}</p>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color: meta.color, background: `${meta.color}14` }}
        >
          <meta.Icon className="h-3 w-3" aria-hidden />
          {meta.label}
        </span>
      </div>

      {/* Hero figure: proportional figures, system sans — never tabular at display size. */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none text-slate-950">{kpi.valueDisplay}</p>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Target {kpi.targetDisplay}
            <span className="mx-1 text-slate-300">·</span>
            <span style={{ color: kpi.attainmentPct >= 100 ? STATUS.good : CHROME.secondary }}>
              {kpi.attainmentPct}%
            </span>
          </p>
        </div>
        {spark.length > 1 && (
          <div className="h-8 w-16 shrink-0" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line
                  type="monotone" dataKey="v" dot={false} isAnimationActive={false}
                  stroke={meta.color} strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <TrendIcon className="h-3 w-3" aria-hidden />
        <span className="truncate">{kpi.owner.name}</span>
      </div>
    </div>
  )

  return href ? <Link href={href} className="block">{body}</Link> : body
}
