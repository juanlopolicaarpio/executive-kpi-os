export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  return Response.json({
    periods: ['2026-08'],
    platforms: ['Paid Search', 'Paid Social', 'Affiliate', 'CRM', 'Offline/Corporate'],
    categories: ['Revenue Mix'],
    cells: [],
    overall: {
      blendedPct: null,
      byCategory: [],
      platformsInBlend: [],
      excluded: [],
    },
    note: 'Northstar demo uses revenue mix and partner health instead of ecommerce market-share tracking.',
  })
}
