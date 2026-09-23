'use client'
import Link from 'next/link'
import { Lock, WifiOff, Sparkles, AlertOctagon, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The PRD §4.3 common states, as reusable pieces. Every screen is expected to
// have an answer for all of them; keeping them here stops each screen from
// inventing its own wording.

/**
 * PRD §4.3: "Do not reveal record existence." The copy is intentionally
 * identical whether the record is missing or merely out of scope — anything
 * more specific is an information leak.
 */
export function AccessDenied({
  returnHref = '/today',
  returnLabel = 'Back to Home',
}: {
  returnHref?: string
  returnLabel?: string
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Lock className="h-5 w-5 text-slate-500" aria-hidden />
        </div>
        <h2 className="mt-3 text-base font-semibold text-slate-950">Not available</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          You do not have access to this. If you think that is wrong, ask your organization admin.
        </p>
        <Link
          href={returnHref}
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {returnLabel}
        </Link>
      </div>
    </div>
  )
}

/** Inline error for a single panel that failed while the rest of the page works. */
export function PanelError({
  message = 'This section could not load.',
  onRetry,
  className,
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4',
        className,
      )}
    >
      <AlertOctagon className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-red-900">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}

/**
 * PRD §4.3 stale/offline: show the last successful refresh, and say plainly
 * that writes are held back rather than silently failing later.
 */
export function StaleBanner({
  lastRefresh,
  detail,
  className,
}: {
  lastRefresh?: string | null
  detail?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm',
        className,
      )}
      role="status"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <span className="font-medium text-amber-900">Showing older data</span>
      <span className="text-amber-800">
        {detail ?? 'Some sources have not refreshed within their tolerance.'}
      </span>
      {lastRefresh && (
        <span className="ml-auto text-xs text-amber-700">Last refresh {lastRefresh}</span>
      )}
    </div>
  )
}

/**
 * PRD §4.3: core functionality must remain usable when AI is down, and the
 * unavailability must be stated rather than left as a spinner.
 */
export function AiUnavailable({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-start gap-3 rounded-lg bg-slate-50 p-4', className)}
      role="status"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          AI unavailable
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Guidance could not be generated right now. Your KPIs and initiatives are unaffected.
        </p>
      </div>
    </div>
  )
}
