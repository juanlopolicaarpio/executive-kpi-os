import type { DataRepository } from './repository'
import type {
  DailySales, PlatformPerformance, SkuPerformance, InventoryItem, KpiHealth, Signal,
  Intervention, Playbook, Learning, DecisionRecord, DailyBrief, BusinessHealth, Publication,
} from '@/types/domain'
import { MockRepository } from './mock-repository'

interface LivePayload {
  kpiHealth: KpiHealth[]; signals: Signal[]; interventions: Intervention[]; playbooks: Playbook[]
  learnings: Learning[]; decisions: DecisionRecord[]; publications: Publication[]
  salesHistory: DailySales[]; platformPerformance: PlatformPerformance[]; skuPerformance: SkuPerformance[]
  inventory: InventoryItem[]; dailyBrief: DailyBrief; businessHealth: BusinessHealth
}

/**
 * Real data source for the whole app: every screen reads through this.
 * Fetches once from /api/data/live (server-side Supabase) and serves all
 * DataRepository methods from it. Resources the backend genuinely has no data
 * for come back EMPTY — never mock — so screens show honest empty states.
 *
 * Falls back to the mock repository ONLY if the backend is unreachable, so the
 * app never hard-fails.
 */
export class LiveRepository implements DataRepository {
  private cache: { t: number; p: Promise<LivePayload | null> } | null = null
  private fallback = new MockRepository()

  private load(): Promise<LivePayload | null> {
    if (typeof window === 'undefined') return Promise.resolve(null)
    if (this.cache && Date.now() - this.cache.t < 15000) return this.cache.p
    const p = fetch('/api/data/live')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && d.businessHealth ? (d as LivePayload) : null))
      .catch(() => null)
    this.cache = { t: Date.now(), p }
    return p
  }

  private async get<K extends keyof LivePayload>(key: K, fb: () => Promise<LivePayload[K]>): Promise<LivePayload[K]> {
    const d = await this.load()
    return d ? d[key] : fb()
  }

  getSalesHistory() { return this.get('salesHistory', () => this.fallback.getSalesHistory()) }
  getPlatformPerformance() { return this.get('platformPerformance', () => this.fallback.getPlatformPerformance()) }
  getSkuPerformance() { return this.get('skuPerformance', () => this.fallback.getSkuPerformance()) }
  getInventory() { return this.get('inventory', () => this.fallback.getInventory()) }
  getKpiHealth() { return this.get('kpiHealth', () => this.fallback.getKpiHealth()) }
  getSignals() { return this.get('signals', () => this.fallback.getSignals()) }
  getInterventions() { return this.get('interventions', () => this.fallback.getInterventions()) }
  getPlaybooks() { return this.get('playbooks', () => this.fallback.getPlaybooks()) }
  getLearnings() { return this.get('learnings', () => this.fallback.getLearnings()) }
  getDecisions() { return this.get('decisions', () => this.fallback.getDecisions()) }
  getDailyBrief() { return this.get('dailyBrief', () => this.fallback.getDailyBrief()) }
  getBusinessHealth() { return this.get('businessHealth', () => this.fallback.getBusinessHealth()) }
  getPublications() { return this.get('publications', () => this.fallback.getPublications()) }
}
