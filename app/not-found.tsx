import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

// PRD §4.3. Deliberately worded so it reads the same whether the record does
// not exist or the viewer simply may not see it — revealing which would leak
// the existence of records outside the user's scope.

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <FileQuestion className="h-5 w-5 text-slate-500" aria-hidden />
        </div>
        <h1 className="mt-3 text-base font-semibold text-slate-950">Not available</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          This page does not exist, or it is outside what you have access to.
        </p>
        <Link
          href="/today"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
