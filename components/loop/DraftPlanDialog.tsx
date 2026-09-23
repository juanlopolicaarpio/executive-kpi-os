'use client'
import { useState } from 'react'
import { Sparkles, Lightbulb, AlertTriangle, Plus, Trash2, Loader2, PenLine } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAiSuggestion } from '@/hooks/useAiSuggestion'
import { useLoopStore } from '@/store/loopStore'
import { useSession } from '@/hooks/useSession'
import type { Kpi } from '@/types/kpi'

interface Props {
  kpi: Kpi
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Plan IDs being revised (e.g. after a CEO send-back or a failed outcome). */
  previousPlanIds?: string[]
}

type ActionRow = { description: string; dueDate: string }
type Confidence = 'low' | 'medium' | 'high'

const CONFIDENCE: Confidence[] = ['low', 'medium', 'high']

function defaultDueDate(weeksOut: number) {
  const d = new Date()
  d.setDate(d.getDate() + weeksOut * 7)
  return d.toISOString().slice(0, 10)
}

export function DraftPlanDialog({ kpi, open, onOpenChange, previousPlanIds = [] }: Props) {
  const { user } = useSession()
  const submitPlan = useLoopStore((s) => s.submitPlan)
  const { match, suggestion, warning, isLoading, isFallback } = useAiSuggestion(kpi.id, open)

  // The dialog is mounted only while open (see call sites), so plain initial
  // state gives a fresh form every time it is opened — no reset effect needed.
  const [mode, setMode] = useState<'choose' | 'ai-suggestion' | 'own'>('choose')
  const [summary, setSummary] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [actions, setActions] = useState<ActionRow[]>([{ description: '', dueDate: defaultDueDate(2) }])
  const [targetDate, setTargetDate] = useState(defaultDueDate(4))
  const [confidence, setConfidence] = useState<Confidence>('medium')

  const adoptAiSuggestion = () => {
    if (!match) return
    setSummary(match.draft.summary)
    setRootCause(match.draft.rootCause)
    setActions(
      match.draft.actions.map((description, i) => ({ description, dueDate: defaultDueDate(i + 1) })),
    )
    setConfidence(match.draft.confidenceLevel)
    setMode('ai-suggestion')
  }

  const startOwnPlan = () => {
    setMode('own')
  }

  const updateAction = (i: number, patch: Partial<ActionRow>) =>
    setActions((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addAction = () => setActions((rows) => [...rows, { description: '', dueDate: defaultDueDate(2) }])
  const removeAction = (i: number) => setActions((rows) => rows.filter((_, idx) => idx !== i))

  const canSubmit =
    summary.trim().length > 10 &&
    rootCause.trim().length > 10 &&
    actions.some((a) => a.description.trim().length > 0)

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Add a summary, root cause, and at least one action before submitting.')
      return
    }
    submitPlan({
      kpiId: kpi.id,
      ownerId: kpi.ownerId,
      ownerName: kpi.ownerName,
      summary: summary.trim(),
      rootCause: rootCause.trim(),
      actions: actions
        .filter((a) => a.description.trim())
        .map((a) => ({ description: a.description.trim(), dueDate: a.dueDate })),
      targetDate,
      confidenceLevel: confidence,
      planSource: mode === 'ai-suggestion' ? 'ai-suggestion' : 'own',
      aiSuggestion: mode === 'ai-suggestion' ? suggestion : undefined,
      aiWarning: warning,
      sourcePlaybookId: mode === 'ai-suggestion' ? match?.source.playbookId : undefined,
      sourceLearningIds: mode === 'ai-suggestion' ? match?.source.learningIds : undefined,
      previousPlanIds,
    })
    toast.success('Recovery plan submitted — now in progress.')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Recovery Plan — {kpi.name}
          </DialogTitle>
          <DialogDescription>
            {kpi.currentValueDisplay} against a target of {kpi.target}. Choose the AI suggestion or write your own.
          </DialogDescription>
        </DialogHeader>

        {/* AI suggestion panel — always visible so the owner can see the institutional memory. */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              AI Suggestion {isFallback && '(from memory)'}
            </p>
            {match?.playbook && (
              <Badge variant="outline" className="text-[10px] bg-white text-blue-700 border-blue-200">
                {match.playbook.intervention} · {match.playbook.successRatePct}%
              </Badge>
            )}
          </div>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recalling what worked last time…
            </p>
          ) : (
            <p className="text-sm text-blue-900 leading-relaxed">
              {suggestion ?? match?.rationale ?? 'No close match in institutional memory yet.'}
            </p>
          )}

          {match?.learnings && match.learnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {match.learnings.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-blue-700 border border-blue-200">
                  <Lightbulb className="h-2.5 w-2.5" /> {l.title}
                </span>
              ))}
            </div>
          )}

          {warning && (
            <div className="mt-2 flex gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700">{warning}</p>
            </div>
          )}
        </div>

        {mode === 'choose' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={adoptAiSuggestion}
              disabled={!match}
              className="flex flex-col items-start gap-1 rounded-lg border border-blue-200 bg-white p-3 text-left transition-colors hover:bg-blue-50 disabled:opacity-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <Sparkles className="h-4 w-4" /> Use AI suggestion
              </span>
              <span className="text-xs text-muted-foreground">
                Prefill the plan from what has worked before. You can still edit every field.
              </span>
            </button>
            <button
              onClick={startOwnPlan}
              className="flex flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <PenLine className="h-4 w-4" /> Write my own plan
              </span>
              <span className="text-xs text-muted-foreground">
                Start from a blank plan. The AI suggestion stays visible for reference.
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'ai-suggestion' && (
              <p className="flex items-center gap-1.5 text-xs text-blue-700">
                <Sparkles className="h-3.5 w-3.5" /> Prefilled from AI suggestion — edit anything before submitting.
                <button onClick={startOwnPlan} className="underline ml-1">switch to blank</button>
              </p>
            )}

            <Field label="Summary">
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What is the plan, in one or two sentences?" rows={2} />
            </Field>

            <Field label="Root cause">
              <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Why did this KPI miss?" rows={2} />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</label>
                <Button type="button" size="xs" variant="ghost" onClick={addAction} className="gap-1 text-blue-700">
                  <Plus className="h-3 w-3" /> Add action
                </Button>
              </div>
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Input
                      value={a.description}
                      onChange={(e) => updateAction(i, { description: e.target.value })}
                      placeholder={`Action ${i + 1}`}
                      className="flex-1"
                    />
                    <input
                      type="date"
                      value={a.dueDate}
                      onChange={(e) => updateAction(i, { dueDate: e.target.value })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    />
                    {actions.length > 1 && (
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeAction(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <Field label="Target date" className="w-auto">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                />
              </Field>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence</label>
                <div className="flex gap-1">
                  {CONFIDENCE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfidence(c)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                        confidence === c
                          ? 'border-blue-300 bg-blue-100 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
                Submit plan
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1 text-right">
              Submitting puts the plan in progress immediately. {user.role === 'ceo' ? '' : 'The CEO will see it and can send it back.'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
