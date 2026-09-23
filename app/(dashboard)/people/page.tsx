'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Users, CircleCheck, AlertTriangle, CircleDashed, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PanelError } from '@/components/shared/StateViews'
import { sessionFetch } from '@/lib/api/session-fetch'
import { usePersonaKey } from '@/hooks/usePersonas'
import { cn } from '@/lib/utils'
import { formatDay } from '@/lib/format'
import { STATUS_LABELS, type KpiStatusValue } from '@/lib/kpi/status'

type PersonKpi = {
  activeKpiId: string
  slug: string
  name: string
  category: string
  unit: string
  rhythm: string
  currentValue: number | null
  target: number | null
  status: KpiStatusValue
  deviationPct: number | null
  trend: 'improving' | 'flat' | 'declining'
  asOf: string | null
  isStale: boolean
}

type Person = {
  id: string
  name: string
  email: string | null
  role: string
  roleLabel?: string
  score: number | null
  counts: Record<KpiStatusValue, number>
  latestAsOf: string | null
  cadences: string[]
  kpis: PersonKpi[]
}

type PeopleData = {
  available: boolean
  latestAsOf: string | null
  people: Person[]
  /** True when the caller may only see their own scorecard. */
  scopedToSelf?: boolean
}

const PILL: Record<KpiStatusValue, string> = {
  'on-track': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'at-risk': 'bg-amber-50 text-amber-800 ring-amber-200',
  'off-track': 'bg-red-50 text-red-700 ring-red-200',
  'no-data': 'bg-slate-100 text-slate-500 ring-slate-200',
}

export default function PeoplePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Whose scorecards these are depends on the viewer, so it belongs in the key.
  const persona = usePersonaKey()
  const { data, isLoading, isError, refetch } = useQuery<PeopleData>({
    queryKey: ['people-performance', persona],
    queryFn: async () => (await sessionFetch('/api/people/performance')).json(),
  })

  // Derived during render rather than memoised: a find over a handful of
  // people costs nothing, and the manual memo blocks the React compiler from
  // optimising the component at all.
  const selected = data?.people.length
    ? (data.people.find((p) => p.id === selectedId) ?? data.people[0])
    : null

  if (isLoading && !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data?.available) {
    return (
      <div className="mx-auto max-w-4xl">
        <PanelError message="People performance could not load." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Users className="h-3.5 w-3.5" />
              People
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {data.scopedToSelf ? 'Your scorecard' : 'Performance by owner'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {data.scopedToSelf
                ? 'The KPIs you own, with status, cadence, and measurement date. Your role does not include other people’s scorecards.'
                : 'See each person through the KPIs they own, with status, cadence, and measurement date.'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
            <p className="text-[11px] font-medium uppercase text-slate-400">Latest period</p>
            <p className="text-sm font-semibold text-slate-900">
              {data.latestAsOf ? formatDay(data.latestAsOf) : 'No data'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-2">
          {data.people.map((person) => (
            <button
              key={person.id}
              onClick={() => setSelectedId(person.id)}
              className={cn(
                'w-full rounded-lg border bg-white p-3 text-left transition-colors',
                selected?.id === person.id ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200 hover:bg-slate-50',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{person.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{person.roleLabel ?? labelRole(person.role)}</p>
                </div>
                <Score score={person.score} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
                <MiniCount label="On Track" value={person.counts['on-track']} className="text-emerald-700" />
                <MiniCount label="Off Track" value={person.counts['off-track']} className="text-red-700" />
                <MiniCount label="No Data" value={person.counts['no-data']} className="text-slate-500" />
              </div>
            </button>
          ))}
        </aside>

        <main className="min-w-0 rounded-xl border border-slate-200 bg-white">
          {selected ? (
            <>
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-950">{selected.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selected.kpis.length} owned KPI{selected.kpis.length === 1 ? '' : 's'} ·{' '}
                      {selected.cadences.length ? selected.cadences.join(', ') : 'no cadence'}
                      {selected.latestAsOf ? ` · latest ${formatDay(selected.latestAsOf)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusSummary counts={selected.counts} />
                    <Score score={selected.score} />
                  </div>
                </div>
              </div>

              {selected.kpis.length === 0 ? (
                <div className="p-8 text-center">
                  <CircleDashed className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-600">Awaiting initial targets or KPI assignments.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selected.kpis.map((kpi) => (
                    <Link
                      key={kpi.activeKpiId}
                      href="/kpis"
                      className="group grid gap-3 p-4 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-950">{kpi.name}</p>
                          <StatusPill status={kpi.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {kpi.rhythm} cadence · measured {kpi.asOf ? formatDay(kpi.asOf) : 'never'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 md:justify-end">
                        <div className="text-right">
                          <p className="text-base font-semibold tabular-nums text-slate-950">
                            {kpi.currentValue != null ? formatValue(kpi.currentValue, kpi.unit) : 'Awaiting data'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Target {kpi.target != null ? formatValue(kpi.target, kpi.unit) : '-'}
                            {kpi.deviationPct != null && (
                              <span className={cn('ml-1 font-medium', kpi.deviationPct >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                                {kpi.deviationPct > 0 ? '+' : ''}
                                {kpi.deviationPct.toFixed(1)}%
                              </span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">No people found.</div>
          )}
        </main>
      </div>
    </div>
  )
}

function Score({ score }: { score: number | null }) {
  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-2 text-sm font-semibold text-white',
        score == null ? 'min-w-16 text-xs' : 'w-10',
      )}
      title={score == null ? 'Awaiting initial targets or performance data' : 'KPI health score'}
    >
      {score ?? 'No data'}
    </div>
  )
}

function MiniCount({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <span className="rounded-md bg-slate-50 px-1.5 py-1">
      <span className={cn('font-semibold', className)}>{value}</span>
      <span className="ml-1 text-slate-400">{label}</span>
    </span>
  )
}

function StatusSummary({ counts }: { counts: Record<KpiStatusValue, number> }) {
  return (
    <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
      <CircleCheck className="h-4 w-4 text-emerald-600" />
      {counts['on-track']} on track
      <AlertTriangle className="ml-2 h-4 w-4 text-red-600" />
      {counts['off-track']} need attention
    </div>
  )
}

function StatusPill({ status }: { status: KpiStatusValue }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', PILL[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function labelRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(v: number, unit: string) {
  if (unit === 'currency') {
    if (Math.abs(v) >= 1_000_000) return `PHP ${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `PHP ${(v / 1_000).toFixed(0)}K`
    return `PHP ${Math.round(v).toLocaleString()}`
  }
  if (unit === 'percentage') return `${v.toFixed(1)}%`
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return `${v.toFixed(1)}`
}
