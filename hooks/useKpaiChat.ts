'use client'
import { useChat } from '@ai-sdk/react'
import { useSession } from './useSession'
import { DefaultChatTransport } from 'ai'

export function useKpaiChat() {
  const { user } = useSession()

  return useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { userId: user.id },
    }),
  })
}
