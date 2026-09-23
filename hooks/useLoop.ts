'use client'
import { useMemo } from 'react'
import { useKpis } from '@/hooks/useKpis'
import { usePlaybooks, useLearnings } from '@/hooks/useData'
import { useSession } from '@/hooks/useSession'
import { useLoopStore } from '@/store/loopStore'
import {
  deriveLoopStage,
  getActivePlan,
  nextActionFor,
  LOOP_STAGE_ORDER,
  type LoopStage,
  type NextAction,
} from '@/lib/loop/stages'
import type { Kpi } from '@/types/kpi'
import type { RecoveryPlan, AccountabilityEvent } from '@/types/accountability'
import type { Playbook, Learning } from '@/types/domain'

export interface LoopItem {
  kpi: Kpi
  plans: RecoveryPlan[]
  events: AccountabilityEvent[]
  stage: LoopStage
  activePlan?: RecoveryPlan
  isOwner: boolean
  nextAction: NextAction
}

/** Every KPI currently in the accountability loop, with its derived stage. */
export function useLoopBoard() {
  const { data: kpis = [], isLoading } = useKpis()
  const { user, role } = useSession()
  const plans = useLoopStore((s) => s.plans)
  const events = useLoopStore((s) => s.events)
  const hasHydrated = useLoopStore((s) => s.hasHydrated)
  const ownedKpiIds = user.ownedKpiIds

  const items = useMemo<LoopItem[]>(() => {
    const kpiIdsInLoop = new Set<string>()
    for (const k of kpis) if (k.status === 'off-track') kpiIdsInLoop.add(k.id)
    for (const p of plans) kpiIdsInLoop.add(p.kpiId)
    for (const e of events) kpiIdsInLoop.add(e.kpiId)

    return [...kpiIdsInLoop]
      .map((id) => kpis.find((k) => k.id === id))
      .filter((k): k is Kpi => Boolean(k))
      .map((kpi) => {
        const kpiPlans = plans.filter((p) => p.kpiId === kpi.id)
        const kpiEvents = events
          .filter((e) => e.kpiId === kpi.id)
          .sort((a, b) => +new Date(a.triggeredAt) - +new Date(b.triggeredAt))
        const stage = deriveLoopStage(kpi, kpiPlans, kpiEvents)
        const isOwner = ownedKpiIds.includes(kpi.id) && role !== 'ceo'
        return {
          kpi,
          plans: kpiPlans,
          events: kpiEvents,
          stage,
          activePlan: getActivePlan(kpiPlans),
          isOwner,
          nextAction: nextActionFor(stage, { role, isOwner }),
        }
      })
  }, [kpis, plans, events, ownedKpiIds, role])

  const byStage = useMemo(() => {
    const groups: Record<LoopStage, LoopItem[]> = {
      missed: [], alerted: [], 'plan-needed': [], 'in-progress': [], outcome: [],
    }
    for (const item of items) groups[item.stage].push(item)
    return groups
  }, [items])

  const needsYou = useMemo(() => items.filter((i) => i.nextAction.forViewer), [items])

  return {
    items,
    byStage,
    needsYou,
    stageOrder: LOOP_STAGE_ORDER,
    isLoading: isLoading || !hasHydrated,
  }
}

/** Loop view for a single KPI (detail page). */
export function useKpiLoop(kpiId: string): Omit<LoopItem, 'kpi'> & { kpi?: Kpi } {
  const { data: kpis = [] } = useKpis()
  const { user, role } = useSession()
  const plans = useLoopStore((s) => s.plans)
  const events = useLoopStore((s) => s.events)
  const ownedKpiIds = user.ownedKpiIds

  return useMemo(() => {
    const kpi = kpis.find((k) => k.id === kpiId)
    const kpiPlans = plans
      .filter((p) => p.kpiId === kpiId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    const kpiEvents = events
      .filter((e) => e.kpiId === kpiId)
      .sort((a, b) => +new Date(a.triggeredAt) - +new Date(b.triggeredAt))
    const stage = deriveLoopStage(kpi ?? { status: 'off-track' as const }, kpiPlans, kpiEvents)
    const isOwner = !!kpi && ownedKpiIds.includes(kpi.id) && role !== 'ceo'
    return {
      kpi,
      plans: kpiPlans,
      events: kpiEvents,
      stage,
      activePlan: getActivePlan(kpiPlans),
      isOwner,
      nextAction: nextActionFor(stage, { role, isOwner }),
    }
  }, [kpis, kpiId, plans, events, ownedKpiIds, role])
}

export interface PlaybookWithStats extends Playbook {
  /** Success rate after folding in outcomes recorded through the loop. */
  liveSuccessRatePct: number
  liveTimesUsed: number
}

/** Institutional memory with loop-recorded outcomes folded in. */
export function useInstitutionalMemory() {
  const { data: playbooks = [], isLoading: pbLoading } = usePlaybooks()
  const { data: baseLearnings = [], isLoading: lrnLoading } = useLearnings()
  const playbookStats = useLoopStore((s) => s.playbookStats)
  const recordedLearnings = useLoopStore((s) => s.recordedLearnings)

  const playbooksWithStats = useMemo<PlaybookWithStats[]>(() => {
    return playbooks.map((pb) => {
      const stat = playbookStats[pb.id]
      if (!stat || stat.totalCount === 0) {
        return { ...pb, liveSuccessRatePct: pb.successRatePct, liveTimesUsed: pb.timesUsed }
      }
      // Blend the historical rate with the freshly recorded outcomes.
      const priorSuccesses = Math.round((pb.successRatePct / 100) * pb.timesUsed)
      const totalUsed = pb.timesUsed + stat.totalCount
      const totalSuccess = priorSuccesses + stat.successCount
      return {
        ...pb,
        liveTimesUsed: totalUsed,
        liveSuccessRatePct: Math.round((totalSuccess / totalUsed) * 100),
      }
    })
  }, [playbooks, playbookStats])

  const learnings = useMemo<Learning[]>(
    () => [...recordedLearnings, ...baseLearnings],
    [recordedLearnings, baseLearnings],
  )

  return { playbooks: playbooksWithStats, learnings, isLoading: pbLoading || lrnLoading }
}
