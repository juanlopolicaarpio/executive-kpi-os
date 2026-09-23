import { affiliateMarketing, getNorthstarKpis, partnerHealth, revenueMix, telesalesDaily, verticalExpansion } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ kpiId: string }> }): Promise<Response> {
  const { kpiId } = await params
  const kpi = getNorthstarKpis().find((row) => row.appId === kpiId || row.slug === kpiId)
  if (!kpi) return Response.json({ error: 'KPI not found' }, { status: 404 })

  const byMonth = new Map<string, { date: string; value: number; target: number }>()
  for (const point of kpi.history) {
    byMonth.set(point.date.slice(0, 7), point)
  }

  const series = Array.from(byMonth.entries()).map(([period, point]) => ({
    period,
    date: point.date,
    value: point.value,
    target: point.target,
    status: kpi.status === 'on-track' ? 'on_track' : 'off_track',
  }))

  const latestByPlatform =
    kpi.slug === 'revenue_from_new_verticals' || kpi.slug === 'broadband_revenue'
      ? verticalExpansion.filter((row) => row.vertical !== 'Core Financial Products' && row.vertical !== 'Future Verticals Pipeline')
        .map((row) => ({ platform: row.vertical, value: row.revenue }))
      : kpi.slug === 'partner_sla'
        ? partnerHealth.map((row) => ({ platform: row.partner, value: row.slaRate }))
      : kpi.slug === 'revenue'
        ? revenueMix.filter((row) => row.dimension === 'Product').map((row) => ({ platform: row.category, value: row.revenue }))
        : kpi.slug === 'affiliate_revenue' || kpi.slug === 'affiliate_approved_conversions'
          ? affiliateMarketing.map((row) => ({
            platform: row.affiliateName,
            value: kpi.slug === 'affiliate_revenue' ? row.revenue : row.approvedConversions,
          }))
          : kpi.slug === 'telesales_approved_applications' || kpi.slug === 'telesales_contact_rate' || kpi.slug === 'telesales_revenue'
            ? Array.from(
              telesalesDaily.reduce((map, row) => {
                const current = map.get(row.team) ?? { platform: row.team, approvals: 0, calls: 0, contacts: 0, revenue: 0 }
                current.approvals += row.approvedApplications
                current.calls += row.callsMade
                current.contacts += row.contactsMade
                current.revenue += row.revenue
                map.set(row.team, current)
                return map
              }, new Map<string, { platform: string; approvals: number; calls: number; contacts: number; revenue: number }>())
              .values(),
            ).map((row) => ({
              platform: row.platform,
              value: kpi.slug === 'telesales_contact_rate'
                ? row.calls === 0 ? 0 : (row.contacts / row.calls) * 100
                : kpi.slug === 'telesales_revenue'
                  ? row.revenue
                  : row.approvals,
            }))
            : []

  const byPlatform = Object.fromEntries(
    latestByPlatform.map((row) => [
      row.platform,
      series.map((point) => ({ period: point.period, value: row.value })),
    ]),
  )

  return Response.json({
    meta: {
      slug: kpi.slug,
      name: kpi.name,
      unit: kpi.unit,
      target: kpi.targetNumeric,
      direction: kpi.targetDirection,
      rhythm: kpi.rhythm,
      ownerName: kpi.ownerName,
      formula: kpi.formula,
      hasData: true,
    },
    series,
    byPlatform,
    latestByPlatform,
    competitors: [],
    brands: [],
  })
}
