'use client'
import { useState } from 'react'
import { Loader2, ShieldCheck, Undo2, Archive, Ban } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPeso } from '@/lib/format'
import { useInitiativeAction, useReviewResults } from '@/hooks/useInitiatives'
import { GoalBadge, RoiBadge } from './InitiativeBadges'
import type { Initiative } from '@/types/initiative'

interface BaseProps {
  initiative: Initiative
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The pre-execution approval gate (PRD §11.4). This one BLOCKS: nothing runs
 * until the approver approves and the owner starts. Rejecting and requesting a
 * revision both require a comment, which is recorded in the decision trail.
 */
export function ApprovalDialog({ initiative, open, onOpenChange }: BaseProps) {
  const action = useInitiativeAction()
  const [comment, setComment] = useState('')

  const run = async (kind: 'approve' | 'request-revision' | 'reject') => {
    if (kind !== 'approve' && !comment.trim()) return
    await action.mutateAsync({ id: initiative.id, action: kind, comment: comment.trim() || undefined })
    setComment('')
    onOpenChange(false)
  }

  const money = (v?: number) => (v == null ? '—' : formatPeso(v))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Approve — {initiative.name}</DialogTitle>
          <DialogDescription>
            Execution cannot begin until this is approved. Approving lets the owner start; it does
            not start the work itself.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3 text-xs">
          <div>
            <dt className="text-slate-500">Owner</dt>
            <dd className="font-medium text-slate-900">{initiative.ownerName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Requested budget</dt>
            <dd className="font-medium tabular-nums text-slate-900">
              {money(initiative.approvedBudget)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Target KPIs</dt>
            <dd className="font-medium text-slate-900">
              {initiative.targetKpis.map((k) => k.name ?? k.kpiSlug).join(', ') || '— none linked'}
            </dd>
          </div>
        </dl>

        {initiative.targetKpis.length === 0 && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            This initiative has no target KPI, so its impact cannot be evaluated at closure.
            Consider requesting a revision.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="approval-comment">Comment</Label>
          <Textarea
            id="approval-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional when approving. Required when rejecting or requesting a revision."
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={action.isPending}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => run('reject')}
            disabled={action.isPending || !comment.trim()}
          >
            <Ban className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            variant="outline"
            onClick={() => run('request-revision')}
            disabled={action.isPending || !comment.trim()}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Request revision
          </Button>
          <Button onClick={() => run('approve')} disabled={action.isPending}>
            {action.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The manager's review of submitted results — the one genuinely blocking gate.
 * Approving closes the initiative and writes it to institutional memory.
 */
export function ReviewResultsDialog({ initiative, open, onOpenChange }: BaseProps) {
  const review = useReviewResults()
  const [notes, setNotes] = useState('')
  const r = initiative.results

  const run = async (approve: boolean) => {
    if (!approve && !notes.trim()) return
    await review.mutateAsync({ id: initiative.id, approve, reviewNotes: notes.trim() || undefined })
    setNotes('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review results — {initiative.name}</DialogTitle>
          <DialogDescription>
            Approving closes this initiative and files it as a business case the AI learns from.
          </DialogDescription>
        </DialogHeader>

        {r ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <GoalBadge goal={r.goalAchieved} />
              <RoiBadge roi={r.roi} />
              {r.roas != null && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                  {r.roas.toFixed(2)}x ROAS
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3 text-xs">
              <div>
                <dt className="text-slate-500">Actual spend</dt>
                <dd className="font-medium tabular-nums text-slate-900">{formatPeso(r.actualSpend)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Revenue generated</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {r.revenueGenerated != null ? formatPeso(r.revenueGenerated) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Incremental revenue</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {r.incrementalRevenue != null ? formatPeso(r.incrementalRevenue) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Incremental profit</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {r.incrementalProfit != null ? formatPeso(r.incrementalProfit) : '—'}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-medium text-slate-700">Business results</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.businessResults}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">Lessons learned</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.lessonsLearned}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No results have been submitted yet.</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="review-notes">Review notes</Label>
          <Textarea
            id="review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional when approving. Required when sending back."
            rows={2}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={review.isPending}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => run(false)}
            disabled={review.isPending || !notes.trim()}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Send back
          </Button>
          <Button onClick={() => run(true)} disabled={review.isPending || !r}>
            {review.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Approve &amp; close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
