import { getNorthstarKpis } from '@/lib/northstar/demo-data'
import { MEMBER_HEADER } from '@/lib/permissions/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const qs = new URL(req.url).searchParams
  const asOf = qs.get('as_of') || ''
  const win = Number(qs.get('window')) || 0
  const scope = qs.get('scope') ?? 'organization'
  const memberId = req.headers.get(MEMBER_HEADER)

  let rows = getNorthstarKpis()
  if (scope !== 'organization' && memberId && memberId !== 'ns-ceo') {
    rows = rows.filter((kpi) => kpi.ownerId === memberId)
  }

  return Response.json(rows.map((kpi) => {
    const filteredHistory = kpi.history.filter((point) => !asOf || point.date.slice(0, 7) <= asOf)
    const history = win > 0 ? filteredHistory.slice(-win) : filteredHistory
    const latest = history.at(-1) ?? kpi.history.at(-1)!
    return {
      slug: kpi.slug,
      appId: kpi.appId,
      name: kpi.name,
      backendCategory: kpi.backendCategory,
      description: kpi.description,
      formula: kpi.formula,
      unit: kpi.unit,
      rhythm: kpi.rhythm,
      ownerName: kpi.ownerName,
      ownerRole: kpi.ownerRole,
      targetNumeric: kpi.targetNumeric,
      targetDisplay: kpi.targetDisplay,
      targetDirection: kpi.targetDirection,
      hasData: history.length > 0,
      currentValue: latest.value,
      currentValueDisplay: kpi.currentValueDisplay,
      status: kpi.status,
      deviationPct: kpi.deviationPct,
      trend: kpi.trend,
      history,
    }
  }))
}
