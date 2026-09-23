import type { RecoveryPlan, AccountabilityEvent } from '@/types/accountability'
import { mockRecoveryPlans, mockAccountabilityEvents } from '@/lib/mock-data/accountability'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

export async function getRecoveryPlans(): Promise<RecoveryPlan[]> {
  if (USE_MOCK) return mockRecoveryPlans
  throw new Error('Live DB not configured')
}

export async function getRecoveryPlansByKpi(kpiId: string): Promise<RecoveryPlan[]> {
  if (USE_MOCK) return mockRecoveryPlans.filter(p => p.kpiId === kpiId)
  throw new Error('Live DB not configured')
}

export async function getAccountabilityEvents(kpiId: string): Promise<AccountabilityEvent[]> {
  if (USE_MOCK) return mockAccountabilityEvents.filter(e => e.kpiId === kpiId)
  throw new Error('Live DB not configured')
}
