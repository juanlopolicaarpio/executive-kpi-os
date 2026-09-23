import { AlertTriangle, CheckCircle2, AlertOctagon, CircleDashed } from 'lucide-react'
import type { KpiStatus } from '@/types/kpi'

// Two honest states plus "awaiting data" — no vague "at risk / data review" tiers.
const CONFIG: Record<KpiStatus, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  'on-track': { label: 'On target', color: '#0ca30c', bg: 'rgba(12,163,12,0.10)', Icon: CheckCircle2 },
  'at-risk': { label: 'At Risk', color: '#b45309', bg: 'rgba(180,83,9,0.10)', Icon: AlertTriangle },
  'off-track': { label: 'Off target', color: '#d03b3b', bg: 'rgba(208,59,59,0.10)', Icon: AlertOctagon },
  'no-data': { label: 'No Data', color: '#898781', bg: 'rgba(137,135,129,0.12)', Icon: CircleDashed },
}

export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  const c = CONFIG[status] ?? CONFIG['no-data']
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: c.color, background: c.bg }}
    >
      <c.Icon className="h-3 w-3" aria-hidden />
      {c.label}
    </span>
  )
}
