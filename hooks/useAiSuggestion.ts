'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKpis } from '@/hooks/useKpis'
import { useInstitutionalMemory } from '@/hooks/useLoop'
import { useLoopStore } from '@/store/loopStore'
import { suggestFromMemory, type MemoryMatch } from '@/lib/loop/memory'

interface AiSuggestionResult {
  match?: MemoryMatch
  /** Claude-polished prose; falls back to the deterministic rationale. */
  suggestion?: string
  warning?: string
  isLoading: boolean
  isFallback: boolean
}

/**
 * Retrieves the best institutional-memory match for a missed KPI and asks the
 * AI route to polish it into prose. `enabled` gates the network call so the
 * suggestion is only generated when an owner opens the draft dialog.
 */
export function useAiSuggestion(kpiId: string, enabled: boolean): AiSuggestionResult {
  const { data: kpis = [] } = useKpis()
  const { playbooks, learnings } = useInstitutionalMemory()
  const plans = useLoopStore((s) => s.plans)

  const match = useMemo<MemoryMatch | undefined>(() => {
    const kpi = kpis.find((k) => k.id === kpiId)
    if (!kpi || playbooks.length === 0) return undefined
    return suggestFromMemory({
      kpi,
      plans: plans.filter((p) => p.kpiId === kpiId),
      playbooks,
      learnings,
    })
  }, [kpis, kpiId, plans, playbooks, learnings])

  const kpi = kpis.find((k) => k.id === kpiId)

  const query = useQuery({
    queryKey: ['ai-suggestion', kpiId, match?.source.playbookId, match?.source.learningIds.join(',')],
    enabled: enabled && !!match && !!kpi,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch('/api/loop/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpi: {
            name: kpi!.name,
            target: kpi!.target,
            currentValueDisplay: kpi!.currentValueDisplay,
            strategicPurpose: kpi!.strategicPurpose,
          },
          match: {
            rationale: match!.rationale,
            warning: match!.warning,
            playbookName: match!.playbook?.intervention,
            successRatePct: match!.playbook?.successRatePct,
            learnings: match!.learnings.map((l) => ({ title: l.title, outcome: l.outcome })),
            draftActions: match!.draft.actions,
          },
        }),
      })
      if (!res.ok) throw new Error('suggestion failed')
      return (await res.json()) as { suggestion: string; warning: string | null; fallback?: boolean }
    },
  })

  return {
    match,
    suggestion: query.data?.suggestion ?? (enabled ? undefined : match?.rationale),
    warning: match?.warning,
    isLoading: query.isLoading && enabled,
    isFallback: query.data?.fallback ?? false,
  }
}
