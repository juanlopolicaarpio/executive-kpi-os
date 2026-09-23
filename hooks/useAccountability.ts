'use client'
import { useQuery } from '@tanstack/react-query'
import { getRecoveryPlans, getAccountabilityEvents, getRecoveryPlansByKpi } from '@/lib/api/accountability'

export function useRecoveryPlans() {
  return useQuery({
    queryKey: ['recovery-plans'],
    queryFn: getRecoveryPlans,
  })
}

export function useKpiAccountability(kpiId: string) {
  return useQuery({
    queryKey: ['accountability', kpiId],
    queryFn: () => getAccountabilityEvents(kpiId),
    enabled: !!kpiId,
  })
}

export function useKpiPlans(kpiId: string) {
  return useQuery({
    queryKey: ['plans', kpiId],
    queryFn: () => getRecoveryPlansByKpi(kpiId),
    enabled: !!kpiId,
  })
}
