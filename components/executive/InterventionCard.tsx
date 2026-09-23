import { format, parseISO } from 'date-fns'
import { CalendarDays, Target, CheckCircle2 } from 'lucide-react'
import type { Intervention } from '@/types/domain'
import { InterventionStatusBadge, OwnerChip, ProgressBar } from './primitives'

export function InterventionCard({ intervention }: { intervention: Intervention }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold text-slate-950 leading-snug">
            {intervention.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{intervention.issue}</p>
        </div>
        <InterventionStatusBadge status={intervention.status} />
      </div>

      <div className="mt-4">
        <ProgressBar pct={intervention.progressPct} />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>{intervention.progressPct}% complete</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Due {format(parseISO(intervention.dueDate), 'MMM d')}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <p className="flex items-start gap-1.5 text-slate-600">
          <Target className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <span><span className="font-medium text-slate-700">Expected:</span> {intervention.expectedOutcome}</span>
        </p>
        {intervention.actualOutcome && (
          <p className="flex items-start gap-1.5 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            <span><span className="font-medium">Actual:</span> {intervention.actualOutcome}</span>
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <OwnerChip owner={intervention.owner} />
      </div>
    </div>
  )
}
