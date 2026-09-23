'use client'
import { useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  onSend: (text: string) => void
  isLoading: boolean
  initialValue?: string
  onInputChange?: (value: string) => void
}

export function ChatInput({ onSend, isLoading, initialValue = '', onInputChange }: Props) {
  const [input, setInput] = useState(initialValue)

  // Sync initialValue changes (e.g. when a suggested prompt is clicked)
  if (initialValue !== '' && input !== initialValue && !isLoading) {
    setInput(initialValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    onInputChange?.(e.target.value)
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setInput('')
    onInputChange?.('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-end gap-2 p-4 pb-safe border-t border-border bg-background">
      <Textarea
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask about KPIs, recovery plans, or performance…"
        className="min-h-[44px] max-h-[120px] resize-none text-sm"
        rows={1}
        disabled={isLoading}
      />
      <Button
        type="button"
        size="icon"
        disabled={isLoading || !input.trim()}
        onClick={handleSubmit}
        className="h-10 w-10 shrink-0 bg-slate-900 text-white hover:bg-slate-800"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
