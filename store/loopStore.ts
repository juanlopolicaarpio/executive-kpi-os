'use client'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { RecoveryPlan, AccountabilityEvent, PlanAction } from '@/types/accountability'
import type { Learning } from '@/types/domain'
import { mockRecoveryPlans, mockAccountabilityEvents } from '@/lib/mock-data/accountability'
import { mockKpis } from '@/lib/mock-data/kpis'

// Single source of truth for the accountability loop. Seeded from the mock
// data, but — unlike the read-only api/* layer — it is mutable, so the loop is
// actually interactive: owners submit plans, the CEO sends them back, and
// recorded outcomes write into institutional memory. Persisted to localStorage
// so an owner -> CEO hand-off survives a reload.

/** Stat overrides applied on top of the static playbook library as outcomes accrue. */
export interface PlaybookStat {
  successCount: number
  totalCount: number
}

export interface SubmitPlanInput {
  kpiId: string
  ownerId: string
  ownerName: string
  summary: string
  rootCause: string
  actions: { description: string; dueDate: string }[]
  targetDate: string
  confidenceLevel: 'low' | 'medium' | 'high'
  planSource: 'ai-suggestion' | 'own'
  aiSuggestion?: string
  aiWarning?: string
  sourcePlaybookId?: string
  sourceLearningIds?: string[]
  previousPlanIds?: string[]
  source?: 'dashboard' | 'telegram'
}

interface Actor {
  id: string
  name: string
  role: AccountabilityEvent['actorRole']
}

interface LoopState {
  hasHydrated: boolean
  setHasHydrated: () => void
  plans: RecoveryPlan[]
  events: AccountabilityEvent[]
  /** Learnings captured by the loop, layered over the static institutional memory. */
  recordedLearnings: Learning[]
  /** Per-playbook outcome tallies accumulated by recordOutcome. */
  playbookStats: Record<string, PlaybookStat>

  submitPlan: (input: SubmitPlanInput) => string
  rejectPlan: (planId: string, reason: string, actor: Actor) => void
  endorsePlan: (planId: string, note: string, actor: Actor) => void
  recordOutcome: (
    planId: string,
    outcome: 'resolved' | 'failed',
    notes: string,
    actor: Actor,
  ) => void
  reset: () => void
}

// Synthesize the alert events that the system fires for any missed KPI that
// has no accountability thread yet, so every miss shows up "alerted" in the
// loop. Fixed timestamps keep SSR and client renders identical (no hydration
// mismatch).
function seedEvents(): AccountabilityEvent[] {
  const seeded = [...mockAccountabilityEvents]
  const kpisWithEvents = new Set(seeded.map((e) => e.kpiId))
  for (const kpi of mockKpis) {
    if (kpi.status !== 'off-track' || kpisWithEvents.has(kpi.id)) continue
    seeded.push(
      {
        id: `evt-${kpi.id}-seed-miss`,
        kpiId: kpi.id,
        triggeredAt: '2026-06-01T09:00:00Z',
        type: 'miss',
        actorId: 'system',
        actorName: 'KPAI System',
        actorRole: 'viewer',
        message: `${kpi.name} missed target. Actual: ${kpi.currentValueDisplay} vs Target: ${kpi.target}.`,
        source: 'system',
      },
      {
        id: `evt-${kpi.id}-seed-alert`,
        kpiId: kpi.id,
        triggeredAt: '2026-06-01T09:05:00Z',
        type: 'escalation',
        actorId: 'system',
        actorName: 'KPAI System',
        actorRole: 'viewer',
        message: `Recovery plan required. Notifying KPI owner ${kpi.ownerName} via Telegram.`,
        source: 'system',
      },
    )
  }
  return seeded
}

