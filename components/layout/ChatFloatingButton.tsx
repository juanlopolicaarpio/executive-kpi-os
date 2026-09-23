'use client'
import { MessageSquare, X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'

export function ChatFloatingButton() {
  const { isChatOpen, toggleChat } = useUiStore()
  return (
    <Button
      onClick={toggleChat}
      className="fixed bottom-safe right-4 md:right-6 z-50 h-12 w-12 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800"
      size="icon"
    >
      {isChatOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
    </Button>
  )
}
