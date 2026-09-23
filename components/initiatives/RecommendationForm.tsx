'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, Sparkles, FileText, LayoutTemplate, ShieldCheck, AlertTriangle } from 'lucide-react'
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
import { useKpis } from '@/hooks/useKpis'
import { useCreateInitiative } from '@/hooks/useInitiatives'
import { getTemplates, previewRoute, type ProjectKpiInput, type BudgetLineInput } from '@/lib/api/initiatives'
import { TYPE_LABELS, PRIORITY_LABELS } from '@/lib/initiatives/lifecycle'
import { APP_ID_TO_SLUG } from '@/lib/kpi-map'
import { formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InitiativeType, InitiativePriority, InitiativeTemplate } from '@/types/initiative'

// The Initiative Recommendation Form (PRD §7.2) — the required starting point
// for every initiative.
//
// One page, progressive sections, Save Draft always available. Three entry
// points: Blank, Template or an AI recommendation. The Approval Route Preview
// (§7.5) is shown before submission so nobody is surprised by who decides.

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMasterKpiSlug?: string
  defaultType?: InitiativeType
  /** Prefill from an accepted AI recommendation (PRD §9.3). */
  aiPrefill?: {
    objective?: string
    mechanics?: string
    initiativeType?: InitiativeType
    projectKpis?: ProjectKpiInput[]
    budgetLines?: BudgetLineInput[]
    durationDays?: number
    recommendationId?: string
  }
}

type Entry = 'choose' | 'form'

const emptyProjectKpi = (): ProjectKpiInput => ({
  name: '',
  definition: '',
  unit: 'number',
  direction: 'above',
  targetValue: 0,
  measurementSource: '',
})

