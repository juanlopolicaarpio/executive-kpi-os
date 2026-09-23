'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useLoopStore } from '@/store/loopStore'
import { useSession } from '@/hooks/useSession'
import type { RecoveryPlan } from '@/types/accountability'

interface Props {
  plan: RecoveryPlan
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** CEO oversight: send a live plan back for revision (non-blocking — this is
 * the only way the loop ever moves backwards, from In Progress to Plan Needed). */
export function RejectPlanDialog({ plan, open, onOpenChange }: Props) {
  const { user, role } = useSession()
  const rejectPlan = useLoopStore((s) => s.rejectPlan)
  const [reason, setReason] = useState('')

  const handleReject = () => {
    if (reason.trim().length < 5) {
      toast.error('Add a reason so the owner knows what to change.')
      return
    }
    rejectPlan(plan.id, reason.trim(), { id: user.id, name: user.name, role })
    toast.success('Plan sent back. The KPI returns to “Plan Needed”.')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send plan back for revision</DialogTitle>
          <DialogDescription>
            The owner ({plan.ownerName}) will be asked to submit a revised plan. Tell them what needs to change.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. The root cause is right but the actions don't address pricing — add a margin-safe response."
          rows={3}
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleReject}>Send back</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
