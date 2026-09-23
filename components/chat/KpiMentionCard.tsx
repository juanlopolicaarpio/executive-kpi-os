'use client'
import Link from 'next/link'
import type { Kpi } from '@/types/kpi'
import { KpiStatusBadge } from '@/components/kpis/KpiStatusBadge'

export function KpiMentionCard({ kpi }: { kpi: Kpi }) {
  return (
    <Link
      href={`/kpis/${kpi.id}`}
      className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors mx-1"
    >
      <span className="font-medium">{kpi.name}</span>
      <span className="text-muted-foreground">{kpi.currentValueDisplay}</span>
      <KpiStatusBadge status={kpi.status} />
    </Link>
  )
}
