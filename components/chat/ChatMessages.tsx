'use client'
import type { UIMessage } from 'ai'
import { ChatMessage } from './ChatMessage'
import { TypingIndicator } from './TypingIndicator'

interface Props {
  messages: UIMessage[]
  isLoading: boolean
}

/**
 * Native scroll container. `min-h-0` is load-bearing: a flex child will not
 * shrink below its content without it, which is what previously stopped this
 * from scrolling (the whole page scrolled instead).
 */
export function ChatMessages({ messages, isLoading }: Props) {
  return (
    <div className="px-4 py-4">
      {messages.length === 0 && (
        <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          Start a conversation with KPAI OS
        </div>
      )}
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
    </div>
  )
}
