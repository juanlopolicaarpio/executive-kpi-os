import type { Kpi, KpiStatus, KpiCategory, KpiCadence, KpiDataPoint } from '@/types/kpi'
import type { UserRole } from '@/types/user'
import { mockKpis } from '@/lib/mock-data/kpis'
import { sessionFetch } from '@/lib/api/session-fetch'

// The KPI registry is now driven ENTIRELY by the backend (/api/kpis/live).
// Every KPI configured in active_kpis is returned. Real values/history appear
// where snapshots exist; KPIs with no data show "Awaiting data" and carry NO
// fabricated numbers. The mock records are used only for narrative metadata
// (strategic purpose, why-it's-core, upload schema) — never for values.

interface LiveKpi {
  slug: string
  appId: string
  name: string
  backendCategory: string
  description: string
  formula: string
  unit: string
  rhythm: string
  ownerName: string
  ownerRole: string
  targetNumeric: number | null
  targetDisplay: string
  targetDirection: string
  hasData: boolean
  currentValue: number | null
  currentValueDisplay: string
  status: KpiStatus
  trend: 'up' | 'down' | 'flat'
  history: KpiDataPoint[]
}

const CATEGORY_MAP: Record<string, KpiCategory> = {
  revenue: 'business-performance',
  profitability: 'profitability',
  acquisition: 'growth-engine',
  operations: 'operations',
  retention: 'growth-engine',
  email: 'growth-engine',
  forecast: 'operations',
  expansion: 'business-performance',
  partner_health: 'operations',
}
const CATEGORY_BY_SLUG: Record<string, KpiCategory> = {
  revenue: 'business-performance',
  gross_profit: 'business-performance',
  gross_margin_pct: 'profitability',
  revenue_forecast: 'operations',
  forecast_variance_vs_plan: 'operations',
  website_visits: 'growth-engine',
  eligible_leads: 'growth-engine',
  approved_applications: 'growth-engine',
  approval_rate: 'growth-engine',
  visit_to_approval_conversion: 'growth-engine',
  paid_acquisition_cpa: 'profitability',
  paid_roas: 'profitability',
  cross_sell_rate: 'growth-engine',
  repeat_product_adoption: 'growth-engine',
  customer_ltv: 'profitability',
  revenue_from_new_verticals: 'business-performance',
  broadband_revenue: 'business-performance',
  partner_sla: 'operations',
  pipeline_value: 'operations',
  net_sales: 'business-performance',
  market_share_overall: 'business-performance',
  market_share_general_health: 'business-performance',
  market_share_sleep_mood: 'business-performance',
  market_share_womens_health: 'business-performance',
  gross_margin: 'profitability',
  marketing_spend_pct_revenue: 'profitability',
  trade_spend_pct_revenue: 'profitability',
  conversion_rate: 'growth-engine',
  sessions: 'growth-engine',
  aov: 'growth-engine',
  affiliate_recruitment: 'growth-engine',
  store_health_score: 'operations',
  oos_rate: 'operations',
}
const ROLE_MAP: Record<string, UserRole> = {
  founder: 'ceo',
  ceo: 'ceo',
  ecomm_lead: 'econs-manager',
  category_lead: 'category-lead',
  ecomm_officer: 'econs-officer',
  affiliate_officer: 'affiliate-officer',
  tts_ops: 'tts-ops',
  shopee_lazada_ops: 'shopee-lazada-ops',
  finance: 'finance',
  brand: 'brand',
  viewer: 'viewer',
}

function nextCheck(rhythm: string): string {
  const d = new Date()
  d.setDate(d.getDate() + (rhythm === 'weekly' ? 7 : rhythm === 'daily' ? 1 : 30))
  return d.toISOString().slice(0, 10)
}

function toKpi(l: LiveKpi): Kpi {
  const meta = mockKpis.find((m) => m.id === l.appId) // narrative metadata only
  return {
    id: l.appId,
    name: l.name,
    category: CATEGORY_BY_SLUG[l.slug] ?? CATEGORY_MAP[l.backendCategory] ?? meta?.category ?? 'business-performance',
    strategicPurpose: meta?.strategicPurpose ?? l.description,
    target: l.targetDisplay,
    targetNumeric: l.targetNumeric ?? undefined,
    currentValue: l.currentValue ?? undefined,
    currentValueDisplay: l.currentValueDisplay,
    cadence: (l.rhythm as KpiCadence) ?? 'monthly',
    nextCheckDate: nextCheck(l.rhythm),
    ownerId: meta?.ownerId ?? 'member',
    ownerName: l.ownerName,
    ownerRole: ROLE_MAP[l.ownerRole] ?? 'viewer',
    type: meta?.type ?? 'track',
    status: l.status,
    platform: meta?.platform ?? 'all',
    trend: l.trend,
    whyItsCore: meta?.whyItsCore ?? l.formula ?? '',
    history: l.history,
    uploadSchemaId: meta?.uploadSchemaId ?? '',
    visibleToRoles: meta?.visibleToRoles ?? ['ceo', 'econs-manager'],
    // 'live' when real snapshots back it; otherwise left unset — the KPI simply
    // has no data yet (it is NOT showing a mock value).
    dataSource: l.hasData ? 'live' : undefined,
    unit: l.unit,
    targetDirection: (l.targetDirection === 'below' ? 'below' : 'above'),
  }
}

interface PeriodOpts { asOf?: string; window?: number; scope?: string }

/**
 * Returns null when the backend is unreachable, and [] when it answered with
 * nothing. The distinction matters: null falls back to mock KPIs, whereas an
 * empty answer is a real result — "you own no KPIs at this scope" — and must
 * not be papered over with fabricated ones.
 */
async function fetchLive(opts?: PeriodOpts): Promise<Kpi[] | null> {
  if (typeof window === 'undefined') return null // client-only fetch
  try {
    const p = new URLSearchParams()
    if (opts?.asOf) p.set('as_of', opts.asOf)
    if (opts?.window) p.set('window', String(opts.window))
    if (opts?.scope) p.set('scope', opts.scope)
    // sessionFetch, not fetch: the server needs to know who is asking before it
    // can decide which KPIs this scope contains.
    const res = await sessionFetch(`/api/kpis/live?${p.toString()}`)
    if (!res.ok) return null
    const rows = (await res.json()) as LiveKpi[]
    return rows.map(toKpi)
  } catch {
    return null
  }
}

export async function getKpis(opts?: PeriodOpts): Promise<Kpi[]> {
  const live = await fetchLive(opts)
  return live ?? mockKpis // mock only if the backend is unreachable
}

export async function getKpiById(id: string, opts?: PeriodOpts): Promise<Kpi | null> {
  // A detail page is a direct object read, not a dashboard view, so it asks for
  // the widest scope and lets the server clamp. A manager keeps working deep
  // links to KPIs they do not personally own; a contributor still gets narrowed
  // to their own, because the clamp happens server-side.
  const all = await getKpis({ ...opts, scope: 'organization' })
  return all.find((k) => k.id === id) ?? null
}
