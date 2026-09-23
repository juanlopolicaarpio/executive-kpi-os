import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

/**
 * Honest empty state. The backend genuinely has no rows yet for this resource —
 * we show that rather than filling the screen with fabricated data.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  hint,
}: {
  icon?: LucideIcon
  title: string
  description: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mt-4 font-heading text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">{description}</p>
      {hint && (
        <p className="mt-3 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">{hint}</p>
      )}
    </div>
  )
}
