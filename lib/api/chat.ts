import type { ChatMessage } from '@/types/chat'
import { mockChatHistory } from '@/lib/mock-data/chat-history'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  if (USE_MOCK) {
    return mockChatHistory.filter(m => m.userId === userId)
  }
  throw new Error('Live DB not configured')
}

export async function saveChatMessage(
  message: Omit<ChatMessage, 'id' | 'createdAt'>
): Promise<void> {
  void message
  if (USE_MOCK) return // In mock mode, no persistence
  throw new Error('Live DB not configured')
}
