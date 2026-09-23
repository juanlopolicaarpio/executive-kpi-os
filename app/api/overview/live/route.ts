export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const url = new URL('/api/data/live', req.url)
  return fetch(url)
}
