'use client'
import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useUiStore } from '@/store/uiStore'
import { useSession } from '@/hooks/useSession'
import { useMe } from '@/hooks/useInitiatives'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatSuggestedPrompts } from './ChatSuggestedPrompts'
import { MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sessionHeaders } from '@/lib/api/session-fetch'

export function ChatPanel() {
  const { isChatOpen, setChatOpen, currentUserId } = useUiStore()
  const { user } = useSession()
  const { data: me } = useMe()
  const [pendingPrompt, setPendingPrompt] = useState('')

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: () => sessionHeaders() as Record<string, string>,
      body: { userId: currentUserId },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSend = (text: string) => {
    setPendingPrompt('')
    clearError()
    sendMessage({ text })
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setPendingPrompt(prompt)
  }

  if (!isChatOpen) return null

  return (
    <div className="fixed inset-0 bg-background shadow-2xl flex flex-col z-40 md:left-auto md:right-0 md:w-[380px] md:border-l md:border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-950 text-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-semibold text-sm">Intelligence Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-75">Chatting as {me?.name ?? user.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-slate-800"
            onClick={() => setChatOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          <ChatSuggestedPrompts onSelect={handleSuggestedPrompt} />
        ) : (
          <ChatMessages messages={messages} isLoading={isLoading} />
        )}
      </div>

      {/* Input */}
      {error && (
        <div className="border-t border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800">
          <div className="flex items-start justify-between gap-3">
            <span>{error.message || 'AI Coach stopped before finishing. Retry or ask a shorter question.'}</span>
            <button type="button" onClick={clearError} className="font-medium text-rose-700 hover:text-rose-950">
              Dismiss
            </button>
          </div>
        </div>
      )}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        initialValue={pendingPrompt}
        onInputChange={(v) => { if (!v) setPendingPrompt('') }}
      />
    </div>
  )
}
