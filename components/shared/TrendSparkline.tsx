'use client'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import type { KpiDataPoint } from '@/types/kpi'

interface Props {
  data: KpiDataPoint[]
  status: string
  height?: number
}

const STATUS_COLOR: Record<string, string> = {
  'on-track': '#0ca30c',
  'off-track': '#d03b3b',
  'not-started': '#898781',
  'pending-data': '#898781',
}

/** A clean single-line trend accent — direction over recent periods, nothing
 *  more. Vs-target is carried by the AttainmentBar, so this stays uncluttered. */
export function TrendSparkline({ data, status, height = 28 }: Props) {
  const rows = data.slice(-12)
  if (rows.length < 2) return null
  const color = STATUS_COLOR[status] ?? '#898781'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sk-${status}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#sk-${status})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