export function RecommendationForm({
  open,
  onOpenChange,
  defaultMasterKpiSlug,
  defaultType,
  aiPrefill,
}: Props) {
  const { data: kpis = [] } = useKpis()
  const create = useCreateInitiative()

  const { data: templates = [] } = useQuery({
    queryKey: ['initiative-templates'],
    queryFn: getTemplates,
    staleTime: 10 * 60 * 1000,
  })

  const [entry, setEntry] = useState<Entry>(aiPrefill ? 'form' : 'choose')
  const [sourceType, setSourceType] = useState<'blank' | 'template' | 'ai'>(aiPrefill ? 'ai' : 'blank')
  const [templateId, setTemplateId] = useState<string | undefined>()

  const [objective, setObjective] = useState(aiPrefill?.objective ?? '')
  const [masterKpiId, setMasterKpiId] = useState('')
  const [mechanics, setMechanics] = useState(aiPrefill?.mechanics ?? '')
  const [projectKpis, setProjectKpis] = useState<ProjectKpiInput[]>(
    aiPrefill?.projectKpis?.length ? aiPrefill.projectKpis : [emptyProjectKpi()],
  )
  const [useLines, setUseLines] = useState(Boolean(aiPrefill?.budgetLines?.length))
  const [totalBudget, setTotalBudget] = useState('')
  const [lines, setLines] = useState<BudgetLineInput[]>(
    aiPrefill?.budgetLines?.length ? aiPrefill.budgetLines : [{ category: '', amount: 0 }],
  )
  const [startDate, setStartDate] = useState(aiPrefill?.durationDays ? todayIso() : '')
  const [endDate, setEndDate] = useState(
    aiPrefill?.durationDays ? plusDaysIso(aiPrefill.durationDays) : '',
  )
  const [initiativeType, setInitiativeType] = useState<InitiativeType>(
    aiPrefill?.initiativeType ?? defaultType ?? 'campaign',
  )
  const [priority, setPriority] = useState<InitiativePriority>('medium')
  const [showMore, setShowMore] = useState(false)

  // Master KPI options — only KPIs this user can actually see (§7.3).
  const kpiOptions = useMemo(
    () => kpis.filter((k) => APP_ID_TO_SLUG[k.id]).map((k) => ({ id: k.id, name: k.name, slug: APP_ID_TO_SLUG[k.id]! })),
    [kpis],
  )

  // Derived during render, not in an effect: the default only depends on props
  // and the loaded KPI list, and writing it from an effect causes a cascading
  // re-render on every list refresh.
  const defaultMasterId = defaultMasterKpiSlug
    ? (kpiOptions.find((k) => k.slug === defaultMasterKpiSlug)?.id ?? '')
    : ''
  const effectiveMasterKpiId = masterKpiId || defaultMasterId

  const computedTotal = useLines
    ? lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)
    : Number(totalBudget || 0)

  // §7.5 Approval Route Preview. Debounced so typing a budget does not spam
  // the router; it is informative anyway — the server re-routes on submit.
  const debouncedTotal = useDebounced(computedTotal, 400)
  const { data: routePreview, isFetching: routeLoading } = useQuery({
    queryKey: ['route-preview', debouncedTotal],
    queryFn: () => previewRoute({ total: debouncedTotal }),
    enabled: entry === 'form',
    staleTime: 30_000,
  })

  const applyTemplate = (t: InitiativeTemplate) => {
    setSourceType('template')
    setTemplateId(t.id)
    setInitiativeType(t.initiativeType)
    if (t.objectivePrompt) setObjective('')
    if (t.mechanicsTemplate) setMechanics(t.mechanicsTemplate)
    if (t.projectKpiDefaults.length > 0) {
      setProjectKpis(
        t.projectKpiDefaults.map((d) => ({
          name: d.name,
          definition: d.definition,
          unit: d.unit,
          direction: d.direction,
          targetValue: 0,
          measurementSource: d.measurement_source,
        })),
      )
    }
    if (t.budgetCategories.length > 0) {
      setUseLines(true)
      setLines(t.budgetCategories.map((c) => ({ category: c, amount: 0 })))
    }
    if (t.defaultDurationDays) {
      const [start, end] = defaultWindow(t.defaultDurationDays)
      setStartDate(start)
      setEndDate(end)
    }
    setEntry('form')
  }

  const activeTemplate = templates.find((t) => t.id === templateId)

  const reset = () => {
    setEntry(aiPrefill ? 'form' : 'choose')
    setSourceType(aiPrefill ? 'ai' : 'blank')
    setTemplateId(undefined)
    setObjective(aiPrefill?.objective ?? '')
    setMasterKpiId('')
    setMechanics(aiPrefill?.mechanics ?? '')
    setProjectKpis([emptyProjectKpi()])
    setUseLines(Boolean(aiPrefill?.budgetLines?.length))
    setTotalBudget('')
    setLines(aiPrefill?.budgetLines?.length ? aiPrefill.budgetLines : [{ category: '', amount: 0 }])
    setStartDate(aiPrefill?.durationDays ? todayIso() : '')
    setEndDate(aiPrefill?.durationDays ? plusDaysIso(aiPrefill.durationDays) : '')
    setShowMore(false)
  }

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const datesInvalid = Boolean(startDate && endDate && endDate < startDate)
  const validProjectKpis = projectKpis.filter(
    (k) => k.name.trim() && k.definition.trim() && k.measurementSource.trim(),
  )

  const canSubmit =
    objective.trim().length > 0 &&
    effectiveMasterKpiId !== '' &&
    mechanics.trim().length > 0 &&
    validProjectKpis.length > 0 &&
    startDate !== '' &&
    endDate !== '' &&
    !datesInvalid &&
    routePreview?.ok !== false &&
    !create.isPending

  const canSaveDraft = objective.trim().length > 0 && !create.isPending

  const payload = (submit: boolean) => ({
    overallObjective: objective.trim(),
    descriptionMechanics: mechanics.trim() || undefined,
    masterKpiId: effectiveMasterKpiId ? APP_ID_TO_SLUG[effectiveMasterKpiId] : undefined,
    projectKpis: validProjectKpis,
    budgetLines: useLines ? lines.filter((l) => l.category.trim()) : undefined,
    totalBudget: computedTotal,
    initiativeType,
    priority,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sourceType,
    sourceTemplateId: templateId,
    sourceAiRecommendationId: aiPrefill?.recommendationId,
    submit,
  })

  const save = async (submit: boolean) => {
    await create.mutateAsync(payload(submit))
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {entry === 'choose' ? 'New initiative' : 'Initiative recommendation'}
          </DialogTitle>
          <DialogDescription>
            {entry === 'choose'
              ? 'Start from scratch, or use a template to prefill the form. Either way you choose the Master KPI and the budget routes for approval automatically.'
              : 'Every initiative starts here. Save a draft at any point — nothing is submitted until you say so.'}
          </DialogDescription>
        </DialogHeader>

        {entry === 'choose' ? (
          <div className="space-y-3">
            <button
              onClick={() => {
                setSourceType('blank')
                setEntry('form')
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
            >
              <FileText className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              <span>
                <span className="block text-sm font-medium text-slate-900">Start blank</span>
                <span className="block text-xs text-slate-500">Write the objective and mechanics yourself.</span>
              </span>
            </button>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Or use a template
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                  >
                    <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{t.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {t.projectKpiDefaults.length} suggested Project KPIs
                        {t.defaultDurationDays ? ` · ~${t.defaultDurationDays} days` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {sourceType !== 'blank' && (
              <div
                className={cn(
                  'flex items-start gap-2.5 rounded-lg p-3 text-xs',
                  sourceType === 'ai' ? 'bg-violet-50 text-violet-900' : 'bg-slate-50 text-slate-700',
                )}
              >
                {sourceType === 'ai' ? (
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
                ) : (
                  <LayoutTemplate className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                )}
                <span>
                  {sourceType === 'ai'
                    ? 'Prefilled by the AI Coach. Every field is a suggestion — review and edit before submitting.'
                    : `Prefilled from "${activeTemplate?.name}". Every field remains editable.`}
                </span>
              </div>
            )}

            {/* 1 — Objective and Master KPI */}
            <Section n={1} title="Objective and Master KPI">
              <div className="space-y-1.5">
                <Label htmlFor="rf-objective">Overall objective</Label>
                <Textarea
                  id="rf-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder={
                    activeTemplate?.objectivePrompt ??
                    'What outcome should this achieve? The initiative title is generated from this.'
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rf-master">Master KPI</Label>
                <select
                  id="rf-master"
                  value={effectiveMasterKpiId}
                  onChange={(e) => setMasterKpiId(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Select the KPI this should improve…</option>
                  {kpiOptions.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Exactly one. This is the existing organizational KPI the initiative exists to move.
                </p>
              </div>
            </Section>

            {/* 2 — Mechanics */}
            <Section n={2} title="Description and mechanics">
              <Textarea
                value={mechanics}
                onChange={(e) => setMechanics(e.target.value)}
                placeholder="The action, audience or process, key mechanics, dependencies and operating assumptions."
                rows={4}
                aria-label="Project description and mechanics"
              />
            </Section>

            {/* 3 — Project KPIs */}
            <Section n={3} title="Project KPIs">
              <p className="text-xs text-slate-500">
                How will you know this specific initiative worked? At least one is required. These
                measure execution and do not become permanent organizational KPIs.
              </p>
              <div className="space-y-2">
                {projectKpis.map((k, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 gap-2 sm:grid-cols-2">
                        <Input
                          value={k.name}
                          onChange={(e) => updateAt(setProjectKpis, i, { name: e.target.value })}
                          placeholder="Name (e.g. Conversion rate)"
                          aria-label={`Project KPI ${i + 1} name`}
                        />
                        <Input
                          value={k.measurementSource}
                          onChange={(e) => updateAt(setProjectKpis, i, { measurementSource: e.target.value })}
                          placeholder="Measurement source (e.g. Northstar workbook)"
                          aria-label={`Project KPI ${i + 1} measurement source`}
                        />
                        <Input
                          className="sm:col-span-2"
                          value={k.definition}
                          onChange={(e) => updateAt(setProjectKpis, i, { definition: e.target.value })}
                          placeholder="Definition — what exactly is measured"
                          aria-label={`Project KPI ${i + 1} definition`}
                        />
                        <Input
                          type="number"
                          value={k.baselineValue ?? ''}
                          onChange={(e) =>
                            updateAt(setProjectKpis, i, {
                              baselineValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          placeholder="Baseline (optional)"
                          aria-label={`Project KPI ${i + 1} baseline`}
                        />
                        <Input
                          type="number"
                          value={k.targetValue || ''}
                          onChange={(e) => updateAt(setProjectKpis, i, { targetValue: Number(e.target.value) })}
                          placeholder="Target"
                          aria-label={`Project KPI ${i + 1} target`}
                        />
                        <select
                          value={k.unit}
                          onChange={(e) => updateAt(setProjectKpis, i, { unit: e.target.value })}
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                          aria-label={`Project KPI ${i + 1} unit`}
                        >
                          <option value="number">Number</option>
                          <option value="currency">Currency</option>
                          <option value="percentage">Percentage</option>
                          <option value="ratio">Ratio</option>
                          <option value="duration">Duration</option>
                        </select>
                        <select
                          value={k.direction}
                          onChange={(e) =>
                            updateAt(setProjectKpis, i, {
                              direction: e.target.value as ProjectKpiInput['direction'],
                            })
                          }
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                          aria-label={`Project KPI ${i + 1} direction`}
                        >
                          <option value="above">Higher is better</option>
                          <option value="below">Lower is better</option>
                        </select>
                      </div>
                      {projectKpis.length > 1 && (
                        <button
                          onClick={() => setProjectKpis((p) => p.filter((_, idx) => idx !== i))}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          aria-label={`Remove Project KPI ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProjectKpis((p) => [...p, emptyProjectKpi()])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Project KPI
              </Button>
            </Section>

            {/* 4 — Budget */}
            <Section n={4} title="Budget">
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setUseLines(false)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    !useLines ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600',
                  )}
                >
                  Single total
                </button>
                <button
                  onClick={() => setUseLines(true)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    useLines ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600',
                  )}
                >
                  Line items
                </button>
              </div>

              {useLines ? (
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={l.category}
                        onChange={(e) => updateAt(setLines, i, { category: e.target.value })}
                        placeholder="Category"
                        aria-label={`Budget line ${i + 1} category`}
                      />
                      <Input
                        value={l.description ?? ''}
                        onChange={(e) => updateAt(setLines, i, { description: e.target.value })}
                        placeholder="Description"
                        aria-label={`Budget line ${i + 1} description`}
                      />
                      <Input
                        type="number"
                        className="w-36"
                        value={l.amount || ''}
                        onChange={(e) => updateAt(setLines, i, { amount: Number(e.target.value) })}
                        placeholder="Amount"
                        aria-label={`Budget line ${i + 1} amount`}
                      />
                      {lines.length > 1 && (
                        <button
                          onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          aria-label={`Remove budget line ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLines((p) => [...p, { category: '', amount: 0 }])}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add line
                    </Button>
                    <p className="text-sm font-medium tabular-nums text-slate-900">
                      Total {formatPeso(computedTotal)}
                    </p>
                  </div>
                </div>
              ) : (
                <Input
                  type="number"
                  min={0}
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="0"
                  aria-label="Total budget"
                />
              )}

              {/* §7.5 Approval Route Preview */}
              <div
                className={cn(
                  'flex items-start gap-2.5 rounded-lg p-3 text-xs',
                  routePreview?.ok === false
                    ? 'bg-red-50 text-red-900'
                    : routePreview?.approvalRequired
                      ? 'bg-amber-50 text-amber-900'
                      : 'bg-emerald-50 text-emerald-900',
                )}
                role="status"
              >
                {routeLoading ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : routePreview?.ok === false ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span>
                  <span className="block font-medium">Approval route</span>
                  <span className="block">
                    {routeLoading
                      ? 'Checking the budget policy…'
                      : (routePreview?.description ?? 'Enter a budget to see how it routes.')}
                  </span>
                </span>
              </div>
            </Section>

            {/* 5 — Timeline */}
            <Section n={5} title="Timeline">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rf-start">Start date</Label>
                  <Input id="rf-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rf-end">End date</Label>
                  <Input
                    id="rf-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-invalid={datesInvalid}
                  />
                </div>
              </div>
              {datesInvalid && (
                <p className="text-xs text-red-600">End date must be on or after the start date.</p>
              )}
            </Section>

            {/* More details — progressive disclosure (§7.2) */}
            <button
              type="button"
              onClick={() => setShowMore((m) => !m)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {showMore ? '− Hide' : '+ More'} details
            </button>
            {showMore && (
              <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rf-type">Type</Label>
                  <select
                    id="rf-type"
                    value={initiativeType}
                    onChange={(e) => setInitiativeType(e.target.value as InitiativeType)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {(Object.keys(TYPE_LABELS) as InitiativeType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rf-priority">Priority</Label>
                  <select
                    id="rf-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as InitiativePriority)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {(Object.keys(PRIORITY_LABELS) as InitiativePriority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {entry === 'form' && (
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void save(false)} disabled={!canSaveDraft}>
              Save draft
            </Button>
            <Button onClick={() => void save(true)} disabled={!canSubmit}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit recommendation
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-white">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function updateAt<T>(
  setter: React.Dispatch<React.SetStateAction<T[]>>,
  index: number,
  patch: Partial<T>,
) {
  setter((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
}

/**
 * Clock reads live outside the component so they are never treated as a
 * render-time side effect by the React compiler.
 */
const todayIso = () => new Date().toISOString().slice(0, 10)
const plusDaysIso = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10)

function defaultWindow(days: number): [string, string] {
  return [todayIso(), plusDaysIso(days)]
}

/** Debounce a value without writing state from an effect on every keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
