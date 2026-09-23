import { cn } from '@/lib/utils'
import type { Owner, InterventionStatus, SignalType } from '@/types/domain'
import { Badge } from '@/components/ui/badge'

/** Strategic takeaway banner — the first thing on every screen. */
export function TakeawayBanner({
  takeaway,
  summary,
  className,
}: {
  takeaway: string
  summary?: string
  className?: string
}) {
  return (
    <div className={cn('glass-card p-4 md:p-6', className)}>
      <h1 className="font-heading text-lg md:text-2xl font-semibold tracking-tight text-slate-950">{takeaway}</h1>
      {summary && <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">{summary}</p>}
    </div>
  )
}

export function OwnerChip({ owner, className }: { owner: Owner; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-slate-600', className)}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-700">
        {owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </span>
      <span className="font-medium text-slate-800">{owner.name}</span>
      <span className="text-slate-400">·</span>
      <span>{owner.role}</span>
    </span>
  )
}

export function ConfidenceBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pct >= 55 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-slate-50 text-slate-600 border-slate-200'
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', tone)}>
      {pct}% Confidence
    </Badge>
  )
}

const SIGNAL_TYPE_STYLES: Record<SignalType, { label: string; className: string }> = {
  risk: { label: 'Risk', className: 'bg-red-50 text-red-700 border-red-200' },
  opportunity: { label: 'Opportunity', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  change: { label: 'Trend Shift', className: 'bg-blue-50 text-blue-700 border-blue-200' },
}

export function SignalTypeBadge({ type }: { type: SignalType }) {
  const s = SIGNAL_TYPE_STYLES[type]
  return <Badge variant="outline" className={cn('text-[11px] font-medium', s.className)}>{s.label}</Badge>
}

const STATUS_STYLES: Record<InterventionStatus, { label: string; className: string }> = {
  'not-started': { label: 'Not Started', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'awaiting-review': { label: 'Awaiting Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'complete': { label: 'Complete', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'overdue': { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
}

export function InterventionStatusBadge({ status }: { status: InterventionStatus }) {
  const s = STATUS_STYLES[status]
  return <Badge variant="outline" className={cn('text-[11px] font-medium', s.className)}>{s.label}</Badge>
}

export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-slate-100', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all',
          pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-200'
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}
