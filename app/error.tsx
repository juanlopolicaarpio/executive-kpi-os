'use client'
import { useEffect } from 'react'
import { AlertOctagon, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// PRD §4.3: an error must identify the failed action, offer a retry, and
// surface a diagnostic identifier the user can quote to support. Next.js
// attaches `digest` to server errors for exactly that purpose.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Structured so the message lands in the platform logs alongside the digest.
    console.error('[kpi-os] unhandled error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <AlertOctagon className="h-5 w-5 text-red-600" aria-hidden />
        </div>
        <h1 className="mt-3 text-base font-semibold text-slate-950">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          This screen failed to load. Your data has not been changed.
        </p>

        <Button className="mt-4 w-full" onClick={reset}>
          <RotateCw className="mr-2 h-4 w-4" />
          Try again
        </Button>

        {error.digest && (
          <p className="mt-3 text-xs text-slate-400">
            Reference <code className="rounded bg-slate-100 px-1 py-0.5">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  )
}
