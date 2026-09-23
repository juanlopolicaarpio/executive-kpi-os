import { cn } from '@/lib/utils'

/**
 * A bullet-style progress-to-target meter — the industry standard (Stephen Few's
 * bullet chart) for "where am I vs target." The fill is the actual as a share of
 * the 0→target track; a tick marks 100% (target). Green when at/over target, red
 * when short. Direction is already baked into `attainmentPct` by the caller.
 */
export function AttainmentBar({
  attainmentPct,
  onTrack,
  label,
  valueLabel,
  fillPct,
  className,
}: {
  attainmentPct: number | null
  onTrack: boolean
  label?: string
  valueLabel?: string
  fillPct?: number | null
  className?: string
}) {
  if (attainmentPct == null) return null
  const color = onTrack ? '#0ca30c' : '#d03b3b'
  // The track shows 0→target. Cap the fill at the tick; overachievement reads as
  // a full green bar (the tick sits at the end).
  const fill = Math.max(0, Math.min(fillPct ?? attainmentPct, 100))

  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[11px] text-slate-500">{label}</span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
            {valueLabel ?? `${Math.round(attainmentPct)}% of target`}
          </span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: '#ecebe6' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${fill}%`, background: color }} />
        {/* target tick at 100% */}
        <div className={cn('absolute top-0 h-full w-px', 'bg-slate-400/70')} style={{ left: 'calc(100% - 1px)' }} />
      </div>
    </div>
  )
}
