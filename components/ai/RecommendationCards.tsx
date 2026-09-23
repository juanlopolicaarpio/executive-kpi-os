'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ArrowRight,
  X,
  Archive,
  Gauge,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/ai/EvidencePanel'
import { RecommendationForm } from '@/components/initiatives/RecommendationForm'
import { sessionFetch } from '@/lib/api/session-fetch'
import { formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RecommendationOption } from '@/app/api/ai/recommendations/route'

// PRD §9.1 recommendation cards and §9.3 recommendation-to-draft.
//
// The hard rule from §9.6: the AI may CREATE a draft, never submit one. So
// "Review draft" opens the Initiative Recommendation Form prefilled and
// labelled as AI-suggested — the human still fills the gaps and presses submit.

interface Props {
  /** Scope the recommendations to one KPI. Omit for a general ask. */
  kpiSlug?: string
  /** Rendered above the cards. */
  title?: string
  /** Fetch on mount rather than waiting for a click. */
  auto?: boolean
}

interface RecResponse {
  options: RecommendationOption[]
  confidence: 'high' | 'medium' | 'low'
  confidenceReason: string
  limitations: string[]
  weights: Record<string, number>
}

const WEIGHT_LABELS: Record<string, string> = {
  kpiRelevance: 'KPI relevance',
  historicalOutcome: 'Historical outcome',
  contextSimilarity: 'Context fit',
  impactVsEffort: 'Impact vs effort',
  evidenceQuality: 'Evidence quality',
}

export function RecommendationCards({ kpiSlug, title = 'What to do next', auto = false }: Props) {
  const [enabled, setEnabled] = useState(auto)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [drafting, setDrafting] = useState<RecommendationOption | null>(null)

  const { data, isFetching } = useQuery<RecResponse>({
    queryKey: ['ai-recommendations', kpiSlug ?? 'all'],
    queryFn: async () => {
      const qs = kpiSlug ? `?kpi=${encodeURIComponent(kpiSlug)}` : ''
      return (await sessionFetch(`/api/ai/recommendations${qs}`)).json()
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  })

  const record = async (id: string, action: 'accepted' | 'dismissed') => {
    try {
      await sessionFetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'recommendation', id, action }),
      })
    } catch {
      /* feedback is best-effort — never block the action itself */
    }
  }

  if (!enabled) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEnabled(true)}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-violet-600" />
        Ask AI what to do
      </Button>
    )
  }

  if (isFetching && !data) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching what has worked before…
      </p>
    )
  }

  const options = (data?.options ?? []).filter((o) => !dismissed.includes(o.id))

  if (!data || data.options.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          {data?.confidenceReason ?? 'No recommendation available.'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Recommendations are built from closed initiatives. Once a few have been through results
          and review, there is something to reason from.
        </p>
      </div>
    )
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <ConfidenceBadge band={data.confidence} reason={data.confidenceReason} />
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-slate-500">All suggestions dismissed.</p>
        ) : (
          options.map((o) => (
            <Card
              key={o.id}
              option={o}
              weights={data.weights}
              onAccept={() => {
                void record(o.id, 'accepted')
                setDrafting(o)
              }}
              onDismiss={() => {
                void record(o.id, 'dismissed')
                setDismissed((d) => [...d, o.id])
              }}
            />
          ))
        )}

        <p className="hidden">
          Ranked by a fixed weighted score — {Object.entries(data.weights)
            .map(([k, v]) => `${WEIGHT_LABELS[k] ?? k} ${Math.round(v * 100)}%`)
            .join(' · ')}. The model writes the wording; it does not choose the order.
        </p>
      </section>

      {drafting && (
        <RecommendationForm
          open
          onOpenChange={(o) => !o && setDrafting(null)}
          defaultMasterKpiSlug={drafting.targetKpiSlug}
          aiPrefill={{
            objective: drafting.draft.objective,
            mechanics: drafting.draft.mechanics,
            initiativeType: drafting.initiativeType as never,
            projectKpis: drafting.draft.projectKpis.map((k) => ({
              name: k.name,
              definition: k.definition,
              unit: k.unit,
              direction: k.direction,
              targetValue: k.targetValue,
              measurementSource: k.measurementSource,
            })),
            budgetLines: drafting.draft.budgetLines,
            durationDays: drafting.draft.durationDays,
            recommendationId: drafting.id,
          }}
        />
      )}
    </>
  )
}

function Card({
  option,
  weights,
  onAccept,
  onDismiss,
}: {
  option: RecommendationOption
  weights: Record<string, number>
  onAccept: () => void
  onDismiss: () => void
}) {
  const [showWhy, setShowWhy] = useState(false)

  return (
    <article className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">{option.title}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{option.rationale}</p>
        </div>
        <button
          onClick={onDismiss}
          aria-label={`Dismiss "${option.title}"`}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Expected impact</dt>
          <dd className="mt-0.5 text-slate-800">{option.expectedImpact}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Suggested budget</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-900">
            {formatPeso(option.draft.suggestedBudget)}
            <span className="ml-1 font-normal text-slate-500">
              · {option.effort} effort · {option.draft.durationDays} days
            </span>
          </dd>
        </div>
      </dl>

      {option.draft.projectKpis.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="text-[11px] text-slate-500">Would be measured by</span>
          {option.draft.projectKpis.map((k) => (
            <span
              key={k.name}
              className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200"
            >
              {k.name}
            </span>
          ))}
        </div>
      )}

      {/* The evidence behind the ranking, on demand (§9.6 inspectable). */}
      <button
        onClick={() => setShowWhy((w) => !w)}
        aria-expanded={showWhy}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showWhy && 'rotate-180')} />
        Why this — score {option.score}/100
      </button>

      {showWhy && (
        <div className="mt-2 space-y-2 rounded-lg bg-white p-3">
          <div className="space-y-1.5">
            {Object.entries(option.scoreBreakdown).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-[11px] text-slate-500">
                  {WEIGHT_LABELS[k] ?? k}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-violet-500"
                    style={{ width: `${Math.round(v * 100)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-slate-600">
                  {Math.round(v * 100)}% × {Math.round((weights[k] ?? 0) * 100)}%
                </span>
              </div>
            ))}
          </div>

          {option.analogs.length > 0 && (
            <div className="border-t border-slate-100 pt-2">
              <p className="text-[11px] font-medium text-slate-500">Based on</p>
              {option.analogs.map((a) => (
                <p key={a.name} className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-700">
                  <Archive className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                  {a.name} — goal {a.outcome}
                  {a.roi != null && `, ${a.roi.toFixed(0)}% ROI`}
                </p>
              ))}
            </div>
          )}

          {option.limitations.map((l) => (
            <p key={l} className="border-t border-slate-100 pt-2 text-[11px] text-amber-700">
              {l}
            </p>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-violet-200/60 pt-3">
        <Button size="sm" onClick={onAccept}>
          Review draft <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] text-slate-500">
          Opens a prefilled form. Nothing is submitted until you say so.
        </span>
      </div>
    </article>
  )
}
