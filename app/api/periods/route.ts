import { NORTHSTAR_MONTHS } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  return Response.json({ months: NORTHSTAR_MONTHS })
}
