import { createClient } from '@supabase/supabase-js'
import { formatDay, formatMonth } from '@/lib/format'
import type {
  CompanyContext,
  KpiContextItem,
  MissContextItem,
  PlanContextItem,
} from '@/types/chat'
import type { UserRole } from '@/types/user'
import { mockUsers } from '@/lib/mock-data/users'
import { buildInitiativeContext } from '@/lib/ai/initiative-context'
import { computeStatus, parseThresholds, DEFAULT_THRESHOLDS, type TargetDirection } from '@/lib/kpi/status'

// Builds the AI chat context from the real KPAI OS backend (kpi_snapshots,
// active_kpis, tickets, raw_syncs) so the assistant analyses actual numbers.
// Server-side only (service-role). Falls back to null so the caller can use
// mock if the backend is unreachable.

const UNIT_FMT: Record<string, (v: number) => string> = {
  currency: (v) => (v >= 1_000_000 ? `₱${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₱${(v / 1000).toFixed(0)}K` : `₱${v.toFixed(0)}`),
  percentage: (v) => `${v.toFixed(1)}%`,
  number: (v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v.toFixed(1)}`),
  ratio: (v) => `${v.toFixed(2)}x`,
}
const fmt = (v: number | null, unit: string) => (v == null ? '—' : (UNIT_FMT[unit] ?? String)(v))

type Snap = { kpi_slug: string; value: number; target_value: number | null; status: string; deviation_pct: number | null; computed_at: string }

const MONTHS: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
}

const KPI_ALIASES: Record<string, string[]> = {
  revenue: ['sales', 'revenue', 'topline'],
  gross_profit: ['gross profit', 'gp'],
  gross_margin: ['gross margin', 'margin'],
  revenue_forecast: ['forecast', 'revenue forecast'],
  forecast_variance_vs_plan: ['forecast variance', 'variance vs plan'],
  website_visits: ['traffic', 'website visits', 'visits'],
  eligible_leads: ['eligible leads'],
  approved_applications: ['approved applications', 'approvals'],
  approval_rate: ['approval rate'],
  visit_to_approval_conversion_rate: ['visit to approval', 'conversion rate'],
  paid_acquisition_cpa: ['cpa', 'paid acquisition cpa'],
  paid_roas: ['roas'],
  cross_sell_rate: ['cross sell', 'cross-sell'],
  repeat_product_adoption: ['repeat product', 'repeat adoption'],
  customer_ltv: ['ltv', 'customer lifetime value'],
  revenue_from_new_verticals: ['new verticals', 'vertical revenue'],
  broadband_revenue: ['broadband'],
  partner_sla: ['partner sla', 'sla'],
  pipeline_value: ['pipeline value'],
}

function contextPlan(question?: string): {
  slugs: Set<string>
  periodMonths: Set<string>
  year: string | null
  hasSpecificDate: boolean
  hasSpecificKpi: boolean
} {
  const q = (question ?? '').toLowerCase()
  const slugs = new Set<string>()
  for (const [slug, aliases] of Object.entries(KPI_ALIASES)) {
    if (aliases.some((alias) => q.includes(alias))) slugs.add(slug)
  }

  const periodMonths = new Set<string>()
  for (const match of q.matchAll(/\b([a-z]+)\s+(20\d{2})\b/g)) {
    const month = MONTHS[match[1] ?? '']
    if (month && match[2]) periodMonths.add(`${match[2]}-${month}`)
  }
  for (const match of q.matchAll(/\b(20\d{2})-(0[1-9]|1[0-2])\b/g)) {
    if (match[1] && match[2]) periodMonths.add(`${match[1]}-${match[2]}`)
  }

  const year = periodMonths.size === 0 ? (q.match(/\b(20\d{2})\b/)?.[1] ?? null) : null

  return {
    slugs,
    periodMonths,
    year,
    hasSpecificDate: periodMonths.size > 0 || year != null,
    hasSpecificKpi: slugs.size > 0,
  }
}

function relevantSeries(series: Snap[], plan: ReturnType<typeof contextPlan>): Snap[] {
  if (plan.periodMonths.size > 0) {
    return series.filter((s) => plan.periodMonths.has(String(s.computed_at).slice(0, 7)))
  }
  if (plan.year) {
    const year = plan.year
    return series.filter((s) => String(s.computed_at).startsWith(year))
  }
  return series.slice(-6)
}

export async function buildRealContext(
  userId: string,
  userRole: UserRole,
  question?: string,
  viewer?: { id: string; name: string; role: string },
): Promise<CompanyContext | null> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } })
    const plan = contextPlan(question)
    const { data: org } = await sb.from('organizations').select('id,name').eq('slug', 'northstar-demo').single()
    if (!org) return null

    const [{ data: defs }, { data: aks }, { data: members }, { data: snaps }, { data: tickets }, { data: syncs }] = await Promise.all([
      sb.from('kpi_definitions').select('id,slug,name,unit'),
      sb.from('active_kpis').select('*').eq('org_id', org.id).eq('is_archived', false),
      sb.from('members').select('id,name,role').eq('org_id', org.id),
      sb.from('kpi_snapshots').select('kpi_slug,value,target_value,status,deviation_pct,computed_at').eq('org_id', org.id).order('computed_at', { ascending: true }),
      sb.from('tickets').select('id,kpi_slug,status,diagnosis,committed_action,committed_deadline,owner_id').eq('org_id', org.id).in('status', ['open', 'committed', 'in_progress', 'overdue', 'under_evaluation']),
      sb.from('raw_syncs').select('data_type,record_count,period_start,period_end,synced_at').eq('org_id', org.id).order('synced_at', { ascending: false }).limit(10),
    ])

    const defById = Object.fromEntries((defs ?? []).map((d) => [d.id, d]))
    const memberName = Object.fromEntries((members ?? []).map((m) => [m.id, m.name]))
    const bySlug: Record<string, Snap[]> = {}
    for (const s of (snaps ?? []) as Snap[]) (bySlug[s.kpi_slug] ??= []).push(s)
    const ticketBySlug: Record<string, { committed_action: string | null }> = {}
    for (const t of tickets ?? []) if (t.kpi_slug) ticketBySlug[t.kpi_slug] = t

    let onTrack = 0, missed = 0, lastUpdated = ''
    const kpis: KpiContextItem[] = []
    const recentMisses: MissContextItem[] = []

    for (const a of aks ?? []) {
      const def = defById[a.kpi_def_id]; if (!def) continue
      if (plan.hasSpecificKpi && !plan.slugs.has(def.slug)) continue
      const unit = def.unit
      const allSeries = bySlug[def.slug] ?? []
      const series = relevantSeries(allSeries, plan)
      if (plan.hasSpecificDate && series.length === 0) continue
      const latest = series[series.length - 1]
      const prev = series[series.length - 2]
      const owner = memberName[a.owner_id ?? ''] ?? 'Unassigned'
      const target = a.target_value != null ? Number(a.target_value) : null
      const direction = (a.target_direction as TargetDirection) ?? 'above'
      let status = 'pending-data', trend = 'flat'
      if (latest) {
        const computed = computeStatus({
          value: latest.value,
          target,
          direction,
          lower: a.target_lower != null ? Number(a.target_lower) : null,
          upper: a.target_upper != null ? Number(a.target_upper) : null,
          thresholds: a.thresholds ? parseThresholds(a.thresholds) : DEFAULT_THRESHOLDS,
        })
        status = computed.status
        trend = !prev
          ? 'flat'
          : direction === 'below'
            ? latest.value < prev.value * 0.99 ? 'up' : latest.value > prev.value * 1.01 ? 'down' : 'flat'
            : latest.value > prev.value * 1.01 ? 'up' : latest.value < prev.value * 0.99 ? 'down' : 'flat'
        if (latest.computed_at > lastUpdated) lastUpdated = latest.computed_at
        if (status === 'on-track') onTrack++; else if (status === 'off-track') missed++
      }

      kpis.push({
        id: def.slug, name: def.name, status,
        currentValue: latest ? fmt(latest.value, unit) : 'awaiting data',
        target: target != null ? fmt(target, unit) : '—',
        trend, cadence: a.rhythm ?? 'monthly', lastChecked: latest ? formatDay(latest.computed_at) : '—',
        asOf: latest?.computed_at?.slice(0, 10),
        isStale: false,
        ownerName: owner, platform: 'all',
        recentHistory: series.map((s) => ({ date: formatMonth(s.computed_at), value: Math.round(s.value * 100) / 100, target: s.target_value != null ? Number(s.target_value) : 0 })),
        latestPlan: ticketBySlug[def.slug]?.committed_action ?? undefined,
      })

      if (!plan.hasSpecificDate && latest && status !== 'on-track') {
        // consecutive off-target snapshots
        let cons = 0
        for (let i = series.length - 1; i >= 0 && series[i]!.status !== 'on_track'; i--) cons++
        recentMisses.push({
          kpiName: def.name, actual: fmt(latest.value, unit), target: target != null ? fmt(target, unit) : '—',
          missedOn: formatDay(latest.computed_at), consecutiveMisses: cons, ownerName: owner,
        })
      }
    }

    const openPlans: PlanContextItem[] = (tickets ?? []).filter((t) => t.committed_action).map((t) => ({
      id: t.id, kpiName: t.kpi_slug ?? '—', ownerName: memberName[t.owner_id ?? ''] ?? 'Unassigned',
      status: t.status ?? 'open', summary: t.committed_action ?? '', rootCause: t.diagnosis ?? '',
      targetDate: t.committed_deadline ? String(t.committed_deadline).slice(0, 10) : '—', failedPreviousApproaches: [],
    }))

    const user = mockUsers.find((u) => u.id === userId) ?? mockUsers[0]!
    const initiativeCtx = await buildInitiativeContext(sb, org.id)
    const peoplePerformance = (members ?? []).map((m) => {
      const owned = kpis.filter((k) => k.ownerName === m.name)
      return {
        memberId: m.id,
        name: m.name,
        role: m.role ?? 'member',
        ownedKpiCount: owned.length,
        onTrack: owned.filter((k) => k.status === 'on-track').length,
        offTrack: owned.filter((k) => k.status === 'off-track').length,
        noData: owned.filter((k) => k.status === 'no-data' || k.status === 'pending-data').length,
        latestAsOf: owned.map((k) => k.asOf).filter(Boolean).sort().pop(),
        cadences: Array.from(new Set(owned.map((k) => k.cadence ?? 'monthly'))).sort(),
        kpis: owned.map((k) => ({
          name: k.name,
          status: k.status,
          currentValue: k.currentValue,
          target: k.target,
          cadence: k.cadence ?? 'monthly',
          asOf: k.asOf,
          isStale: false,
        })),
      }
    })

    return {
      user: {
        id: viewer?.id ?? user.id,
        name: viewer?.name ?? user.name,
        role: viewer?.role ?? userRole,
        ownedKpis: [],
      },
      kpis, openPlans, recentMisses,
      marketWatch: [],
      ...initiativeCtx,
      peoplePerformance,
      recentUploads: (syncs ?? []).map((s) => ({
        kpiName: `${s.data_type} (CSV)`,
        uploadedAt: String(s.synced_at).slice(0, 10),
        status: `completed, ${s.record_count ?? 0} periods from ${String(s.period_start).slice(0, 10)} to ${String(s.period_end).slice(0, 10)}`,
        uploadedByName: 'CSV import',
      })),
      orgSummary: { totalKpis: (aks ?? []).length, onTrack, atRisk: 0, missed, lastUpdated: lastUpdated.slice(0, 10) || new Date().toISOString().slice(0, 10) },
    }
  } catch {
    return null
  }
}