// No-op storage so the store module is safe to evaluate during SSR; the real
// localStorage takes over on the client.
const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const nowIso = () => new Date().toISOString()
const rid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: () => set({ hasHydrated: true }),
      plans: mockRecoveryPlans,
      events: seedEvents(),
      recordedLearnings: [],
      playbookStats: {},

      submitPlan: (input) => {
        const id = rid('plan')
        const now = nowIso()
        const actions: PlanAction[] = input.actions.map((a, i) => ({
          id: `${id}-a${i}`,
          description: a.description,
          dueDate: a.dueDate,
          completed: false,
        }))
        // Non-blocking: the plan goes live on submission. The CEO oversees and
        // can send it back, but the loop never waits on an approval gate.
        const plan: RecoveryPlan = {
          id,
          kpiId: input.kpiId,
          ownerId: input.ownerId,
          ownerName: input.ownerName,
          createdAt: now,
          updatedAt: now,
          status: 'in-progress',
          summary: input.summary,
          rootCause: input.rootCause,
          actions,
          targetDate: input.targetDate,
          confidenceLevel: input.confidenceLevel,
          previousPlanIds: input.previousPlanIds ?? [],
          source: input.source ?? 'dashboard',
          planSource: input.planSource,
          aiSuggestion: input.aiSuggestion,
          aiWarning: input.aiWarning,
          sourcePlaybookId: input.sourcePlaybookId,
          sourceLearningIds: input.sourceLearningIds,
        }
        const event: AccountabilityEvent = {
          id: rid('evt'),
          kpiId: input.kpiId,
          triggeredAt: now,
          type: 'plan-submitted',
          actorId: input.ownerId,
          actorName: input.ownerName,
          actorRole: 'viewer',
          message: `Recovery plan submitted and now in progress${
            input.planSource === 'ai-suggestion' ? ' (based on AI suggestion from institutional memory)' : ''
          }.`,
          source: input.source ?? 'dashboard',
          metadata: { planId: id },
        }
        set((s) => ({ plans: [plan, ...s.plans], events: [...s.events, event] }))
        return id
      },

      rejectPlan: (planId, reason, actor) => {
        const now = nowIso()
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId ? { ...p, status: 'rejected', rejectionReason: reason, updatedAt: now } : p,
          ),
          events: [
            ...s.events,
            {
              id: rid('evt'),
              kpiId: plan.kpiId,
              triggeredAt: now,
              type: 'plan-rejected',
              actorId: actor.id,
              actorName: actor.name,
              actorRole: actor.role,
              message: `Plan sent back for revision: ${reason}`,
              source: 'dashboard',
              metadata: { planId },
            },
          ],
        }))
      },

      endorsePlan: (planId, note, actor) => {
        const now = nowIso()
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return
        set((s) => ({
          events: [
            ...s.events,
            {
              id: rid('evt'),
              kpiId: plan.kpiId,
              triggeredAt: now,
              type: 'plan-approved',
              actorId: actor.id,
              actorName: actor.name,
              actorRole: actor.role,
              message: note || 'Plan endorsed. Proceed with execution.',
              source: 'dashboard',
              metadata: { planId },
            },
          ],
        }))
      },

      recordOutcome: (planId, outcome, notes, actor) => {
        const now = nowIso()
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return

        // 1. Close the plan.
        const updatedPlans = get().plans.map((p) =>
          p.id === planId
            ? {
                ...p,
                status: outcome,
                outcome,
                failureReason: outcome === 'failed' ? notes : undefined,
                updatedAt: now,
              }
            : p,
        )

        // 2. Thread event.
        const event: AccountabilityEvent = {
          id: rid('evt'),
          kpiId: plan.kpiId,
          triggeredAt: now,
          type: 'resolved',
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          message:
            outcome === 'resolved'
              ? `Outcome recorded: resolved. ${notes} Written to institutional memory.`
              : `Outcome recorded: failed. ${notes} Captured so the playbook does not repeat it.`,
          source: 'dashboard',
          metadata: { planId, outcome },
        }

        // 3. Institutional memory: update playbook tally + capture a learning.
        const stats = { ...get().playbookStats }
        if (plan.sourcePlaybookId) {
          const prev = stats[plan.sourcePlaybookId] ?? { successCount: 0, totalCount: 0 }
          stats[plan.sourcePlaybookId] = {
            successCount: prev.successCount + (outcome === 'resolved' ? 1 : 0),
            totalCount: prev.totalCount + 1,
          }
        }
        const learning: Learning = {
          id: rid('lrn'),
          title:
            outcome === 'resolved'
              ? `What worked: ${plan.summary.slice(0, 80)}`
              : `What didn't work: ${plan.summary.slice(0, 80)}`,
          summary: `${plan.rootCause} Result: ${outcome}. ${notes}`,
          context: `Recovery plan for KPI ${plan.kpiId}, target ${plan.targetDate}.`,
          outcome:
            outcome === 'resolved'
              ? 'Approach validated — promote in the playbook for similar issues.'
              : 'Approach failed — avoid repeating; try a different lever next time.',
          recordedAt: now,
          sourceInterventionId: planId,
          tags: [outcome, plan.kpiId, ...(plan.sourcePlaybookId ? [plan.sourcePlaybookId] : [])],
        }

        set({
          plans: updatedPlans,
          events: [...get().events, event],
          playbookStats: stats,
          recordedLearnings: [learning, ...get().recordedLearnings],
        })
      },

      reset: () =>
        set({
          plans: mockRecoveryPlans,
          events: seedEvents(),
          recordedLearnings: [],
          playbookStats: {},
        }),
    }),
    {
      name: 'kpai-loop',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : memoryStorage)),
      partialize: (s) => ({
        plans: s.plans,
        events: s.events,
        recordedLearnings: s.recordedLearnings,
        playbookStats: s.playbookStats,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated()
      },
    },
  ),
)
