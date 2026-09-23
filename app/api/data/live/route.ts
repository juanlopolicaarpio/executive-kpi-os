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

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const kpis = getNorthstarKpis()
  const kpiHealth: KpiHealth[] = kpis.map((kpi) => ({
    id: kpi.slug,
    headline: kpi.status === 'on-track' ? `${kpi.name} is on track` : `${kpi.name} needs attention`,
    metric: kpi.name,
    valueDisplay: kpi.currentValueDisplay,
    targetDisplay: kpi.targetDisplay,
    attainmentPct: kpi.attainmentPct ?? 0,
    trend: kpi.trend,
    status: kpi.status === 'on-track' ? 'healthy' : kpi.status === 'at-risk' ? 'watch' : 'attention',
    owner: { name: kpi.ownerName, role: ownerRole(kpi.ownerRole) },
    sparkline: kpi.history.map((point) => point.value),
  }))

  const risks: Signal[] = northstarAlerts
    .filter((alert) => alert.severity === 'Critical' || alert.severity === 'High')
    .map((alert) => ({
      id: alert.id,
      type: 'risk',
      headline: `${alert.kpi} needs attention`,
      observation: alert.insight,
      implication: `${alert.section} can drag revenue recovery if not addressed.`,
      recommendedIntervention: alert.recommendedAction,
      owner: { name: 'Casey Brooks', role: 'Growth Lead' },
      expectedOutcome: 'Restore the August run rate without weakening approval quality.',
      confidencePct: 84,
      detectedAt: `${alert.alertDate}T09:00:00Z`,
      relatedKpi: alert.kpi,
      status: alert.status === 'Open' ? 'new' : 'acknowledged',
    }))

  const opportunities: Signal[] = northstarAlerts
    .filter((alert) => alert.severity === 'Positive')
    .map((alert) => ({
      id: alert.id,
      type: 'opportunity',
      headline: `${alert.kpi} is working`,
      observation: alert.insight,
      implication: 'This is a credible upside lever while the acquisition funnel recovers.',
      recommendedIntervention: alert.recommendedAction,
      owner: {
        name: alert.kpi === 'Broadband' ? 'Taylor Kim' : 'Riley Chen',
        role: alert.kpi === 'Broadband' ? 'Marketplace Lead' : 'Growth Lead',
      },
      expectedOutcome: 'Increase contribution from lifecycle and new verticals.',
      confidencePct: 79,
      detectedAt: `${alert.alertDate}T09:00:00Z`,
      relatedKpi: alert.kpi,
      status: 'new',
    }))

  const revenue = kpis.find((kpi) => kpi.slug === 'revenue')
  const target = revenue?.targetNumeric ?? 0
  const salesHistory: DailySales[] = [
    { date: '2026-06-30', totalSales: 13_028_850, target: 67_000_000, orders: 6420, byPlatform: { shopee: 4_169_232, lazada: 3_126_924, 'tiktok-shop': 2_735_058 } },
    { date: '2026-07-31', totalSales: 11_753_125, target: 73_800_000, orders: 5936, byPlatform: { shopee: 3_760_998, lazada: 2_820_750, 'tiktok-shop': 2_468_156 } },
    { date: '2026-08-23', totalSales: revenue?.currentValue ?? 0, target, orders: 418, byPlatform: { shopee: 108_804, lazada: 81_603, 'tiktok-shop': 71_403 } },
  ]

  const platformPerformance: PlatformPerformance[] = [
    { platform: 'shopee', takeaway: 'Paid search is recovering', sales30d: 961_501, growthPct: 18, conversionPct: 6.5, conversionTrend: 'up', traffic30d: 110_841, roas: 1.9 },
    { platform: 'lazada', takeaway: 'Paid social remains selective', sales30d: 733_334, growthPct: 9, conversionPct: 5.4, conversionTrend: 'flat', traffic30d: 82_983, roas: 1.7 },
    { platform: 'tiktok-shop', takeaway: 'Affiliate contribution is stable', sales30d: 660_323, growthPct: 12, conversionPct: 5.1, conversionTrend: 'up', traffic30d: 63_342, roas: 1.8 },
  ]

  const interventions: Intervention[] = [
    {
      id: 'ns-intervention-traffic',
      title: 'Review paid traffic recovery plan',
      issue: 'Website visits are still below target after the early-August dip.',
      owner: { name: 'Casey Brooks', role: 'Growth Lead' },
      dueDate: '2026-08-24',
      status: 'in-progress',
      progressPct: 65,
      expectedOutcome: 'Recover qualified traffic while keeping CPA inside target.',
      sourceSignalId: 'alert-traffic-softness',
    },
    {
      id: 'ns-intervention-partner-rules',
      title: 'Confirm bank approval-rule changes',
      issue: 'Selected bank partners showed temporary approval-rate pressure.',
      owner: { name: 'Taylor Kim', role: 'Marketplace Lead' },
      dueDate: '2026-08-24',
      status: 'in-progress',
      progressPct: 70,
      expectedOutcome: 'Confirm which traffic can be scaled without lowering approval quality.',
      sourceSignalId: 'alert-approval-pressure',
    },
  ]

  const businessHealth: BusinessHealth = {
    takeaway: 'Revenue remains below plan while recovery signals improve',
    summary: `Northstar demo data as of ${NORTHSTAR_AS_OF}: ${kpiHealth.filter((kpi) => kpi.status === 'healthy').length} KPIs are on track and ${risks.length} risks need executive attention.`,
    kpis: kpiHealth,
    risks,
    opportunities,
  }

  const dailyBrief: DailyBrief = {
    date: NORTHSTAR_AS_OF,
    headline: businessHealth.takeaway,
    yesterdaySales: revenue?.currentValue ?? 0,
    periodLabel: 'August 2026',
    growthPct: 4.6,
    targetAchievementPct: revenue?.attainmentPct ?? 0,
    attentionItems: risks.slice(0, 3),
    opportunities: opportunities.slice(0, 2),
    actionsDueToday: interventions,
    recommendedFocus: 'Start with traffic recovery and partner approval quality before scaling paid volume.',
  }

  const skuPerformance: SkuPerformance[] = [
    { id: 'credit-card', name: 'Credit Card', category: 'Core Financial Products', revenue30d: 1_307_606, unitsSold30d: 0, growthPct: 14.7, topPlatform: 'shopee' },
    { id: 'personal-loan', name: 'Personal Loan', category: 'Core Financial Products', revenue30d: 720_037, unitsSold30d: 0, growthPct: 16.4, topPlatform: 'shopee' },
    { id: 'broadband', name: 'Broadband', category: 'New Verticals', revenue30d: 353_498, unitsSold30d: 0, growthPct: 22.8, topPlatform: 'tiktok-shop' },
  ]

  const playbooks: Playbook[] = []
  const learnings: Learning[] = []
  const decisions: DecisionRecord[] = []
  const publications: Publication[] = []
  const inventory: InventoryItem[] = []

  return Response.json({
    kpiHealth,
    signals: [...risks, ...opportunities],
    interventions,
    playbooks,
    learnings,
    decisions,
    publications,
    salesHistory,
    platformPerformance,
    skuPerformance,
    inventory,
    dailyBrief,
    businessHealth,
  })
}

function ownerRole(role: string): KpiHealth['owner']['role'] {
  if (role === 'affiliate' || role === 'affiliate_marketing') return 'Media Lead'
  if (role === 'telesales') return 'Operations Lead'
  if (role === 'partnerships') return 'Marketplace Lead'
  if (role === 'paid_acquisition' || role === 'crm' || role === 'crm_lifecycle' || role === 'growth' || role === 'growth_lead') return 'Growth Lead'
  if (role === 'finance') return 'Growth Lead'
  return 'E-Commerce Lead'
}
