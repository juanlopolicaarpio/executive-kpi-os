'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { KpiHealth } from '@/types/domain'
import { OwnerChip } from './primitives'

const STATUS_DOT: Record<KpiHealth['status'], string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  attention: 'bg-red-500',
}

export function KpiHealthCard({ kpi }: { kpi: KpiHealth }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const trendColor =
    kpi.status === 'attention' ? 'text-red-500'
    : kpi.trend === 'up' ? 'text-emerald-600'
    : kpi.trend === 'down' ? 'text-amber-600'
    : 'text-slate-400'
  const data = kpi.sparkline.map((v, i) => ({ i, v }))

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[kpi.status])} />
        <h3 className="font-heading text-sm font-semibold text-slate-950 leading-snug">{kpi.headline}</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">{kpi.metric}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-semibold tabular-nums text-slate-950">{kpi.valueDisplay}</span>
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Target {kpi.targetDisplay} · {kpi.attainmentPct}% attainment
          </p>
        </div>
        <div className="h-10 w-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={kpi.status === 'attention' ? '#ef4444' : '#10b981'}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <OwnerChip owner={kpi.owner} />
      </div>
    </div>
  )
}
