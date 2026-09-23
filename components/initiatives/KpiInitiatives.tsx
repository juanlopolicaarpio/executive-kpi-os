'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Rocket, Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInitiativesForKpi } from '@/hooks/useInitiatives'
import { RecommendationForm } from './RecommendationForm'
import { StatusBadge, TypeBadge, RoiBadge, GoalBadge } from './InitiativeBadges'
import { formatDay, formatPeso } from '@/lib/format'
import type { InitiativeType } from '@/types/initiative'

interface Props {
  kpiSlug: string
  kpiName: string
  /** Off-target KPIs default a new initiative to the recovery type. */
  offTarget?: boolean
}

/**
 * The bridge from measurement to action. Every KPI page should be able to
 * answer "what are we doing about this?" and let you start something if the
 * answer is nothing.
 */
export function KpiInitiatives({ kpiSlug, kpiName, offTarget }: Props) {
  const { data, isLoading } = useInitiativesForKpi(kpiSlug)
  const [createOpen, setCreateOpen] = useState(false)

  const initiatives = data?.initiatives ?? []
  const unavailable = data?.unavailable

  const activeOnes = initiatives.filter((i) => i.status === 'active' || i.status === 'completed')
  const closedOnes = initiatives.filter((i) => i.status === 'closed')

  const defaultType: InitiativeType = offTarget ? 'recovery' : 'campaign'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Rocket className="h-4 w-4 text-slate-400" /> Initiatives
        </h2>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} disabled={unavailable}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {offTarget ? 'Launch recovery initiative' : 'Launch initiative'}
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-400">Loading…</p>
      ) : unavailable ? (
        <p className="mt-3 text-sm text-slate-400">
          Initiatives are not available yet — run the 007 migration to enable them.
        </p>
      ) : initiatives.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {offTarget
            ? `${kpiName} is off target and nothing is being done about it. Launch an initiative to change that.`
            : `No initiatives are targeting ${kpiName} yet.`}
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {activeOnes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">In flight</p>
              <ul className="space-y-1.5">
                {activeOnes.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/initiatives/${i.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{i.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={i.status} />
                          <TypeBadge type={i.initiativeType} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-slate-400">
                        {i.approvedBudget != null && (
                          <span className="block tabular-nums">{formatPeso(i.approvedBudget)}</span>
                        )}
                        {i.endDate && <span className="block">to {formatDay(i.endDate)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {closedOnes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                What we&apos;ve tried before ({closedOnes.length})
              </p>
              <ul className="space-y-1.5">
                {closedOnes.slice(0, 5).map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/initiatives/${i.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-700">{i.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {i.results && <GoalBadge goal={i.results.goalAchieved} />}
                        <RoiBadge roi={i.results?.roi} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {closedOnes.length > 5 && (
                <Link
                  href={`/initiatives?kpi=${kpiSlug}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  See all {closedOnes.length} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <RecommendationForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultMasterKpiSlug={kpiSlug}
        defaultType={defaultType}
      />
    </section>
  )
}
