'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, BrainCircuit } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLoopStore } from '@/store/loopStore'
import { useSession } from '@/hooks/useSession'
import type { RecoveryPlan } from '@/types/accountability'

interface Props {
  plan: RecoveryPlan
  kpiName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Closes the loop: records whether the intervention worked and writes the
 * result into institutional memory so the playbook learns either way. */
export function RecordOutcomeDialog({ plan, kpiName, open, onOpenChange }: Props) {
  const { user, role } = useSession()
  const recordOutcome = useLoopStore((s) => s.recordOutcome)
  const [outcome, setOutcome] = useState<'resolved' | 'failed' | null>(null)
  const [notes, setNotes] = useState('')

  const handleSave = () => {
    if (!outcome) {
      toast.error('Pick whether the plan worked.')
      return
    }
    if (notes.trim().length < 5) {
      toast.error('Add a short note on what happened — this becomes the learning.')
      return
    }
    recordOutcome(plan.id, outcome, notes.trim(), { id: user.id, name: user.name, role })
    toast.success(
      outcome === 'resolved'
        ? 'Outcome recorded. Saved to the playbook as what worked.'
        : 'Outcome recorded. Captured so the playbook avoids repeating it.',
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record outcome — {kpiName}</DialogTitle>
          <DialogDescription>
            Did this recovery plan work? Either way, the result is written to institutional memory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOutcome('resolved')}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
              outcome === 'resolved' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <CheckCircle2 className={cn('h-5 w-5', outcome === 'resolved' ? 'text-emerald-600' : 'text-slate-400')} />
            <span className="text-sm font-medium">It worked</span>
            <span className="text-[11px] text-muted-foreground">KPI back on track</span>
          </button>
          <button
            onClick={() => setOutcome('failed')}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
              outcome === 'failed' ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <XCircle className={cn('h-5 w-5', outcome === 'failed' ? 'text-red-600' : 'text-slate-400')} />
            <span className="text-sm font-medium">It didn&apos;t work</span>
            <span className="text-[11px] text-muted-foreground">Needs a new plan</span>
          </button>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            outcome === 'failed'
              ? 'What went wrong? This is saved so the same approach is not repeated.'
              : 'What drove the recovery? This is saved as a proven play.'
          }
          rows={3}
        />

        <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500">
          <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {plan.sourcePlaybookId
            ? 'This updates the success rate of the playbook this plan came from.'
            : 'This is saved as a new learning in the playbook library.'}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!outcome}>Save to memory</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
