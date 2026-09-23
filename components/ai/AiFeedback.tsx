'use client'
import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { sessionFetch } from '@/lib/api/session-fetch'
import { cn } from '@/lib/utils'

// PRD §9.1 feedback control. Deliberately two clicks at most: a rating, then an
// optional reason. Anything heavier and nobody uses it, which makes §13.4's
// "AI usefulness" metric unmeasurable.

export function AiFeedback({
  target = 'query',
  id,
  className,
}: {
  target?: 'query' | 'recommendation'
  id?: string
  className?: string
}) {
  const [sent, setSent] = useState<'helpful' | 'not_helpful' | null>(null)
  const [reason, setReason] = useState('')
  const [reasonSent, setReasonSent] = useState(false)

  const send = async (feedback: 'helpful' | 'not_helpful', withReason?: string) => {
    setSent(feedback)
    try {
      await sessionFetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, id, feedback, reason: withReason }),
      })
    } catch {
      /* feedback is best-effort; never block the reader */
    }
  }

  if (sent === 'helpful') {
    return (
      <p className={cn('flex items-center gap-1.5 text-xs text-emerald-700', className)}>
        <Check className="h-3.5 w-3.5" aria-hidden /> Thanks — logged.
      </p>
    )
  }

  if (sent === 'not_helpful') {
    return (
      <div className={cn('space-y-1.5', className)}>
        {reasonSent ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-600">
            <Check className="h-3.5 w-3.5" aria-hidden /> Logged. This is reviewed against the
            records the answer used.
          </p>
        ) : (
          <>
            <label htmlFor="ai-feedback-reason" className="block text-xs text-slate-600">
              What was wrong? (optional)
            </label>
            <div className="flex gap-1.5">
              <input
                id="ai-feedback-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. cited the wrong initiative"
                className="h-7 flex-1 rounded-md border border-slate-200 px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                onClick={() => {
                  void send('not_helpful', reason.trim() || undefined)
                  setReasonSent(true)
                }}
                className="rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-xs text-slate-400">Was this useful?</span>
      <button
        onClick={() => void send('helpful')}
        aria-label="Mark answer helpful"
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setSent('not_helpful')}
        aria-label="Mark answer not helpful"
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
