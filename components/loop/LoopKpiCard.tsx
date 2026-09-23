'use client'
import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, Sparkles, PenLine, RotateCcw, CheckSquare, Clock, User2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DraftPlanDialog } from './DraftPlanDialog'
import { RejectPlanDialog } from './RejectPlanDialog'
import { RecordOutcomeDialog } from './RecordOutcomeDialog'
import type { LoopItem } from '@/hooks/useLoop'

interface Props {
  item: LoopItem
  /** Highlight the next-action CTA (used in the "Needs you" lane). */
  emphasize?: boolean
}

export function LoopKpiCard({ item, emphasize = false }: Props) {
  const { kpi, stage, activePlan, nextAction } = item
  const [draftOpen, setDraftOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [outcomeOpen, setOutcomeOpen] = useState(false)

  const cta = nextAction.cta

  return (
    <div className={cn('rounded-lg border bg-white p-3 shadow-sm', emphasize && 'ring-1 ring-blue-200')}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/kpis/${kpi.id}`} className="min-w-0 group">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">{kpi.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-red-600">{kpi.currentValueDisplay}</span> vs {kpi.target}
          </p>
        </Link>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
          {kpi.cadence}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {kpi.ownerName}</span>
        {activePlan && (
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(activePlan.targetDate), 'MMM d')}</span>
        )}
      </div>

      {/* Next action line */}
      <div className={cn(
        'mt-2.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs',
        nextAction.forViewer ? 'bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-500',
      )}>
        {nextAction.forViewer ? <ArrowRight className="h-3 w-3 shrink-0" /> : <Clock className="h-3 w-3 shrink-0" />}
        <span className="truncate">{nextAction.label}</span>
      </div>

      {/* CTA */}
      {cta && nextAction.forViewer && (
        <div className="mt-2">
          {cta === 'draft-plan' && (
            <Button size="sm" className="w-full gap-1.5" onClick={() => setDraftOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Draft recovery plan
            </Button>
          )}
          {cta === 'review-plan' && (
            <div className="flex gap-2">
              <Link href={`/kpis/${kpi.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 gap-1.5')}>
                <CheckSquare className="h-3.5 w-3.5" /> Review
              </Link>
              <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={() => setRejectOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Send back
              </Button>
            </div>
          )}
          {cta === 'record-outcome' && (
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setOutcomeOpen(true)}>
              <CheckSquare className="h-3.5 w-3.5" /> Record outcome
            </Button>
          )}
        </div>
      )}

      {stage === 'plan-needed' && !nextAction.forViewer && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-600">
          <PenLine className="h-3 w-3" /> Waiting on {kpi.ownerName}
        </p>
      )}

      {/* Dialogs — mounted only while open so each opening starts fresh */}
      {draftOpen && (
        <DraftPlanDialog
          kpi={kpi}
          open={draftOpen}
          onOpenChange={setDraftOpen}
          previousPlanIds={item.plans.filter((p) => p.status === 'rejected' || p.outcome === 'failed').map((p) => p.id)}
        />
      )}
      {activePlan && rejectOpen && <RejectPlanDialog plan={activePlan} open={rejectOpen} onOpenChange={setRejectOpen} />}
      {activePlan && outcomeOpen && (
        <RecordOutcomeDialog plan={activePlan} kpiName={kpi.name} open={outcomeOpen} onOpenChange={setOutcomeOpen} />
      )}
    </div>
  )
}
