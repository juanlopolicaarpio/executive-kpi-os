import { ArrowDown } from 'lucide-react'
import type { Signal } from '@/types/domain'
import { ConfidenceBadge, OwnerChip, SignalTypeBadge } from './primitives'

/**
 * Universal Intervention Rule: every signal renders the full chain
 * Observation → Implication → Intervention → Owner → Expected Outcome.
 */
export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-slate-950 leading-snug min-w-0 flex-1">
          {signal.headline}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <SignalTypeBadge type={signal.type} />
          <ConfidenceBadge pct={signal.confidencePct} />
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <ChainStep label="Observation" text={signal.observation} />
        <ChainStep label="Implication" text={signal.implication} />
        <ChainStep label="Recommended Intervention" text={signal.recommendedIntervention} emphasized />
        <ChainStep label="Expected Outcome" text={signal.expectedOutcome} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <OwnerChip owner={signal.owner} />
        {signal.relatedKpi && (
          <span className="text-[11px] text-slate-400">Linked KPI: {signal.relatedKpi}</span>
        )}
      </div>
    </div>
  )
}

function ChainStep({ label, text, emphasized }: { label: string; text: string; emphasized?: boolean }) {
  return (
    <div className="flex gap-3">
      <ArrowDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <p className={emphasized ? 'text-slate-900 font-medium leading-relaxed' : 'text-slate-600 leading-relaxed'}>
          {text}
        </p>
      </div>
    </div>
  )
}
