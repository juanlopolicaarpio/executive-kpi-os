'use client'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import type { DailySales } from '@/types/domain'
import { formatMonth, formatMonthShort, formatPeso } from '@/lib/format'
import { SERIES, CHROME } from './viz'

/**
 * Monthly net sales against target. ONE axis, one series — so no legend box is
 * needed (the title names it); the target is a directly-labelled reference line
 * rather than a second series. Hairline solid grid, thin 2px mark, hover tooltip.
 */
export function SalesTrendChart({ data }: { data: DailySales[] }) {
  if (!data.length) return null
  const target = data[data.length - 1]?.target ?? 0
  const rows = data.map((d) => ({ date: d.date, sales: d.totalSales }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 64, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES.shopee} stopOpacity={0.16} />
              <stop offset="100%" stopColor={SERIES.shopee} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={CHROME.grid} strokeWidth={1} vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatMonthShort(d)}
            tick={{ fontSize: 11, fill: CHROME.muted }}
            axisLine={{ stroke: CHROME.axis }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => formatPeso(v)}
            tick={{ fontSize: 11, fill: CHROME.muted }}
            axisLine={false}
            tickLine={false}
            width={56}
          />

          <Tooltip
            cursor={{ stroke: CHROME.axis, strokeWidth: 1 }}
            formatter={(v: unknown) => [formatPeso(Number(v)), 'Net sales']}
            labelFormatter={(d) => formatMonth(String(d))}
            contentStyle={{ borderRadius: 8, border: `1px solid ${CHROME.grid}`, fontSize: 12 }}
          />

          {/* Target as a directly-labelled threshold, not a second series. */}
          <ReferenceLine
            y={target}
            stroke={CHROME.axis}
            strokeWidth={1}
            label={{
              value: `Target ${formatPeso(target)}`,
              position: 'right',
              fill: CHROME.secondary,
              fontSize: 11,
            }}
          />

          <Area
            type="monotone"
            dataKey="sales"
            stroke={SERIES.shopee}
            strokeWidth={2}
            fill="url(#salesFill)"
            isAnimationActive={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
