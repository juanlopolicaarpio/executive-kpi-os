import { getNorthstarKpis, northstarPeople, NORTHSTAR_AS_OF } from '@/lib/northstar/demo-data'
import { MEMBER_HEADER } from '@/lib/permissions/headers'
import type { KpiStatusValue } from '@/lib/kpi/status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUS_SCORE: Record<KpiStatusValue, number> = {
  'on-track': 100,
  'at-risk': 60,
  'off-track': 20,
  'no-data': 0,
}

export async function GET(req: Request): Promise<Response> {
  const actingMember = req.headers.get(MEMBER_HEADER)
  const acting = northstarPeople.find((p) => p.memberId === actingMember) ?? northstarPeople[0]!
  const kpis = getNorthstarKpis()
  const visiblePeople = acting.role === 'ceo' || acting.role === 'econs-manager'
    ? northstarPeople
    : northstarPeople.filter((p) => p.memberId === acting.memberId)

  const people = visiblePeople.map((person) => {
    const owned = person.role === 'ceo' ? kpis : kpis.filter((kpi) => kpi.ownerId === person.memberId)
    const counts = {
      'on-track': owned.filter((kpi) => kpi.status === 'on-track').length,
      'at-risk': owned.filter((kpi) => kpi.status === 'at-risk').length,
      'off-track': owned.filter((kpi) => kpi.status === 'off-track').length,
      'no-data': 0,
    }
    const score = owned.length
      ? Math.round(owned.reduce((sum, kpi) => sum + STATUS_SCORE[kpi.status], 0) / owned.length)
      : null

    return {
      id: person.memberId,
      name: person.name,
      email: person.email,
      role: person.dbRole,
      roleLabel: person.roleLabel,
      score,
      counts,
      latestAsOf: NORTHSTAR_AS_OF,
      cadences: Array.from(new Set(owned.map((kpi) => kpi.rhythm))).sort(),
      kpis: owned.map((kpi) => ({
        activeKpiId: kpi.appId,
        slug: kpi.slug,
        name: kpi.name,
        category: kpi.category,
        unit: kpi.unit,
        rhythm: kpi.rhythm,
        currentValue: kpi.currentValue,
        target: kpi.targetNumeric,
        status: kpi.status,
        ratio: kpi.targetNumeric === 0 ? null : kpi.currentValue / kpi.targetNumeric,
        deviationPct: kpi.deviationPct,
        trend: kpi.trend === 'up' ? 'improving' : kpi.trend === 'down' ? 'declining' : 'flat',
        asOf: NORTHSTAR_AS_OF,
        isStale: false,
      })),
    }
  })

  people.sort((a, b) => b.counts['off-track'] - a.counts['off-track'])

  return Response.json({
    available: true,
    latestAsOf: NORTHSTAR_AS_OF,
    people,
    scopedToSelf: visiblePeople.length === 1 && acting.role !== 'ceo',
  })
}
