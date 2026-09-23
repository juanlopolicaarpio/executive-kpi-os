import type { CompanyContext } from '@/types/chat'
import type { UserRole } from '@/types/user'
import { mockRecoveryPlans } from '@/lib/mock-data/accountability'
import { mockKpis } from '@/lib/mock-data/kpis'
import { mockUploadRecords } from '@/lib/mock-data/uploads'
import { mockUsers } from '@/lib/mock-data/users'

export function buildMockContext(userId: string, userRole: UserRole): CompanyContext {
  const user = mockUsers.find((candidate) => candidate.id === userId) ?? mockUsers[0]!
  const visibleKpis = mockKpis.filter((kpi) => {
    if (userRole === 'ceo' || userRole === 'econs-manager') return true
    return kpi.ownerId === user.id || kpi.visibleToRoles.includes(userRole)
  })
  const visiblePlans = mockRecoveryPlans.filter((plan) => {
    if (userRole === 'ceo' || userRole === 'econs-manager') return true
    return plan.ownerId === user.id
  })
  const recentUploads = mockUploadRecords.filter((upload) => {
    if (userRole === 'ceo' || userRole === 'econs-manager') return true
    return upload.uploadedById === user.id
  })
  const missedKpis = visibleKpis.filter((kpi) => kpi.status === 'off-track' || kpi.status === 'at-risk')

  return {
    user: {
      id: user.id,
      name: user.name,
      role: userRole,
      ownedKpis: user.ownedKpiIds.map((id) => mockKpis.find((kpi) => kpi.id === id)?.name ?? id),
    },
    activeInitiatives: [],
    closedInitiatives: [],
    roiByType: [],
    portfolio: {
      activeCount: visiblePlans.length,
      budgetInFlight: 0,
      totalSpendClosed: 0,
      totalIncrementalProfit: 0,
      portfolioRoi: null,
    },
    kpis: visibleKpis.map((kpi) => ({
      id: kpi.id,
      name: kpi.name,
      status: kpi.status === 'at-risk' ? 'off-track' : kpi.status,
      currentValue: kpi.currentValueDisplay,
      target: kpi.target,
      trend: kpi.trend ?? 'flat',
      cadence: kpi.cadence ?? 'daily',
      lastChecked: kpi.history.at(-1)?.date ?? 'N/A',
      asOf: kpi.history.at(-1)?.date,
      isStale: false,
      ownerName: kpi.ownerName,
      platform: kpi.platform,
      recentHistory: kpi.history.slice(-4).map((point) => ({
        date: point.date,
        value: point.value,
        target: point.target,
      })),
      latestPlan: visiblePlans.find((plan) => plan.kpiId === kpi.id)?.summary,
    })),
    openPlans: visiblePlans.map((plan) => ({
      id: plan.id,
      kpiName: mockKpis.find((kpi) => kpi.id === plan.kpiId)?.name ?? plan.kpiId,
      ownerName: plan.ownerName,
      status: plan.status,
      summary: plan.summary,
      rootCause: plan.rootCause,
      targetDate: plan.targetDate,
      aiWarning: plan.aiWarning,
      failedPreviousApproaches: [],
    })),
    recentMisses: missedKpis.map((kpi) => ({
      kpiName: kpi.name,
      actual: kpi.currentValueDisplay,
      target: kpi.target,
      missedOn: kpi.history.at(-1)?.date ?? 'N/A',
      consecutiveMisses: 1,
      ownerName: kpi.ownerName,
    })),
    marketWatch: [],
    recentUploads: recentUploads.slice(0, 5).map((upload) => ({
      kpiName: upload.kpiName,
      uploadedAt: upload.uploadedAt,
      status: upload.status,
      uploadedByName: upload.uploadedByName,
    })),
    peoplePerformance: mockUsers.map((member) => {
      const owned = visibleKpis.filter((kpi) => kpi.ownerId === member.id)
      return {
        memberId: member.id,
        name: member.name,
        role: member.role,
        ownedKpiCount: owned.length,
        onTrack: owned.filter((kpi) => kpi.status === 'on-track').length,
        offTrack: owned.filter((kpi) => kpi.status === 'off-track' || kpi.status === 'at-risk').length,
        noData: owned.filter((kpi) => kpi.status === 'no-data').length,
        latestAsOf: owned.map((kpi) => kpi.history.at(-1)?.date).filter(Boolean).sort().pop(),
        cadences: Array.from(new Set(owned.map((kpi) => kpi.cadence ?? 'daily'))).sort(),
        kpis: owned.map((kpi) => ({
          name: kpi.name,
          status: kpi.status === 'at-risk' ? 'off-track' : kpi.status,
          currentValue: kpi.currentValueDisplay,
          target: kpi.target,
          cadence: kpi.cadence ?? 'daily',
          asOf: kpi.history.at(-1)?.date,
          isStale: false,
        })),
      }
    }),
    orgSummary: {
      totalKpis: visibleKpis.length,
      onTrack: visibleKpis.filter((kpi) => kpi.status === 'on-track').length,
      atRisk: visibleKpis.filter((kpi) => kpi.status === 'at-risk').length,
      missed: missedKpis.length,
      lastUpdated: '2026-08-23',
    },
  }
}
