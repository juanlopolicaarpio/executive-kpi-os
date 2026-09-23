'use client'
import { useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts'
import { SERIES, CHROME, PLATFORM_COLOR } from '@/components/charts/viz'
import { formatMonth, formatMonthShort } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface DrillData {
  meta: {
    slug: string; name: string; unit: string; target: number | null
    direction: string; rhythm: string; ownerName: string; formula: string | null; hasData: boolean
  }
  series: { period: string; date: string; value: number; target: number | null; status: string }[]
  byPlatform: Record<string, { period: string; value: number }[]>
  latestByPlatform: { platform: string; value: number }[]
  competitors: { brand: string; sharePct: number }[]
  brands: { brand: string; sharePct: number }[]
}

const PLAT_KEY: Record<string, string> = { Shopee: 'shopee', Lazada: 'lazada', Tiktok: 'tiktok-shop' }

function fmt(v: number, unit: string) {
  if (unit === 'currency') return v >= 1_000_000 ? `₱${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `₱${(v / 1000).toFixed(1)}K` : `₱${Math.round(v)}`
  if (unit === 'percentage') return `${v.toFixed(1)}%`
  if (unit === 'number') return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
  return String(v)
}

type Tab = 'trend' | 'platform' | 'table'

export function KpiDrilldown({ data }: { data: DrillData }) {
  const [tab, setTab] = useState<Tab>('trend')
  const { meta, series, byPlatform, latestByPlatform, competitors, brands } = data
  const unit = meta.unit
  const hasPlatform = Object.keys(byPlatform).length > 0
  const isShare = competitors.length > 0 || brands.length > 0

  if (!meta.hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-10 text-center">
        <p className="text-sm font-semibold text-slate-800">Awaiting data</p>
        <p className="mt-1 text-xs text-slate-500">
          {meta.formula ? `Computed as: ${meta.formula}. ` : ''}Upload the source file and this KPI goes live.
        </p>
      </div>
    )
  }

  // Merge per-platform series into one row per period for a multi-series chart.
  const periods = series.map((s) => s.period)
  const platformRows = periods.map((p) => {
    const row: Record<string, string | number> = { period: p }
    for (const [label, pts] of Object.entries(byPlatform)) {
      const hit = pts.find((x) => x.period === p)
      if (hit) row[label] = hit.value
    }
    return row
  })
  const platformLabels = Object.keys(byPlatform)

  const TABS: { id: Tab; label: string; show: boolean }[] = [
    { id: 'trend', label: 'Trend', show: true },
    { id: 'platform', label: 'By platform', show: hasPlatform },
    { id: 'table', label: 'Table', show: true },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* One filter row, above what it scopes */}
      <div className="flex gap-1 border-b border-slate-100 p-2">
        {TABS.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* TREND — one axis, one series, target as a labelled threshold */}
        {tab === 'trend' && (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 60, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="kpiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES.shopee} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={SERIES.shopee} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHROME.grid} vertical={false} />
                <XAxis dataKey="period" tickFormatter={(p: string) => formatMonthShort(`${p}-01`)}
                  tick={{ fontSize: 11, fill: CHROME.muted }} axisLine={{ stroke: CHROME.axis }} tickLine={false} minTickGap={28} />
                <YAxis tickFormatter={(v: number) => fmt(v, unit)} tick={{ fontSize: 11, fill: CHROME.muted }}
                  axisLine={false} tickLine={false} width={62} />
                <Tooltip
                  cursor={{ stroke: CHROME.axis, strokeWidth: 1 }}
                  formatter={(v: unknown) => [fmt(Number(v), unit), meta.name]}
                  labelFormatter={(p) => formatMonth(`${p}-01`)}
                  contentStyle={{ borderRadius: 8, border: `1px solid ${CHROME.grid}`, fontSize: 12 }}
                />
                {meta.target != null && (
                  <ReferenceLine y={meta.target} stroke={CHROME.axis} strokeWidth={1}
                    label={{ value: `Target ${fmt(meta.target, unit)}`, position: 'right', fill: CHROME.secondary, fontSize: 11 }} />
                )}
                <Area type="monotone" dataKey="value" stroke={SERIES.shopee} strokeWidth={2}
                  fill="url(#kpiFill)" isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* BY PLATFORM — ≥2 series, so a legend is always present */}
        {tab === 'platform' && (
          <div className="space-y-5">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={platformRows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke={CHROME.grid} vertical={false} />
                  <XAxis dataKey="period" tickFormatter={(p: string) => formatMonthShort(`${p}-01`)}
                    tick={{ fontSize: 11, fill: CHROME.muted }} axisLine={{ stroke: CHROME.axis }} tickLine={false} minTickGap={28} />
                  <YAxis tickFormatter={(v: number) => fmt(v, unit)} tick={{ fontSize: 11, fill: CHROME.muted }}
                    axisLine={false} tickLine={false} width={62} />
                  <Tooltip
                    formatter={(v: unknown, n: unknown) => [fmt(Number(v), unit), String(n)]}
                    labelFormatter={(p) => formatMonth(`${p}-01`)}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${CHROME.grid}`, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {platformLabels.map((label) => (
                    <Line key={label} type="monotone" dataKey={label} name={label}
                      stroke={PLATFORM_COLOR[PLAT_KEY[label] ?? ''] ?? SERIES.shopee}
                      strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Latest split — direct labels (the relief rule for sub-3:1 hues) */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">
                Latest ({series.length ? formatMonth(`${series[series.length - 1]!.period}-01`) : '—'})
              </p>
              <BarList
                rows={latestByPlatform.map((p) => ({
                  label: p.platform, value: p.value,
                  color: PLATFORM_COLOR[PLAT_KEY[p.platform] ?? ''] ?? SERIES.shopee,
                }))}
                unit={unit}
              />
            </div>
          </div>
        )}

        {/* TABLE — the WCAG-clean twin; every value readable without hover */}
        {tab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-4 font-medium">Period</th>
                  <th className="py-2 pr-4 font-medium">Value</th>
                  <th className="py-2 pr-4 font-medium">Target</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...series].reverse().map((s) => (
                  <tr key={s.period} className="border-b border-slate-50">
                    <td className="py-2 pr-4 text-slate-700">{formatMonth(`${s.period}-01`)}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{fmt(s.value, unit)}</td>
                    <td className="py-2 pr-4 text-slate-500">{s.target != null ? fmt(s.target, unit) : '—'}</td>
                    <td className="py-2">
                      <span className={cn('text-xs font-medium', s.status === 'on_track' ? 'text-emerald-700' : 'text-red-600')}>
                        {s.status === 'on_track' ? 'On track' : 'Off target'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optional split views for market, product or partner contribution data. */}
      {isShare && tab !== 'table' && (
        <div className="grid grid-cols-1 gap-6 border-t border-slate-100 p-4 md:grid-cols-2">
          {competitors.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium text-slate-500">Category leaders</p>
              <BarList rows={competitors.map((c) => ({ label: c.brand, value: c.sharePct, color: CHROME.axis }))} unit="percentage" />
            </div>
          )}
          {brands.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium text-slate-500">Contributing lines</p>
              <BarList rows={brands.map((b) => ({ label: b.brand, value: b.sharePct, color: SERIES.lazada }))} unit="percentage" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BarList({ rows, unit }: { rows: { label: string; value: number; color: string }[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-slate-700">{r.label}</span>
            {/* direct label — never colour-alone, never tooltip-only */}
            <span className="shrink-0 text-sm font-semibold text-slate-900">{fmt(r.value, unit)}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full" style={{ background: CHROME.grid }}>
            <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}
