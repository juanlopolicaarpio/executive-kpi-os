import { getNorthstarKpis, NORTHSTAR_MONTHS, NORTHSTAR_ORG } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface TodayKpi {
  slug: string
  appId: string
  name: string
  unit: string
  rhythm: string
  ownerName: string
  period: string
  value: number
  valueDisplay: string
  target: number | null
  targetDisplay: string
  targetDirection: 'above' | 'below'
  deviationPct: number | null
  onTrack: boolean
  trend: 'up' | 'down' | 'flat'
  momPct: number | null
  change: null | { kind: 'flipped-off' | 'flipped-on' | 'moved'; note: string }
}

export async function GET(req: Request): Promise<Response> {
  const asOf = new URL(req.url).searchParams.get('as_of')
  const viewMonth = asOf && NORTHSTAR_MONTHS.includes(asOf) ? asOf : NORTHSTAR_MONTHS.at(-1)!

  const kpis: TodayKpi[] = getNorthstarKpis().map((kpi) => {
    const series = kpi.history.filter((point) => point.date.slice(0, 7) <= viewMonth)
    const latest = series.at(-1) ?? kpi.history.at(-1)!
    const prev = series.at(-2)
    const momPct = prev?.value ? Math.round(((latest.value - prev.value) / Math.abs(prev.value)) * 1000) / 10 : null
    const moved = momPct != null && Math.abs(momPct) >= 10
    return {
      slug: kpi.slug,
      appId: kpi.appId,
      name: kpi.name,
      unit: kpi.unit,
      rhythm: kpi.rhythm,
      ownerName: kpi.ownerName,
      period: latest.date.slice(0, 7),
      value: latest.value,
      valueDisplay: kpi.currentValueDisplay,
      target: kpi.targetNumeric,
      targetDisplay: kpi.targetDisplay,
      targetDirection: kpi.targetDirection === 'below' ? 'below' : 'above',
      deviationPct: kpi.deviationPct,
      onTrack: kpi.status === 'on-track',
      trend: kpi.trend,
      momPct,
      change: moved ? { kind: 'moved', note: `${momPct! > 0 ? '+' : ''}${momPct}% vs prior period` } : null,
    }
  })

  return Response.json({
    org: NORTHSTAR_ORG,
    viewMonth,
    months: [...NORTHSTAR_MONTHS].reverse(),
    kpis,
  })
}
