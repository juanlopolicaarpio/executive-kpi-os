'use client'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, AlertOctagon, CircleDashed, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiDrilldown, type DrillData } from '@/components/kpis/KpiDrilldown'
import { KpiInitiatives } from '@/components/initiatives/KpiInitiatives'
import { KpiAiInsight } from '@/components/kpis/KpiAiInsight'
import { RecommendationCards } from '@/components/ai/RecommendationCards'
import { useKpiById } from '@/hooks/useKpis'
import { usePeriodStore } from '@/store/periodStore'
import { APP_ID_TO_SLUG } from '@/lib/kpi-map'
import { STATUS } from '@/components/charts/viz'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMonth, formatDelta } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function KpiDetailPage() {
  const params = useParams()
  const router = useRouter()
  const kpiId = params['kpiId'] as string
  const kpiSlug = APP_ID_TO_SLUG[kpiId]

  const { data: kpi, isLoading } = useKpiById(kpiId)

  const asOf = usePeriodStore((s) => s.asOf)
  const windowMonths = usePeriodStore((s) => s.windowMonths)
  const { data: drill } = useQuery<DrillData | null>({
    queryKey: ['kpi-drill', kpiId, asOf, windowMonths],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (asOf) p.set('as_of', asOf)
      if (windowMonths) p.set('window', String(windowMonths))
      const r = await fetch(`/api/kpis/${kpiId}/drill?${p.toString()}`)
      return r.ok ? r.json() : null
    },
    placeholderData: (prev) => prev,
  })

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />
  if (!kpi) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/kpis')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to KPI Registry
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">KPI not found.</p>
      </div>
    )
  }

  const awaiting = kpi.status === 'no-data'
  const onTrack = kpi.status === 'on-track'
  const StatusIcon = awaiting ? CircleDashed : onTrack ? CheckCircle2 : AlertOctagon
  const statusColor = awaiting ? '#898781' : onTrack ? STATUS.good : STATUS.critical
  const statusLabel = awaiting ? 'Awaiting data' : onTrack ? 'On track' : 'Off target'

  const series = drill?.series ?? []
  const latest = series[series.length - 1]
  const prev = series[series.length - 2]
  const mom = latest && prev?.value ? Math.round(((latest.value - prev.value) / Math.abs(prev.value)) * 100) : 0
  const attainment = drill?.meta.target && latest
    ? Math.round((drill.meta.direction === 'above' ? latest.value / drill.meta.target : drill.meta.target / latest.value) * 100)
    : null
  const targetDirection = drill?.meta.direction === 'below' ? 'below' : 'above'
  const targetStatLabel = targetDirection === 'below' ? 'Target variance' : 'Attainment'
  const targetStatValue = latest && drill?.meta.target
    ? formatTargetStat(latest.value, drill.meta.target, targetDirection, attainment)
    : '—'
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push('/kpis')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to KPIs
        </Button>
      </div>

      {/* The KPI is the point — lead with the number, the target, and who owns it. */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{kpi.name}</h1>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ color: statusColor, background: `${statusColor}14` }}
              >
                <StatusIcon className="h-3 w-3" aria-hidden /> {statusLabel}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{kpi.strategicPurpose}</p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-semibold leading-none text-slate-950">{kpi.currentValueDisplay}</p>
            <p className="mt-1.5 text-xs text-slate-500">Target {kpi.target}</p>
            {latest && <p className="mt-1 text-[11px] font-medium text-slate-400">as of {formatMonth(`${latest.period}-01`)}</p>}
          </div>
        </div>

        {/* Supporting stats — the numbers that qualify the headline */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Stat label={targetStatLabel} value={targetStatValue}
            tone={attainment != null && attainment >= 100 ? 'good' : attainment != null ? 'bad' : 'muted'} />
          <Stat label="Change vs prior month" value={latest && prev ? formatDelta(mom) : '—'}
            tone={mom > 0 ? 'good' : mom < 0 ? 'bad' : 'muted'} />
          <Stat label="Owner" value={drill?.meta.ownerName ?? kpi.ownerName} />
          <Stat label="Cadence" value={kpi.cadence.charAt(0).toUpperCase() + kpi.cadence.slice(1)} />
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <TrendIcon className="h-3 w-3" aria-hidden />
          {drill?.meta.formula ? `Computed as: ${drill.meta.formula}` : kpi.whyItsCore}
        </p>
      </header>

      {/* Drill-down: trend / by platform / table (+ competitors for market share) */}
      {drill && <KpiDrilldown data={drill} />}

      {/* AI insight — what changed, drivers as hypotheses, limitations (§6.2) */}
      <KpiAiInsight kpiId={kpiId} />

      {/* §9.4 — an off-track KPI is exactly where a recommendation belongs, so
          it loads automatically there and stays on request elsewhere. */}
      {kpiSlug && (
        <RecommendationCards
          kpiSlug={kpiSlug}
          title={`What to do about ${kpi.name}`}
          auto={kpi.status === 'off-track'}
        />
      )}

      {/* What we're doing about it — the measurement-to-action bridge. Recovery
          plans live here too, as initiatives of type 'recovery'. */}
      {kpiSlug && (
        <KpiInitiatives
          kpiSlug={kpiSlug}
          kpiName={kpi.name}
          offTarget={kpi.status === 'off-track'}
        />
      )}
    </div>
  )
}

function formatTargetStat(value: number, target: number, direction: 'above' | 'below', attainment: number | null) {
  if (direction === 'above') return attainment != null ? `${attainment}%` : '—'
  if (target === 0) return '—'
  if (value <= target) return 'Within target'
  const multiple = value / target
  return `${formatMultiple(multiple)} higher`
}

function formatMultiple(value: number) {
  if (value >= 10) return `${Math.round(value)}x`
  return `${Number(value.toFixed(1)).toString()}x`
}

function Stat({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'good' | 'bad' | 'muted' }) {
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : 'text-slate-900'
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold', color)}>{value}</p>
    </div>
  )
}
