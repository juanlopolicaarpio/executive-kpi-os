import { getTelesalesSummary, telesalesDaily, telesalesTrend } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  return Response.json({
    summary: getTelesalesSummary(),
    rows: telesalesDaily,
    trend: telesalesTrend,
  })
}
