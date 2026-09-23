'use client'
import { useMemo, useState } from 'react'
import { Plus, Inbox, Search, X, Rocket, Wallet, TrendingUp, Database, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { InitiativeCard } from '@/components/initiatives/InitiativeCard'
import { RecommendationForm } from '@/components/initiatives/RecommendationForm'
import { useInitiativeBoard, useInitiativeStats } from '@/hooks/useInitiatives'
import { useKpis } from '@/hooks/useKpis'
import { SECTION_META, SECTION_ORDER, TYPE_LABELS, PRIORITY_LABELS } from '@/lib/initiatives/lifecycle'
import { APP_ID_TO_SLUG } from '@/lib/kpi-map'
import { formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InitiativeFilters, InitiativeSection, InitiativeType, InitiativePriority } from '@/types/initiative'

// Initiatives — the operating engine. Four sections, never one long list.
// Filters live above the sections they scope, matching the KPI registry.

export default function InitiativesPage() {
  const [section, setSection] = useState<InitiativeSection>('active')
  const [search, setSearch] = useState('')
  const [kpiSlug, setKpiSlug] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [initiativeType, setInitiativeType] = useState('')
  const [priority, setPriority] = useState('')
  const [overdue, setOverdue] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const filters = useMemo<InitiativeFilters>(
    () => ({
      search: search.trim() || undefined,
      kpiSlug: kpiSlug || undefined,
      ownerId: ownerId || undefined,
      initiativeType: (initiativeType as InitiativeType) || undefined,
      priority: (priority as InitiativePriority) || undefined,
      overdue: overdue || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [search, kpiSlug, ownerId, initiativeType, priority, overdue, from, to],
  )

  const { bySection, drafts, approvedNotStarted, needsYou, members, unavailable, viewer, isLoading } =
    useInitiativeBoard(filters)
  const { data: stats } = useInitiativeStats()
  const { data: kpis = [] } = useKpis()

  const activeFilterCount = [
    kpiSlug, ownerId, initiativeType, priority, from, to, search,
    overdue ? 'overdue' : '',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearch('')
    setKpiSlug('')
    setOwnerId('')
    setInitiativeType('')
    setPriority('')
    setOverdue(false)
    setFrom('')
    setTo('')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const visible = bySection[section]

  return (
    <div className="space-y-6">
      {/* Header — the portfolio read, conclusion first */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Initiatives</p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
              {stats && stats.counts.pendingApproval > 0
                ? `${stats.counts.pendingApproval} Awaiting Approval · ${stats.counts.active} Running`
                : stats && stats.counts.active > 0
                  ? `${stats.counts.active} ${stats.counts.active === 1 ? 'Initiative' : 'Initiatives'} in Flight`
                  : 'No Initiatives Running Yet'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Every meaningful activity intended to improve a KPI lives here — campaigns, launches,
              pricing moves, hires, and recovery plans. Each needs approval before it runs, and
              reviewed results before it closes.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New initiative
          </Button>
        </div>

        {stats && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Stat icon={Rocket} label="Active" value={String(stats.counts.active)} />
            <Stat
              icon={Wallet}
              label="Budget in flight"
              value={formatPeso(stats.budget.approvedInFlight)}
            />
            <Stat
              icon={TrendingUp}
              label="Portfolio ROI"
              value={stats.portfolioRoi != null ? `${stats.portfolioRoi.toFixed(0)}%` : '—'}
              hint={stats.portfolioRoi == null ? 'once initiatives close' : undefined}
            />
            <Stat icon={Hourglass} label="Pending approval" value={String(stats.counts.pendingApproval)} />
            <Stat icon={Database} label="Closed" value={String(stats.counts.closed)} />
          </div>
        )}
      </header>

      {unavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Initiatives tables not found</p>
          <p className="mt-1 text-sm text-amber-800">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/007_initiatives.sql + 008_initiative_governance.sql</code>{' '}
            against the live project to enable this page.
          </p>
        </div>
      )}

      {/* Needs you */}
      {needsYou.length > 0 && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-blue-900">Needs you now</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {needsYou.map((initiative) => (
              <InitiativeCard
                key={initiative.id}
                initiative={initiative}
                viewer={viewer}
                emphasize
              />
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      <div className="flex flex-wrap gap-2">
        {SECTION_ORDER.map((key) => {
          const meta = SECTION_META[key]
          const count = bySection[key].length
          return (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                section === key
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              {meta.label}
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                  section === key ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
        {(drafts.length > 0 || approvedNotStarted.length > 0) && (
          <span className="self-center text-xs text-slate-400">
            {drafts.length > 0 && `· ${drafts.length} draft${drafts.length === 1 ? '' : 's'}`}
            {approvedNotStarted.length > 0 &&
              ` · ${approvedNotStarted.length} approved, not started`}
            {' — see All'}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search initiatives"
              className="h-9 pl-8"
              aria-label="Search initiatives"
            />
          </div>

          <FilterSelect value={kpiSlug} onChange={setKpiSlug} label="All KPIs">
            {kpis.map((kpi) => {
              const slug = APP_ID_TO_SLUG[kpi.id]
              return slug ? (
                <option key={slug} value={slug}>
                  {kpi.name}
                </option>
              ) : null
            })}
          </FilterSelect>

          <FilterSelect value={initiativeType} onChange={setInitiativeType} label="All types">
            {(Object.keys(TYPE_LABELS) as InitiativeType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={ownerId} onChange={setOwnerId} label="All owners">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={priority} onChange={setPriority} label="All priorities">
            {(Object.keys(PRIORITY_LABELS) as InitiativePriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </FilterSelect>

          <button
            type="button"
            onClick={() => setOverdue((o) => !o)}
            className={cn(
              'h-9 rounded-md border px-3 text-sm font-medium transition-colors',
              overdue
                ? 'border-orange-300 bg-orange-50 text-orange-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            Overdue only
          </button>

          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-auto"
            aria-label="Running on or after"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-auto"
            aria-label="Running on or before"
          />

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5">
              <X className="h-3.5 w-3.5" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* The list */}
      <section>
        <p className="mb-2.5 text-xs text-slate-500">{SECTION_META[section].description}</p>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Nothing in {SECTION_META[section].label.toLowerCase()}
            </p>
            <p className="text-xs text-slate-400">
              {activeFilterCount > 0
                ? 'Try clearing the filters.'
                : section === 'active'
                  ? 'Launch an initiative to start improving a KPI.'
                  : 'It will appear here as initiatives move through the lifecycle.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((initiative) => (
              <InitiativeCard key={initiative.id} initiative={initiative} viewer={viewer} />
            ))}
          </div>
        )}
      </section>

      <RecommendationForm open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
}) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-400" aria-hidden />
      <span className="text-xl font-semibold leading-none text-slate-950 tabular-nums">{value}</span>
      <span className="text-sm text-slate-500">
        {label}
        {hint && <span className="ml-1 text-xs text-slate-400">({hint})</span>}
      </span>
    </span>
  )
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn(
        'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm',
        value ? 'text-slate-900' : 'text-slate-500',
      )}
    >
      <option value="">{label}</option>
      {children}
    </select>
  )
}
