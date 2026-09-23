import { getNorthstarKpis, getNorthstarPerson, NORTHSTAR_AS_OF, NORTHSTAR_ORG, northstarAlerts } from '@/lib/northstar/demo-data'
import { MEMBER_HEADER } from '@/lib/permissions/headers'
import type { KpiStatusValue, TargetDirection } from '@/lib/kpi/status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface AttentionItem {
  id: string
  type:
    | 'kpi-off-track'
    | 'approval-request'
    | 'results-due'
    | 'review-due'
    | 'initiative-overdue'
  title: string
  detail: string
  link: string
  primaryAction: string
  requiresYou: boolean
  magnitude: number
  priority: string
}

export interface HomeKpi {
  slug: string
  appId?: string
  name: string
  unit: string
  ownerName: string
  value: number | null
  target: number | null
  direction: TargetDirection
  status: KpiStatusValue
  ratio: number | null
  deviationPct: number | null
  trend: 'improving' | 'flat' | 'declining'
  changePct: number | null
  isMaterial: boolean
  weight: number
  priority: string
  asOf: string | null
  isStale: boolean
  period: string | null
}

const STATUS_SCORE: Record<KpiStatusValue, number> = {
  'on-track': 100,
  'at-risk': 60,
  'off-track': 20,
  'no-data': 0,
}

function trendName(trend: 'up' | 'down' | 'flat'): HomeKpi['trend'] {
  return trend === 'up' ? 'improving' : trend === 'down' ? 'declining' : 'flat'
}

function ratio(value: number, target: number, direction: TargetDirection) {
  if (target === 0) return null
  return direction === 'below' ? target / value : value / target
}

export async function GET(req: Request): Promise<Response> {
  const qs = new URL(req.url).searchParams
  const requestedScope = qs.get('scope') ?? 'organization'
  const memberId = req.headers.get(MEMBER_HEADER)
  const person = getNorthstarPerson(memberId)
  const allKpis = getNorthstarKpis()
  const kpiSource = requestedScope === 'organization' || person.role === 'ceo'
    ? allKpis
    : allKpis.filter((kpi) => kpi.ownerId === person.memberId)

  const kpis: HomeKpi[] = kpiSource.map((kpi) => {
    const latest = kpi.history.at(-1)!
    const prev = kpi.history.at(-2)
    const changePct = prev?.value ? Math.round(((latest.value - prev.value) / Math.abs(prev.value)) * 1000) / 10 : null
    return {
      slug: kpi.slug,
      appId: kpi.appId,
      name: kpi.name,
      unit: kpi.unit,
      ownerName: kpi.ownerName,
      value: latest.value,
      target: kpi.targetNumeric,
      direction: kpi.targetDirection,
      status: kpi.status,
      ratio: ratio(latest.value, kpi.targetNumeric, kpi.targetDirection),
      deviationPct: kpi.deviationPct,
      trend: trendName(kpi.trend),
      changePct,
      isMaterial: changePct != null && Math.abs(changePct) >= 10,
      weight: kpi.weight,
      priority: kpi.priority,
      asOf: latest.date,
      isStale: false,
      period: latest.date.slice(0, 7),
    }
  })

  const scored = kpis.filter((kpi) => kpi.status !== 'no-data')
  const score = scored.length
    ? Math.round(scored.reduce((sum, kpi) => sum + STATUS_SCORE[kpi.status] * kpi.weight, 0) / scored.reduce((sum, kpi) => sum + kpi.weight, 0))
    : 0
  const counts = {
    'on-track': kpis.filter((kpi) => kpi.status === 'on-track').length,
    'at-risk': kpis.filter((kpi) => kpi.status === 'at-risk').length,
    'off-track': kpis.filter((kpi) => kpi.status === 'off-track').length,
    'no-data': kpis.filter((kpi) => kpi.status === 'no-data').length,
  }

  const attention: AttentionItem[] = kpis
    .filter((kpi) => kpi.status === 'off-track' || kpi.status === 'at-risk')
    .sort((a, b) => Math.abs(b.deviationPct ?? 0) - Math.abs(a.deviationPct ?? 0))
    .slice(0, 12)
    .map((kpi) => ({
      id: `kpi-${kpi.slug}`,
      type: 'kpi-off-track',
      title: kpi.name,
      detail: kpi.deviationPct != null
        ? `${kpi.deviationPct.toFixed(1)}% vs target, owner ${kpi.ownerName}`
        : `Needs attention, owner ${kpi.ownerName}`,
      link: kpi.appId ? `/kpis/${kpi.appId}` : '/kpis',
      primaryAction: 'Open KPI',
      requiresYou: kpi.ownerName === person.name,
      magnitude: Math.abs(kpi.deviationPct ?? 0),
      priority: kpi.priority,
    }))

  const keyKpis = [...kpis]
    .sort((a, b) => {
      const statusRank = (a.status === 'off-track' ? 0 : a.status === 'at-risk' ? 1 : 2) - (b.status === 'off-track' ? 0 : b.status === 'at-risk' ? 1 : 2)
      if (statusRank !== 0) return statusRank
      return Math.abs(b.deviationPct ?? 0) - Math.abs(a.deviationPct ?? 0)
    })
    .slice(0, 6)

  return Response.json({
    available: true,
    org: NORTHSTAR_ORG,
    scope: requestedScope === 'organization' || person.role === 'ceo' ? 'organization' : 'individual',
    health: {
      score,
      band: score >= 80 ? 'Healthy' : score >= 60 ? 'Watch' : 'Needs attention',
      bandStatus: score >= 80 ? 'on-track' : score >= 60 ? 'at-risk' : 'off-track',
      includedCount: scored.length,
      excludedCount: counts['no-data'],
      counts,
    },
    freshness: {
      asOf: NORTHSTAR_AS_OF,
      staleCount: 0,
      staleKpis: [],
    },
    keyKpis,
    kpis,
    activeInitiatives: [],
    activeCount: 0,
    alerts: northstarAlerts,
    attention,
    attentionTotal: attention.length,
    viewer: { memberId: person.memberId, role: person.role },
  })
}
