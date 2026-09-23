'use client'
import { useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useUiStore } from '@/store/uiStore'
import { useSession } from '@/hooks/useSession'
import { useMe } from '@/hooks/useInitiatives'
import { usePersonaKey } from '@/hooks/usePersonas'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatSuggestedPrompts } from './ChatSuggestedPrompts'
import { EvidencePanel } from '@/components/ai/EvidencePanel'
import { AiFeedback } from '@/components/ai/AiFeedback'
import { RecommendationCards } from '@/components/ai/RecommendationCards'
import { sessionFetch, sessionHeaders } from '@/lib/api/session-fetch'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, RotateCcw } from 'lucide-react'
import type { EvidenceRef } from '@/lib/ai/evidence'

export function ChatPage() {
  const { currentUserId } = useUiStore()
  const { user } = useSession()
  const { data: me } = useMe()
  const persona = usePersonaKey()
  const [pendingPrompt, setPendingPrompt] = useState('')

  const { data: ctx } = useQuery<{
    evidence: EvidenceRef[]
    confidence: 'high' | 'medium' | 'low'
    limitations: string[]
    promptVersion?: string
    model?: string
    recordCount: number
    lastUpdated?: string
    reportingPeriod?: string
  }>({
    queryKey: ['ai-context', persona],
    queryFn: async () => (await sessionFetch('/api/chat')).json(),
    staleTime: 5 * 60 * 1000,
  })

  const { messages, sendMessage, status, setMessages, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: () => sessionHeaders() as Record<string, string>,
      body: { userId: currentUserId },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const viewerName = me?.name ?? user.name
  const viewerRole = me?.roleLabel ?? user.role

  const handleSend = (text: string) => {
    setPendingPrompt('')
    clearError()
    sendMessage({ text })
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setPendingPrompt(prompt)
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`kpai-chat:${persona}`)
      if (stored) setMessages(JSON.parse(stored))
      else setMessages([])
    } catch {
      setMessages([])
    }
  }, [persona, setMessages])

  useEffect(() => {
    try {
      window.localStorage.setItem(`kpai-chat:${persona}`, JSON.stringify(messages.slice(-30)))
    } catch {
      /* browser storage is optional */
    }
  }, [messages, persona])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-border bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">AI Coach</h1>
            <p className="text-xs text-muted-foreground">
              Viewing as {viewerName} · {viewerRole}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Reset
            </button>
          )}
        </div>
      </div>

      <div>
        {messages.length === 0 ? (
          <div className="mx-auto max-w-5xl px-4 pb-6 pt-12">
            <h2 className="mb-2 text-center text-2xl font-bold">
              Good day, {viewerName.split(' ')[0]}.
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
              Ask for the decision summary first. KPI tables, evidence and technical details stay available when you need to inspect them.
            </p>
            {ctx && (
              <div className="mx-auto mb-6 max-w-4xl">
                <EvidencePanel
                  evidence={ctx.evidence}
                  limitations={ctx.limitations}
                  confidence={ctx.confidence}
                  model={ctx.model}
                  promptVersion={ctx.promptVersion}
                />
              </div>
            )}
            <ChatSuggestedPrompts onSelect={handleSuggestedPrompt} />

            <div className="mx-auto mt-6 max-w-4xl px-4">
              <RecommendationCards title="Recommended initiatives" />
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <ChatMessages messages={messages} isLoading={isLoading} />
            {error && <ChatError message={error.message} onDismiss={clearError} />}
            {!isLoading && messages.some((m) => m.role === 'assistant') && ctx && (
              <div className="space-y-2 px-4 pb-3">
                <EvidencePanel
                  evidence={ctx.evidence}
                  limitations={ctx.limitations}
                  confidence={ctx.confidence}
                  model={ctx.model}
                  promptVersion={ctx.promptVersion}
                />
                <AiFeedback target="query" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mx-auto w-full max-w-5xl bg-gray-50/95 px-4 pb-3 pt-2 backdrop-blur">
        {error && messages.length === 0 && <ChatError message={error.message} onDismiss={clearError} />}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          initialValue={pendingPrompt}
          onInputChange={(v) => { if (!v) setPendingPrompt('') }}
        />
      </div>
    </div>
  )
}

function ChatError({ message, onDismiss }: { message?: string; onDismiss: () => void }) {
  return (
    <div className="px-4 pb-2">
      <div className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-relaxed text-rose-800">
        <span>{message || 'AI Coach stopped before finishing. The KPI data is still available; retry or ask a shorter question.'}</span>
        <button type="button" onClick={onDismiss} className="text-xs font-medium text-rose-700 hover:text-rose-950">
          Dismiss
        </button>
      </div>
    </div>
  )
}
