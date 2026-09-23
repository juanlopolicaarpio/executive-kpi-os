import type { DataRepository } from './repository'
import type {
  BusinessHealth,
  DailyBrief,
  DailySales,
  DecisionRecord,
  InventoryItem,
  Intervention,
  KpiHealth,
  Learning,
  PlatformPerformance,
  Playbook,
  Publication,
  Signal,
  SkuPerformance,
} from '@/types/domain'
import { getNorthstarKpis, northstarAlerts, NORTHSTAR_AS_OF } from '@/lib/northstar/demo-data'

function kpiHealth(): KpiHealth[] {
  return getNorthstarKpis().map((kpi) => ({
    id: kpi.slug,
    headline: kpi.status === 'on-track' ? `${kpi.name} is on track` : `${kpi.name} needs attention`,
    metric: kpi.name,
    valueDisplay: kpi.currentValueDisplay,
    targetDisplay: kpi.targetDisplay,
    attainmentPct: kpi.attainmentPct ?? 0,
    trend: kpi.trend,
    status: kpi.status === 'on-track' ? 'healthy' : kpi.status === 'at-risk' ? 'watch' : 'attention',
    owner: { name: kpi.ownerName, role: 'Growth Lead' },
    sparkline: kpi.history.map((point) => point.value),
  }))
}

function signals(): Signal[] {
  return northstarAlerts.map((alert) => ({
    id: alert.id,
    type: alert.severity === 'Positive' ? 'opportunity' : 'risk',
    headline: `${alert.kpi}: ${alert.severity}`,
    observation: alert.insight,
    implication: alert.section,
    recommendedIntervention: alert.recommendedAction,
    owner: { name: 'Casey Brooks', role: 'Growth Lead' },
    expectedOutcome: 'Improve the August recovery trajectory.',
    confidencePct: 80,
    detectedAt: `${alert.alertDate}T09:00:00Z`,
    relatedKpi: alert.kpi,
    status: alert.status === 'Open' ? 'new' : 'acknowledged',
  }))
}

export class MockRepository implements DataRepository {
  async getSalesHistory(): Promise<DailySales[]> {
    return [
      { date: '2026-06-30', totalSales: 13_028_850, target: 67_000_000, orders: 6420, byPlatform: { shopee: 4_169_232, lazada: 3_126_924, 'tiktok-shop': 2_735_058 } },
      { date: '2026-07-31', totalSales: 11_753_125, target: 73_800_000, orders: 5936, byPlatform: { shopee: 3_760_998, lazada: 2_820_750, 'tiktok-shop': 2_468_156 } },
      { date: '2026-08-23', totalSales: 340_013, target: 1_747_088, orders: 418, byPlatform: { shopee: 108_804, lazada: 81_603, 'tiktok-shop': 71_403 } },
    ]
  }

  async getPlatformPerformance(): Promise<PlatformPerformance[]> {
    return [
      { platform: 'shopee', takeaway: 'Paid search is recovering', sales30d: 961_501, growthPct: 18, conversionPct: 6.5, conversionTrend: 'up', traffic30d: 110_841, roas: 1.9 },
      { platform: 'lazada', takeaway: 'Paid social remains selective', sales30d: 733_334, growthPct: 9, conversionPct: 5.4, conversionTrend: 'flat', traffic30d: 82_983, roas: 1.7 },
      { platform: 'tiktok-shop', takeaway: 'Affiliate contribution is stable', sales30d: 660_323, growthPct: 12, conversionPct: 5.1, conversionTrend: 'up', traffic30d: 63_342, roas: 1.8 },
    ]
  }

  async getSkuPerformance(): Promise<SkuPerformance[]> {
    return [
      { id: 'credit-card', name: 'Credit Card', category: 'Core Financial Products', revenue30d: 1_307_606, unitsSold30d: 0, growthPct: 14.7, topPlatform: 'shopee' },
      { id: 'broadband', name: 'Broadband', category: 'New Verticals', revenue30d: 353_498, unitsSold30d: 0, growthPct: 22.8, topPlatform: 'tiktok-shop' },
    ]
  }

  async getInventory(): Promise<InventoryItem[]> { return [] }
  async getKpiHealth(): Promise<KpiHealth[]> { return kpiHealth() }
  async getSignals(): Promise<Signal[]> { return signals() }
  async getInterventions(): Promise<Intervention[]> { return [] }
  async getPlaybooks(): Promise<Playbook[]> { return [] }
  async getLearnings(): Promise<Learning[]> { return [] }
  async getDecisions(): Promise<DecisionRecord[]> { return [] }
  async getPublications(): Promise<Publication[]> { return [] }

  async getDailyBrief(): Promise<DailyBrief> {
    return {
      date: NORTHSTAR_AS_OF,
      headline: 'Revenue remains below plan while recovery signals improve',
      yesterdaySales: 340_013,
      periodLabel: 'August 2026',
      growthPct: 4.6,
      targetAchievementPct: 19,
      attentionItems: signals().filter((signal) => signal.type === 'risk').slice(0, 3),
      opportunities: signals().filter((signal) => signal.type === 'opportunity').slice(0, 2),
      actionsDueToday: [],
      recommendedFocus: 'Start with traffic recovery and partner approval quality.',
    }
  }

  async getBusinessHealth(): Promise<BusinessHealth> {
    const allSignals = signals()
    return {
      takeaway: 'Revenue remains below plan while recovery signals improve',
      summary: `Northstar demo data as of ${NORTHSTAR_AS_OF}.`,
      kpis: kpiHealth(),
      risks: allSignals.filter((signal) => signal.type === 'risk'),
      opportunities: allSignals.filter((signal) => signal.type === 'opportunity'),
    }
  }
}
