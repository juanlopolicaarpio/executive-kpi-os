'use client'
import { useQuery } from '@tanstack/react-query'
import { usePeriodStore } from '@/store/periodStore'
import type {
  BusinessHealth, DailySales, PlatformPerformance, SkuPerformance, InventoryItem,
  KpiHealth, Signal, Intervention, Playbook, Learning, DecisionRecord, DailyBrief, Publication,
} from '@/types/domain'

// Every dashboard screen reads through these hooks. They all derive from ONE
// period-aware query against /api/data/live, so moving the global Time Bar
// re-scopes the whole app at once.

interface LivePayload {
  kpiHealth: KpiHealth[]; signals: Signal[]; interventions: Intervention[]; playbooks: Playbook[]
  learnings: Learning[]; decisions: DecisionRecord[]; publications: Publication[]
  salesHistory: DailySales[]; platformPerformance: PlatformPerformance[]; skuPerformance: SkuPerformance[]
  inventory: InventoryItem[]; dailyBrief: DailyBrief; businessHealth: BusinessHealth
}

function useLiveData() {
  const asOf = usePeriodStore((s) => s.asOf)
  const windowMonths = usePeriodStore((s) => s.windowMonths)
  return useQuery({
    queryKey: ['data-live', asOf, windowMonths],
    queryFn: async (): Promise<LivePayload | null> => {
      const p = new URLSearchParams()
      if (asOf) p.set('as_of', asOf)
      if (windowMonths) p.set('window', String(windowMonths))
      const r = await fetch(`/api/data/live?${p.toString()}`)
      return r.ok ? r.json() : null
    },
    placeholderData: (prev) => prev, // hold previous render while re-scoping — no skeleton flash
  })
}

export function useDailyBrief() {
  const q = useLiveData()
  return { data: q.data?.dailyBrief, isLoading: q.isLoading }
}
export function useBusinessHealth() {
  const q = useLiveData()
  return { data: q.data?.businessHealth, isLoading: q.isLoading }
}
export function useSalesHistory() {
  const q = useLiveData()
  return { data: q.data?.salesHistory, isLoading: q.isLoading }
}
export function usePlatformPerformance() {
  const q = useLiveData()
  return { data: q.data?.platformPerformance, isLoading: q.isLoading }
}
export function useKpiHealth() {
  const q = useLiveData()
  return { data: q.data?.kpiHealth, isLoading: q.isLoading }
}
export function useSignals() {
  const q = useLiveData()
  return { data: q.data?.signals, isLoading: q.isLoading }
}
export function useInterventions() {
  const q = useLiveData()
  return { data: q.data?.interventions, isLoading: q.isLoading }
}
export function usePlaybooks() {
  const q = useLiveData()
  return { data: q.data?.playbooks, isLoading: q.isLoading }
}
export function useLearnings() {
  const q = useLiveData()
  return { data: q.data?.learnings, isLoading: q.isLoading }
}
export function useDecisions() {
  const q = useLiveData()
  return { data: q.data?.decisions, isLoading: q.isLoading }
}
export function usePublications() {
  const q = useLiveData()
  return { data: q.data?.publications, isLoading: q.isLoading }
}
export function useSkuPerformance() {
  const q = useLiveData()
  return { data: q.data?.skuPerformance, isLoading: q.isLoading }
}
export function useInventory() {
  const q = useLiveData()
  return { data: q.data?.inventory, isLoading: q.isLoading }
}
