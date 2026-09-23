'use client'
import type { PlatformPerformance } from '@/types/domain'
import { formatPeso, formatDelta } from '@/lib/format'
import { PLATFORM_COLOR, PLATFORM_LABEL, CHROME } from './viz'

/**
 * Latest-month sales by platform. Magnitude comparison across 3 named entities →
 * horizontal bars, one hue per platform (fixed, never re-assigned on filter).
 * Every bar is DIRECTLY LABELLED with its value, which is also the required
 * relief for the sub-3:1 aqua/yellow hues — identity is never colour-alone.
 */
export function ChannelMixChart({ data }: { data: PlatformPerformance[] }) {
  const rows = [...data].sort((a, b) => b.sales30d - a.sales30d)
  const max = Math.max(...rows.map((r) => r.sales30d), 1)
  const total = rows.reduce((a, r) => a + r.sales30d, 0) || 1

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round((r.sales30d / total) * 100)
        return (
          <div key={r.platform}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: PLATFORM_COLOR[r.platform] }}
                />
                {PLATFORM_LABEL[r.platform] ?? r.platform}
              </span>
              {/* direct label — value never lives only in a tooltip */}
              <span className="text-sm font-semibold text-slate-900">
                {formatPeso(r.sales30d)}
                <span className="ml-1.5 text-xs font-normal text-slate-400">{pct}%</span>
              </span>
            </div>

            <div className="mt-1.5 h-2 w-full rounded-full" style={{ background: CHROME.grid }}>
              <div
                className="h-2 rounded-full"
                style={{ width: `${(r.sales30d / max) * 100}%`, background: PLATFORM_COLOR[r.platform] }}
              />
            </div>

            <p className="mt-1 text-xs text-slate-500">
              <span className={r.growthPct >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                {formatDelta(r.growthPct)} MoM
              </span>
              {' · '}{r.conversionPct}% conversion
              {' · '}{(r.traffic30d / 1000).toFixed(0)}K sessions
            </p>
          </div>
        )
      })}
    </div>
  )
}
