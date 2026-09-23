'use client'
import { useState } from 'react'
import { Loader2, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatPeso } from '@/lib/format'
import { computeRoi, computeRoas } from '@/lib/initiatives/lifecycle'
import { useSubmitResults } from '@/hooks/useInitiatives'
import type { Initiative, GoalAchieved } from '@/types/initiative'

interface Props {
  initiative: Initiative
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GOALS: { value: GoalAchieved; label: string; hint: string; Icon: React.ElementType; on: string }[] = [
  { value: 'yes', label: 'Yes', hint: 'Target met', Icon: CheckCircle2, on: 'border-emerald-300 bg-emerald-50' },
  { value: 'partial', label: 'Partial', hint: 'Some movement', Icon: MinusCircle, on: 'border-amber-300 bg-amber-50' },
  { value: 'no', label: 'No', hint: 'Did not work', Icon: XCircle, on: 'border-red-300 bg-red-50' },
]

/**
 * The mandatory results submission. Nothing closes without it — this is the
 * step that turns an initiative into institutional memory, so lessons learned
 * is required even when the initiative succeeded.
 */
export function SubmitResultsDialog({ initiative, open, onOpenChange }: Props) {
  const submit = useSubmitResults()

  const [goalAchieved, setGoalAchieved] = useState<GoalAchieved | null>(null)
  // PRD §8.1: the window used to evaluate impact. Defaults to the initiative's
  // own timeline, which is the honest starting assumption.
  const [windowStart, setWindowStart] = useState(initiative.startDate ?? '')
  const [windowEnd, setWindowEnd] = useState(initiative.endDate ?? '')
  const [actualSpend, setActualSpend] = useState(String(initiative.actualSpend ?? ''))
  const [revenueGenerated, setRevenueGenerated] = useState('')
  const [incrementalRevenue, setIncrementalRevenue] = useState('')
  const [incrementalProfit, setIncrementalProfit] = useState('')
  const [businessResults, setBusinessResults] = useState('')
  const [lessonsLearned, setLessonsLearned] = useState('')

  const spend = Number(actualSpend)
  const roi = computeRoi(incrementalProfit ? Number(incrementalProfit) : undefined, spend)
  const roas = computeRoas(revenueGenerated ? Number(revenueGenerated) : undefined, spend)

  // PRD §8.1: spend is required only when an approved budget exists.
  const budgetExists = initiative.approvedBudget != null
  const spendOk = budgetExists ? actualSpend !== '' && Number.isFinite(spend) && spend >= 0 : true
  const windowOk = Boolean(windowStart && windowEnd && windowEnd >= windowStart)
  const impactLen = businessResults.trim().length
  const impactOk = impactLen >= 50 && impactLen <= 2000

  const canSave =
    goalAchieved !== null &&
    windowOk &&
    spendOk &&
    impactOk &&
    lessonsLearned.trim().length > 0 &&
    !submit.isPending

  const handleSubmit = async () => {
    if (!canSave) return
    await submit.mutateAsync({
      id: initiative.id,
      input: {
        goalAchieved: goalAchieved!,
        measurementWindowStart: windowStart,
        measurementWindowEnd: windowEnd,
        actualSpend: actualSpend === '' ? undefined : spend,
        businessResults: businessResults.trim(),
        lessonsLearned: lessonsLearned.trim(),
        revenueGenerated: revenueGenerated ? Number(revenueGenerated) : undefined,
        incrementalRevenue: incrementalRevenue ? Number(incrementalRevenue) : undefined,
        incrementalProfit: incrementalProfit ? Number(incrementalProfit) : undefined,
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit results — {initiative.name}</DialogTitle>
          <DialogDescription>
            Required before this initiative can close. What you write here becomes part of the
            organization&apos;s permanent record and trains future recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Goal achieved?</Label>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map(({ value, label, hint, Icon, on }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGoalAchieved(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
                    goalAchieved === value ? on : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <Icon className={cn('h-5 w-5', goalAchieved === value ? 'text-slate-700' : 'text-slate-400')} />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[11px] text-slate-500">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Result measurement window</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                aria-label="Measurement window start"
              />
              <Input
                type="date"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                aria-label="Measurement window end"
                aria-invalid={Boolean(windowStart && windowEnd && windowEnd < windowStart)}
              />
            </div>
            <p className="text-xs text-slate-500">
              The period the impact is judged over. Defaults to the initiative&apos;s timeline —
              widen it if the effect took longer to land.
            </p>
          </div>

          {initiative.targetKpis.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-medium text-slate-700">KPIs impacted</p>
              <p className="mt-1 text-xs text-slate-500">
                Values are read straight from the KPI snapshots — no re-entry needed.
              </p>
              <ul className="mt-2 space-y-1">
                {initiative.targetKpis.map((k) => (
                  <li key={k.kpiSlug} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{k.name ?? k.kpiSlug}</span>
                    <span className="tabular-nums text-slate-500">
                      {k.baselineValue != null ? k.baselineValue.toLocaleString() : '—'}
                      {' → '}
                      {k.resultValue != null ? k.resultValue.toLocaleString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="results-spend">Actual budget spent (₱)</Label>
              <Input
                id="results-spend"
                type="number"
                min={0}
                value={actualSpend}
                onChange={(e) => setActualSpend(e.target.value)}
              />
              {initiative.approvedBudget != null && (
                <p className="text-xs text-slate-500">
                  Approved: {formatPeso(initiative.approvedBudget)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="results-revenue">Revenue generated (₱)</Label>
              <Input
                id="results-revenue"
                type="number"
                value={revenueGenerated}
                onChange={(e) => setRevenueGenerated(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="results-inc-revenue">Incremental revenue (₱)</Label>
              <Input
                id="results-inc-revenue"
                type="number"
                value={incrementalRevenue}
                onChange={(e) => setIncrementalRevenue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="results-inc-profit">Incremental profit (₱)</Label>
              <Input
                id="results-inc-profit"
                type="number"
                value={incrementalProfit}
                onChange={(e) => setIncrementalProfit(e.target.value)}
              />
            </div>
          </div>

          {(roi != null || roas != null) && (
            <div className="flex gap-4 rounded-lg bg-slate-900 p-3 text-white">
              {roi != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">ROI</p>
                  <p className="text-lg font-semibold tabular-nums">{roi.toFixed(1)}%</p>
                </div>
              )}
              {roas != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">ROAS</p>
                  <p className="text-lg font-semibold tabular-nums">{roas.toFixed(2)}x</p>
                </div>
              )}
              <p className="ml-auto max-w-xs self-center text-[11px] leading-snug text-slate-400">
                Calculated the same way in the database, so this is exactly what the AI will learn.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="results-business">Business results</Label>
            <Textarea
              id="results-business"
              value={businessResults}
              onChange={(e) => setBusinessResults(e.target.value)}
              placeholder="What actually happened to the business — volumes, share, margin, traffic."
              rows={3}
            />
            <p className={cn('text-xs', impactOk ? 'text-slate-500' : 'text-amber-700')}>
              {impactLen}/2000 characters — at least 50 required.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="results-lessons">Lessons learned</Label>
            <Textarea
              id="results-lessons"
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="What would you tell someone about to run this again? Say it plainly — including what not to repeat."
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Required whether it worked or not. A failure recorded honestly is worth more than a
              success recorded vaguely.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave}>
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
