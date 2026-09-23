import Link from 'next/link'
import { getNorthstarKpis, NORTHSTAR_AS_OF } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'

export default function LivePage() {
  const kpis = getNorthstarKpis()
  const onTrack = kpis.filter((kpi) => kpi.status === 'on-track').length
  const offTrack = kpis.filter((kpi) => kpi.status === 'off-track').length

  return (
    <main className="min-h-dvh bg-slate-50 p-6 font-sans text-slate-900">
      <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Northstar demo data</p>
        <h1 className="mt-2 text-2xl font-semibold">Local synthetic workbook is loaded</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          This version runs from the bundled Northstar mock dataset, not a production database connection.
          The demo data is current through {NORTHSTAR_AS_OF}.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="KPIs loaded" value={String(kpis.length)} />
          <Metric label="On track" value={String(onTrack)} />
          <Metric label="Off target" value={String(offTrack)} />
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Open dashboard
        </Link>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
