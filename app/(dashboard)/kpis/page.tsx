'use client'
import { useState } from 'react'
import { CheckCircle2, AlertOctagon, CircleDashed, Plus } from 'lucide-react'
import { KpiCard } from '@/components/kpis/KpiCard'
import { CreateKpiDialog } from '@/components/kpis/CreateKpiDialog'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/useInitiatives'
import { can } from '@/lib/permissions/capabilities'
import { useKpis } from '@/hooks/useKpis'
import { SCOPE_LABELS } from '@/store/scopeStore'
import { useActiveScope } from '@/hooks/useScope'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS } from '@/components/charts/viz'
import { formatMonth } from '@/lib/format'
import type { Kpi, KpiCategory } from '@/types/kpi'
import { cn } from '@/lib/utils'

// Driven entirely by the backend (useKpis -> /api/kpis/live). No mock data.
// KPIs without snapshots are shown honestly as "Awaiting data" — never invented.

type TabValue = 'all' | KpiCategory

const CATEGORY_LABELS: Record<KpiCategory, string> = {
  'business-performance': 'Business Performance',
  profitability: 'Profitability',
  'growth-engine': 'Growth Engine',
  operations: 'Operations',
}
const CATEGORIES: KpiCategory[] = ['business-performance', 'profitability', 'growth-engine', 'operations']

export default function KpiRegistryPage() {
  const [tab, setTab] = useState<TabValue>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const { data: kpis, isLoading } = useKpis()
  const { data: me } = useMe()
  const scope = useActiveScope()
  const mayCreate = me ? can(me.role, 'kpi:create') : false

  if (isLoading || !kpis) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const onTrack = kpis.filter((k) => k.status === 'on-track').length
  const offTarget = kpis.filter((k) => k.status === 'off-track').length
  const awaiting = kpis.filter((k) => k.status === 'no-data').length

  const takeaway =
    kpis.length === 0
      ? scope === 'individual'
        ? 'No KPIs Are Assigned To You'
        : 'No KPIs Are Configured Yet'
      : offTarget >= 3
        ? `${offTarget} KPIs Off Target - Recovery Plans Required`
        : offTarget > 0
          ? `${offTarget} KPI${offTarget > 1 ? 's' : ''} Off Target`
          : `All ${onTrack} Tracked KPIs On Target`

  // The period the values are "as of" — the latest history point among KPIs with
  // data. Changes when the Time Bar is stepped, so the header reflects the scope.
  const asOfDate = kpis
    .flatMap((k) => (k.history.length ? [k.history[k.history.length - 1]!.date] : []))
    .sort()
    .pop()

  const visible: Kpi[] = tab === 'all' ? kpis : kpis.filter((k) => k.category === tab)
  // Off-target first, awaiting-data last — the list leads with what needs action.
  const rank = (k: Kpi) =>
    k.status === 'off-track' ? 0 : k.status === 'on-track' ? 1 : 2
  const sorted = [...visible].sort((a, b) => rank(a) - rank(b))

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        {mayCreate && (
          <div className="float-right">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New KPI
            </Button>
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          KPIs · {SCOPE_LABELS[scope]}
          {asOfDate && <span className="ml-1.5 normal-case text-slate-500">· as of {formatMonth(asOfDate)}</span>}
        </p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{takeaway}</h1>
        {kpis.length === 0 ? (
          // Say WHY it is empty. "No KPIs" on its own reads as a broken app; the
          // real reason is almost always the scope, which is one click away.
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {scope === 'individual'
              ? 'Nobody has assigned you a KPI to own yet. Switch the scope above to Organization to see the whole company, or ask an admin to make you an owner.'
              : 'No KPIs have been configured for this organization yet.'}
          </p>
        ) : (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {scope === 'individual'
              ? `${kpis.length} KPI${kpis.length === 1 ? '' : 's'} you personally own.`
              : `${kpis.length} KPIs configured against your plan.`}{' '}
            {plural(kpis.length - awaiting, 'is', 'are')} backed by real data; {plural(awaiting, 'is', 'are')} awaiting {awaiting === 1 ? 'its source file' : 'their source files'}. Use the date bar above to view any month. Select a KPI for its full trend.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Tally icon={AlertOctagon} color={STATUS.critical} count={offTarget} label="Off target" />
          <Tally icon={CheckCircle2} color={STATUS.good} count={onTrack} label="On target" />
          <Tally icon={CircleDashed} color="#898781" count={awaiting} label="Awaiting data" />
        </div>
      </header>

      {/* One filter row, above everything it scopes */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...CATEGORIES] as TabValue[]).map((value) => {
          const count = value === 'all' ? kpis.length : kpis.filter((k) => k.category === value).length
          const label = value === 'all' ? 'All KPIs' : CATEGORY_LABELS[value]
          return (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                tab === value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              {label}
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                  tab === value ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">No KPIs in this category.</p>
      )}

      <CreateKpiDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function plural(count: number, singular: string, multiple: string): string {
  return `${count} ${count === 1 ? singular : multiple}`
}

function Tally({ icon: Icon, color, count, label }: { icon: React.ElementType; color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color }} aria-hidden />
      <span className="text-xl font-semibold leading-none text-slate-950">{count}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </span>
  )
}
