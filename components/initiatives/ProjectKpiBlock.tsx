'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Gauge, Check, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProjectKpi } from '@/lib/api/initiatives'
import { cn } from '@/lib/utils'
import type { Initiative, ProjectKpi } from '@/types/initiative'

// PRD §7.6 Project KPI block, and §7.7 in-flight value updates.
//
// Attainment is direction-aware (§8.3): for a lower-is-better metric, coming in
// under target is success, so the ratio is inverted rather than the number
// being read as a shortfall.

function attainmentPct(k: ProjectKpi): number | null {
  const value = k.resultValue ?? k.currentValue
  if (value == null || !k.targetValue) return null
  const ratio = k.direction === 'below' ? k.targetValue / value : value / k.targetValue
  if (!Number.isFinite(ratio)) return null
  return Math.round(ratio * 100)
}

function fmt(v: number | undefined, unit: string): string {
  if (v == null) return '—'
  if (unit === 'currency') return `₱${Math.round(v).toLocaleString()}`
  if (unit === 'percentage') return `${v}%`
  if (unit === 'ratio') return `${v}x`
  return v.toLocaleString()
}

export function ProjectKpiBlock({
  initiative,
  canEdit,
}: {
  initiative: Initiative
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const save = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      updateProjectKpi(initiative.id, id, { currentValue: value }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['initiatives'] })
      setEditing(null)
      toast.success('Project KPI updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Gauge className="h-4 w-4 text-slate-400" aria-hidden /> Project KPIs
        <span className="text-xs font-normal text-slate-400">{initiative.projectKpis.length}</span>
      </h2>

      {initiative.projectKpis.length === 0 ? (
        <p className="mt-3 text-sm text-amber-700">
          No Project KPIs defined. At least one is required before this can be submitted.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {initiative.projectKpis.map((k) => {
            const attain = attainmentPct(k)
            const isEditing = editing === k.id
            return (
              <li key={k.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{k.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{k.definition}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Source: {k.measurementSource}
                      {k.direction === 'below' ? ' · lower is better' : ''}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {attain != null && (
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                          attain >= 100
                            ? 'bg-emerald-50 text-emerald-700'
                            : attain >= 90
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-red-50 text-red-700',
                        )}
                      >
                        {attain}% of target
                      </span>
                    )}
                  </div>
                </div>

                <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Baseline</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {k.baselineValue != null ? fmt(k.baselineValue, k.unit) : (k.baselineReason ?? '—')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Target</dt>
                    <dd className="font-medium tabular-nums text-slate-900">
                      {fmt(k.targetValue, k.unit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">
                      {k.resultValue != null ? 'Final' : 'Current'}
                    </dt>
                    <dd className="flex items-center gap-1.5 font-medium tabular-nums text-slate-900">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="h-7 w-24"
                            aria-label={`${k.name} current value`}
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => save.mutate({ id: k.id, value: Number(draft) })}
                            disabled={draft === '' || save.isPending}
                          >
                            {save.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          {fmt(k.resultValue ?? k.currentValue, k.unit)}
                          {canEdit && initiative.status === 'active' && (
                            <button
                              onClick={() => {
                                setEditing(k.id)
                                setDraft(String(k.currentValue ?? ''))
                              }}
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`Update ${k.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </dd>
                  </div>
                </dl>

                {k.resultUnavailableReason && (
                  <p className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                    Result unavailable: {k.resultUnavailableReason}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
