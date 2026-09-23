import { mockChatHistory } from '@/lib/mock-data/chat-history'

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') ?? 'user-ceo'

  const history = mockChatHistory.filter(m => m.userId === userId)
  return Response.json(history)
}
