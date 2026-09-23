'use client'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Loader2, Info } from 'lucide-react'
import { sessionFetch } from '@/lib/api/session-fetch'
import { AiUnavailable } from '@/components/shared/StateViews'
import { AiFeedback } from '@/components/ai/AiFeedback'
import { formatDay } from '@/lib/format'

// PRD §6.2 AI Insight: what changed, likely drivers, limitations, next actions.
//
// Loaded separately from the KPI data so AI latency never blocks the numbers
// (§5.6 applies the same rule to Home).

interface Explain {
  available: boolean
  reason?: string
  insight?: string
  isStale?: boolean
  asOf?: string | null
  limitations?: string[]
  relatedInitiatives?: { name: string; status: string; window: string }[]
  model?: string
  promptVersion?: string
}

export function KpiAiInsight({ kpiId }: { kpiId: string }) {
  const { data, isLoading } = useQuery<Explain>({
    queryKey: ['kpi-explain', kpiId],
    queryFn: async () => (await sessionFetch(`/api/kpis/${kpiId}/explain`)).json(),
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading this KPI&apos;s history…
        </p>
      </section>
    )
  }

  // Not available can mean two very different things: no data to explain
  // (a real product state), or the model is down (a temporary one). Say which.
  if (!data?.available) {
    const isOutage = data?.reason?.toLowerCase().includes('unavailable')
    return isOutage ? (
      <AiUnavailable />
    ) : (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {data?.reason ?? 'No insight available for this KPI yet.'}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
          AI insight
        </h2>
        {data.asOf && (
          <span className="text-[11px] text-slate-500">
            based on data as of {formatDay(data.asOf)}
          </span>
        )}
      </div>

      <div className="prose prose-sm mt-2.5 max-w-none text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.insight ?? ''}</ReactMarkdown>
      </div>

      {data.relatedInitiatives && data.relatedInitiatives.length > 0 && (
        <p className="mt-2 border-t border-violet-200/60 pt-2 text-[11px] leading-snug text-slate-500">
          Timing context only: {data.relatedInitiatives.length} initiative
          {data.relatedInitiatives.length === 1 ? '' : 's'} overlapped this period. Overlap is not
          evidence of cause.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-violet-200/60 pt-2.5">
        <AiFeedback target="query" />
        {data.model && (
          <span className="text-[10px] text-slate-400">
            {data.model} · prompt {data.promptVersion}
          </span>
        )}
      </div>
    </section>
  )
}
