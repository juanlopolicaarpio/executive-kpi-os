import type {
  DailySales,
  PlatformPerformance,
  SkuPerformance,
  InventoryItem,
  KpiHealth,
  Signal,
  Intervention,
  Playbook,
  Learning,
  DecisionRecord,
  DailyBrief,
  BusinessHealth,
  Publication,
} from '@/types/domain'

/**
 * The single contract between the UI and the data source.
 *
 * The whole app reads through this interface, so replacing the mock layer
 * with real integrations (Supabase, marketplace APIs) only requires a new
 * implementation of this interface plus a one-line change in lib/data/index.ts.
 * All methods are async so a network-backed implementation drops in cleanly.
 */
export interface DataRepository {
  // Sales & performance
  getSalesHistory(days?: number): Promise<DailySales[]>
  getPlatformPerformance(): Promise<PlatformPerformance[]>
  getSkuPerformance(): Promise<SkuPerformance[]>
  getInventory(): Promise<InventoryItem[]>

  // KPI health
  getKpiHealth(): Promise<KpiHealth[]>

  // Intelligence
  getSignals(): Promise<Signal[]>
  getInterventions(): Promise<Intervention[]>
  getPlaybooks(): Promise<Playbook[]>
  getLearnings(): Promise<Learning[]>
  getDecisions(): Promise<DecisionRecord[]>

  // Composed views
  getDailyBrief(): Promise<DailyBrief>
  getBusinessHealth(): Promise<BusinessHealth>

  // Publications
  getPublications(): Promise<Publication[]>
}
