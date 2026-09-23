import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

export default function MarketSharePage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-slate-100 p-2 text-slate-700">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue mix</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">Market share is not part of this Northstar demo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The Northstar executive demo replaces ecommerce market-share tracking with revenue mix, partner health,
            acquisition funnel, forecast, and vertical expansion KPIs.
          </p>
          <Link
            href="/kpis"
            className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View Northstar KPIs
          </Link>
        </div>
      </div>
    </div>
  )
}
