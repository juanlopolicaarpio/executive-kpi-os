'use client'
import { format } from 'date-fns'
import { CheckCircle, AlertTriangle, Lightbulb, Clock, Sparkles, PenLine, RotateCcw, BookOpenCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { RecoveryPlan, PlanStatus } from '@/types/accountability'
import type { UserRole } from '@/types/user'

interface Props {
  plan: RecoveryPlan
  role: UserRole
  isOwner?: boolean
  /** Human name of the playbook this plan was based on, if any. */
  playbookName?: string
  onEndorse?: (planId: string) => void
  onSendBack?: (planId: string) => void
  onRecordOutcome?: (planId: string) => void
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  submitted: { label: 'Under Review', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  'in-progress': { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
}

export function PlanCard({ plan, role, isOwner = false, playbookName, onEndorse, onSendBack, onRecordOutcome }: Props) {
  const statusConfig = STATUS_CONFIG[plan.status]
  const isCeo = role === 'ceo'
  const isActive = plan.status === 'in-progress' || plan.status === 'submitted' || plan.status === 'approved'

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
                {statusConfig.label}
              </Badge>
              {plan.outcome === 'failed' && (
                <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                  Outcome: Failed
                </Badge>
              )}
              {plan.planSource && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  {plan.planSource === 'ai-suggestion' ? <Sparkles className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
                  {plan.planSource === 'ai-suggestion' ? 'AI-assisted' : 'Owner plan'}
                </Badge>
              )}
              {playbookName && (
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 gap-1">
                  <BookOpenCheck className="h-3 w-3" /> Based on: {playbookName}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                Confidence: {plan.confidenceLevel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted by {plan.ownerName} · {format(new Date(plan.createdAt), 'MMM d, yyyy')}
            </p>
            {plan.previousPlanIds.length > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">Revision (previous plan: {plan.previousPlanIds[0]})</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            Target: {format(new Date(plan.targetDate), 'MMM d, yyyy')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Summary */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
          <p className="text-sm">{plan.summary}</p>
        </div>

        {/* Root Cause */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Root Cause</p>
          <p className="text-sm text-gray-700">{plan.rootCause}</p>
        </div>

        {/* Actions */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actions</p>
          <ul className="space-y-1.5">
            {plan.actions.map(action => (
              <li key={action.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${action.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={action.completed ? 'line-through text-muted-foreground' : ''}>{action.description}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {format(new Date(action.dueDate), 'MMM d')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Failure Reason */}
        {plan.failureReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-red-700 mb-1">Why This Plan Failed</p>
            <p className="text-xs text-red-700">{plan.failureReason}</p>
          </div>
        )}

        {/* AI Warning */}
        {plan.aiWarning && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">AI Warning</p>
              <p className="text-xs text-amber-700">{plan.aiWarning}</p>
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        {plan.aiSuggestion && (
          <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Lightbulb className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-0.5">AI Suggestion</p>
              <p className="text-xs text-blue-700">{plan.aiSuggestion}</p>
            </div>
          </div>
        )}

        {/* Rejection reason (when a plan was sent back) */}
        {plan.status === 'rejected' && plan.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-red-700 mb-1">Sent back for revision</p>
            <p className="text-xs text-red-700">{plan.rejectionReason}</p>
          </div>
        )}

        {/* Loop controls — CEO oversight (non-blocking) + owner outcome */}
        {isActive && (isCeo || isOwner) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {isCeo && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                  onClick={() => onEndorse?.(plan.id)}
                >
                  <CheckCircle className="h-4 w-4" /> Endorse
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                  onClick={() => onSendBack?.(plan.id)}
                >
                  <RotateCcw className="h-4 w-4" /> Send back
                </Button>
              </>
            )}
            {isOwner && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onRecordOutcome?.(plan.id)}>
                <CheckCircle className="h-4 w-4" /> Record outcome
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
