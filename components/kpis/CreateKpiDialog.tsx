'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { sessionFetch } from '@/lib/api/session-fetch'
import { useInitiatives } from '@/hooks/useInitiatives'
import { cn } from '@/lib/utils'

// PRD §6.3 create-KPI form.
//
// Progressive disclosure (§2.3): the eight fields needed to define a KPI are
// visible; weighting and thresholds sit behind "Advanced" with
// sensible defaults, so a first KPI takes a minute rather than fifteen.

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}
const CATEGORIES = ['revenue', 'profitability', 'acquisition', 'operations', 'retention', 'people']
const UNITS = [
  { value: 'currency', label: 'Currency (₱)' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'number', label: 'Number' },
  { value: 'ratio', label: 'Ratio (x)' },
  { value: 'duration', label: 'Duration' },
]

export function CreateKpiDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const { data: list } = useInitiatives()
  const members = list?.members ?? []

  const [name, setName] = useState('')
  const [definition, setDefinition] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [category, setCategory] = useState('revenue')
  const [unit, setUnit] = useState('number')
  const [direction, setDirection] = useState<'above' | 'below' | 'range'>('above')
  const [frequency, setFrequency] = useState('monthly')
  const [aggregation, setAggregation] = useState('last')
  const [targetValue, setTargetValue] = useState('')
  const [targetLower, setTargetLower] = useState('')
  const [targetUpper, setTargetUpper] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [weight, setWeight] = useState(3)
  const [priority, setPriority] = useState('medium')
  const [onTrack, setOnTrack] = useState('100')

  const create = useMutation({
    mutationFn: async () => {
      const res = await sessionFetch('/api/kpis/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          definition: definition.trim(),
          ownerId,
          category,
          unit,
          direction,
          frequency,
          aggregation,
          targetValue: direction === 'range' ? null : Number(targetValue),
          targetLower: direction === 'range' ? Number(targetLower) : null,
          targetUpper: direction === 'range' ? Number(targetUpper) : null,
          thresholds: { onTrack: Number(onTrack) / 100, atRisk: Number(onTrack) / 100 },
          weight,
          priority,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not create KPI')
      return json
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kpis'] })
      void qc.invalidateQueries({ queryKey: ['home'] })
      toast.success(`${name.trim()} created`)
      reset()
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reset = () => {
    setName('')
    setDefinition('')
    setOwnerId('')
    setTargetValue('')
    setTargetLower('')
    setTargetUpper('')
    setAdvanced(false)
  }

  const targetOk =
    direction === 'range'
      ? targetLower !== '' && targetUpper !== '' && Number(targetUpper) >= Number(targetLower)
      : targetValue !== '' && Number(targetValue) !== 0

  const canSave =
    name.trim().length >= 3 &&
    definition.trim().length > 0 &&
    ownerId !== '' &&
    targetOk &&
    !create.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : (reset(), onOpenChange(false)))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New KPI</DialogTitle>
          <DialogDescription>
            A KPI defines a measurable outcome, who owns it, and what success looks like.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kpi-name">Name</Label>
            <Input
              id="kpi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Net Sales"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-definition">Definition</Label>
            <Textarea
              id="kpi-definition"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="What is measured, and why it matters."
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" htmlFor="kpi-owner">
              <select
                id="kpi-owner"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Select an owner…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category" htmlFor="kpi-category">
              <Select id="kpi-category" value={category} onChange={setCategory}
                options={CATEGORIES.map((c) => [c, c[0]!.toUpperCase() + c.slice(1)])} />
            </Field>

            <Field label="Unit" htmlFor="kpi-unit">
              <Select id="kpi-unit" value={unit} onChange={setUnit}
                options={UNITS.map((u) => [u.value, u.label])} />
            </Field>

            <Field label="Direction" htmlFor="kpi-direction">
              <Select
                id="kpi-direction"
                value={direction}
                onChange={(v) => setDirection(v as typeof direction)}
                options={[
                  ['above', 'Higher is better'],
                  ['below', 'Lower is better'],
                  ['range', 'Target range'],
                ]}
              />
            </Field>

            <Field label="Frequency" htmlFor="kpi-frequency">
              <Select id="kpi-frequency" value={frequency} onChange={setFrequency}
                options={[
                  ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'],
                  ['quarterly', 'Quarterly'], ['custom', 'Custom'],
                ]} />
            </Field>
          </div>

          {/* Target */}
          {direction === 'range' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lower bound" htmlFor="kpi-lower">
                <Input id="kpi-lower" type="number" value={targetLower} onChange={(e) => setTargetLower(e.target.value)} />
              </Field>
              <Field label="Upper bound" htmlFor="kpi-upper">
                <Input id="kpi-upper" type="number" value={targetUpper} onChange={(e) => setTargetUpper(e.target.value)} />
              </Field>
            </div>
          ) : (
            <Field label="Target" htmlFor="kpi-target">
              <Input
                id="kpi-target"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                aria-invalid={targetValue !== '' && Number(targetValue) === 0}
              />
              {targetValue !== '' && Number(targetValue) === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  A target of zero cannot be scored as a ratio — use a target range instead.
                </p>
              )}
            </Field>
          )}

          {/* Advanced (progressive disclosure) */}
          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {advanced ? '− Hide' : '+ Show'} advanced settings
          </button>

          {advanced && (
            <div className="grid gap-4 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
              <Field label={`Health-score weight: ${weight}`} htmlFor="kpi-weight">
                <input
                  id="kpi-weight"
                  type="range"
                  min={1}
                  max={5}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </Field>

              <Field label="Priority" htmlFor="kpi-priority">
                <Select id="kpi-priority" value={priority} onChange={setPriority}
                  options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']]} />
              </Field>

              <Field label="On target at or above (%)" htmlFor="kpi-ontrack">
                <Input id="kpi-ontrack" type="number" value={onTrack} onChange={(e) => setOnTrack(e.target.value)} />
              </Field>

              <Field label="Aggregation" htmlFor="kpi-aggregation">
                <Select id="kpi-aggregation" value={aggregation} onChange={setAggregation}
                  options={[['last', 'Last value'], ['sum', 'Sum'], ['average', 'Average'], ['min', 'Minimum'], ['max', 'Maximum']]} />
              </Field>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!canSave}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create KPI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Select({
  id,
  value,
  onChange,
  options,
  className,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
  className?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm', className)}
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  )
}
