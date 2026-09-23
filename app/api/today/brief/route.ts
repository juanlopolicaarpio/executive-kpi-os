import { getNorthstarKpis, getNorthstarPerson } from '@/lib/northstar/demo-data'
import { MEMBER_HEADER } from '@/lib/permissions/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const person = getNorthstarPerson(req.headers.get(MEMBER_HEADER))
  const kpis = getNorthstarKpis()
  const revenue = kpis.find((kpi) => kpi.slug === 'revenue')!
  const forecast = kpis.find((kpi) => kpi.slug === 'revenue_forecast')!
  const visits = kpis.find((kpi) => kpi.slug === 'website_visits')!
  const approvals = kpis.find((kpi) => kpi.slug === 'approved_applications')!
  const crossSell = kpis.find((kpi) => kpi.slug === 'cross_sell_rate')!

  return Response.json({
    brief: `${person.name.split(' ')[0]}, revenue is still behind plan at **${revenue.currentValueDisplay}** versus **${revenue.targetDisplay}**, and the month-end forecast remains below plan at **${forecast.currentValueDisplay}**. Start with traffic and approvals: visits are **${visits.currentValueDisplay}** and approved applications are **${approvals.currentValueDisplay}**. The strongest offset is lifecycle performance, with cross-sell at **${crossSell.currentValueDisplay}**.`,
    fallback: true,
  })
}
