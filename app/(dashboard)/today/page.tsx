'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Loader2, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { HealthSummary } from '@/components/home/HealthSummary'
import { AttentionList } from '@/components/home/AttentionList'
import { HomeInitiatives } from '@/components/initiatives/HomeInitiatives'
import { PanelError } from '@/components/shared/StateViews'
import { sessionFetch } from '@/lib/api/session-fetch'
import { useScopeStore, SCOPE_LABELS } from '@/store/scopeStore'
import { useActiveScope } from '@/hooks/useScope'
import { usePersonaKey } from '@/hooks/usePersonas'
import { useMe } from '@/hooks/useInitiatives'
import { formatDay, formatMonth } from '@/lib/format'
import { STATUS_LABELS, type KpiStatusValue } from '@/lib/kpi/status'
import { cn } from '@/lib/utils'
import type { AttentionItem, HomeKpi } from '@/app/api/home/route'

// Home — the daily command center (PRD §5).
//
// Answers three questions in order: how are we performing, what is running,
// what needs attention. Core data loads independently of the AI summary so AI
// latency never blocks the page (§5.6).

interface HomeData {
  available: boolean
  org: string
  health: {
    score: number | null
    band: string
    bandStatus: KpiStatusValue
    includedCount: number
    excludedCount: number
    counts: Record<KpiStatusValue, number>
  }
  freshness: { asOf: string | null; staleCount: number; staleKpis: string[] }
  keyKpis: HomeKpi[]
  kpis: HomeKpi[]
  attention: AttentionItem[]
  attentionTotal: number
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const STATUS_TINT: Record<KpiStatusValue, string> = {
  'on-track': 'border-slate-200',
  'at-risk': 'border-amber-200',
  'off-track': 'border-red-200',
  'no-data': 'border-dashed border-slate-200',
}

export default function HomePage() {
  const scope = useActiveScope()
  const setScope = useScopeStore((s) => s.setScope)
  // Part of the query key so switching person re-reads Home rather than showing
  // the previous person's cached dashboard.
  const persona = usePersonaKey()
  const { data: me } = useMe()
  const [statusFilter, setStatusFilter] = useState<KpiStatusValue | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<HomeData>({
    queryKey: ['home', scope, persona],
    queryFn: async () => (await sessionFetch(`/api/home?scope=${scope}`)).json(),
    placeholderData: (prev) => prev,
  })

  const {
    data: brief,
    isLoading: briefLoading,
    isError: briefError,
  } = useQuery<{ brief: string; fallback?: boolean }>({
    queryKey: ['today-brief', persona],
    queryFn: async () => (await sessionFetch('/api/today/brief')).json(),
    staleTime: 10 * 60 * 1000,
  })
  const briefUnavailable = briefError || (!briefLoading && !brief?.brief)

  if (isLoading && !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data?.available) {
    return (
      <div className="mx-auto max-w-4xl">
        <PanelError
          message="Home could not load your performance data."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const visibleKpis = statusFilter
    ? data.kpis.filter((k) => k.status === statusFilter)
    : data.keyKpis

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* A — Performance summary (§5.2) */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <p className="text-xs text-slate-400">{formatDay(new Date())}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
          {greeting()}, {(me?.name ?? data.org).split(' ')[0]}
        </h1>

        <div className="mt-4 flex items-start gap-3 rounded-lg bg-violet-50/60 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Today&apos;s brief
            </p>
            {brief?.brief ? (
              <>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mt-1 text-sm leading-relaxed text-slate-800">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
                  }}
                >
                  {brief.brief}
                </ReactMarkdown>
                {false && (
                  <p className="mt-1.5 text-xs text-violet-700">
                    Written from the numbers directly — the AI was unavailable.
                  </p>
                )}
              </>
            ) : briefUnavailable ? (
              <p className="mt-1 text-sm text-slate-500">
                Unavailable right now. Your KPIs and initiatives below are unaffected.
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading today&apos;s numbers…
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <HealthSummary
            score={data.health.score}
            band={data.health.band}
            bandStatus={data.health.bandStatus}
            includedCount={data.health.includedCount}
            excludedCount={data.health.excludedCount}
            counts={data.health.counts}
            asOf={data.freshness.asOf}
            staleCount={data.freshness.staleCount}
            staleKpis={data.freshness.staleKpis}
            activeFilter={statusFilter}
            onFilter={setStatusFilter}
          />
        </div>
      </header>

      {/* B — Key KPI cards (§5.3), or the filtered set when a count is clicked */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            {statusFilter ? `${STATUS_LABELS[statusFilter]} KPIs` : 'Key KPIs'}
          </h2>
          <span className="text-xs text-slate-400">{visibleKpis.length}</span>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Clear filter
            </button>
          )}
        </div>

        {visibleKpis.length === 0 ? (
          // §4.3: an empty area must say WHY it is empty and offer the next
          // action — otherwise a narrow scope reads as a broken dashboard.
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-8 text-center">
            {statusFilter ? (
              <>
                <p className="text-sm text-slate-600">
                  No KPIs are {STATUS_LABELS[statusFilter].toLowerCase()} right now.
                </p>
                <button
                  onClick={() => setStatusFilter(null)}
                  className="mt-1 text-sm font-medium text-blue-700 hover:underline"
                >
                  Clear the filter
                </button>
              </>
            ) : scope !== 'organization' ? (
              <>
                <p className="text-sm text-slate-600">
                  No KPIs are assigned to you at the {SCOPE_LABELS[scope].toLowerCase()} level.
                </p>
                <button
                  onClick={() => setScope('organization')}
                  className="mt-1 text-sm font-medium text-blue-700 hover:underline"
                >
                  View organization KPIs
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">No KPIs have been created yet.</p>
                <Link href="/kpis" className="mt-1 inline-block text-sm font-medium text-blue-700 hover:underline">
                  Add your first KPI
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visibleKpis.map((k) => (
              <KpiCard key={k.slug} k={k} />
            ))}
          </div>
        )}
      </section>

      {/* C — Active initiatives (§5.4) */}
      <HomeInitiatives />

      {/* D — Attention and required actions (§5.5) */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
          <span className="text-xs text-slate-400">{data.attentionTotal}</span>
        </div>
        <AttentionList items={data.attention} total={data.attentionTotal} />
      </section>
    </div>
  )
}

function KpiCard({ k }: { k: HomeKpi }) {
  const TrendIcon =
    k.trend === 'improving' ? ArrowUpRight : k.trend === 'declining' ? ArrowDownRight : Minus
  const trendTint =
    k.trend === 'improving' ? 'text-emerald-600' : k.trend === 'declining' ? 'text-red-600' : 'text-slate-400'

  return (
    <Link
      href={k.appId ? `/kpis/${k.appId}` : '/kpis'}
      className={cn(
        'group flex flex-col rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
        STATUS_TINT[k.status],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{k.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {k.period ? formatMonth(`${k.period}-01`) : 'no data'} · {k.ownerName}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <StatusPill status={k.status} />
          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold leading-none text-slate-950 tabular-nums">
          {k.value != null ? formatValue(k.value, k.unit) : '—'}
        </span>
        {k.changePct != null && (
          <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendTint)}>
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            {k.changePct > 0 ? '+' : ''}
            {k.changePct.toFixed(1)}%
            {k.isMaterial && (
              <span className="ml-1 text-[10px] uppercase text-slate-500" title="Material movement versus the prior period">
                significant
              </span>
            )}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Target {k.target != null ? formatValue(k.target, k.unit) : '—'}
        {k.deviationPct != null && (
          <span className={cn('ml-1.5 font-medium', k.deviationPct >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            ({k.deviationPct > 0 ? '+' : ''}
            {k.deviationPct.toFixed(1)}%)
          </span>
        )}
      </p>

    </Link>
  )
}

const PILL: Record<KpiStatusValue, string> = {
  'on-track': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'at-risk': 'bg-amber-50 text-amber-800 ring-amber-200',
  'off-track': 'bg-red-50 text-red-700 ring-red-200',
  'no-data': 'bg-slate-100 text-slate-500 ring-slate-200',
}

function StatusPill({ status }: { status: KpiStatusValue }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
        PILL[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function formatValue(v: number, unit: string): string {
  if (unit === 'currency') {
    if (Math.abs(v) >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `₱${(v / 1_000).toFixed(0)}K`
    return `₱${Math.round(v).toLocaleString()}`
  }
  if (unit === 'percentage') return `${v.toFixed(1)}%`
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return `${v.toFixed(1)}`
}
