import type { Kpi, KpiCategory, KpiDataPoint, KpiStatus, KpiType } from '@/types/kpi'
import type { UserRole } from '@/types/user'
import { getNorthstarKpis } from '@/lib/northstar/demo-data'

const categoryMap: Record<string, KpiCategory> = {
  revenue: 'business-performance',
  profitability: 'profitability',
  acquisition: 'growth-engine',
  retention: 'growth-engine',
  forecast: 'operations',
  expansion: 'business-performance',
  partner_health: 'operations',
  affiliate: 'growth-engine',
  telesales: 'growth-engine',
}

const roleMap: Record<string, UserRole> = {
  ceo: 'ceo',
  finance: 'finance',
  growth: 'econs-manager',
  paid_acquisition: 'econs-officer',
  crm: 'brand',
  partnerships: 'category-lead',
  affiliate: 'affiliate-officer',
  affiliate_marketing: 'affiliate-officer',
  telesales: 'tts-ops',
  customer_intel: 'viewer',
  customer_intelligence: 'brand',
}

const typeFor = (status: KpiStatus): KpiType => (status === 'off-track' ? 'alert' : status === 'at-risk' ? 'shared' : 'track')

export const mockKpis: Kpi[] = getNorthstarKpis().map((kpi) => ({
  id: kpi.appId,
  name: kpi.name,
  category: categoryMap[kpi.backendCategory] ?? 'business-performance',
  strategicPurpose: kpi.description,
  target: kpi.targetDisplay,
  targetNumeric: kpi.targetNumeric ?? undefined,
  currentValue: kpi.currentValue ?? undefined,
  currentValueDisplay: kpi.currentValueDisplay,
  cadence: kpi.rhythm,
  nextCheckDate: '2026-08-24',
  ownerId: kpi.ownerId,
  ownerName: kpi.ownerName,
  ownerRole: roleMap[kpi.ownerRole] ?? 'viewer',
  type: typeFor(kpi.status),
  status: kpi.status,
  platform: 'all',
  trend: kpi.trend,
  whyItsCore: kpi.formula,
  history: kpi.history as KpiDataPoint[],
  uploadSchemaId: 'northstar-demo-upload',
  visibleToRoles: ['ceo', 'finance', 'econs-manager', 'econs-officer', 'category-lead', 'brand', 'affiliate-officer', 'tts-ops', 'viewer'],
  dataSource: 'mock',
  unit: kpi.unit,
  targetDirection: kpi.targetDirection === 'below' ? 'below' : 'above',
}))
