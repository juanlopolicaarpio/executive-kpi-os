import { getClient, getOrgId, loadLookups, assembleInitiatives } from '@/lib/initiatives/mapping'
import { isInSection, TYPE_LABELS } from '@/lib/initiatives/lifecycle'
import type { Initiative, InitiativeType } from '@/types/initiative'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/initiatives/stats — the portfolio read.
//
// Backs Home ("what's running?") and the AI Coach's investment questions:
// which initiative types consistently return, which KPIs respond to spend, and
// where the next peso should go. Rollups only count CLOSED initiatives with
// reviewed results, so nothing enters the ROI record before it is verified.

export interface TypeRollup {
  initiativeType: InitiativeType
  label: string
  count: number
  totalSpend: number
  totalIncrementalProfit: number
  /** Portfolio ROI for the type: aggregate profit vs aggregate spend. */
  roi: number | null
  successRatePct: number
}

export interface KpiRollup {
  kpiSlug: string
  name: string
  initiativeCount: number
  totalSpend: number
  roi: number | null
}

export async function GET(): Promise<Response> {
  const sb = getClient()
  const empty = {
    counts: {
      drafts: 0,
      active: 0,
      pendingApproval: 0,
      approvedNotStarted: 0,
      forReview: 0,
      closed: 0,
      draft: 0,
    },
    budget: { approvedInFlight: 0, spentInFlight: 0, totalSpendClosed: 0, totalIncrementalProfit: 0 },
    portfolioRoi: null as number | null,
    byType: [] as TypeRollup[],
    byKpi: [] as KpiRollup[],
    topPerformers: [] as Initiative[],
    underPerformers: [] as Initiative[],
    recentlyClosed: [] as Initiative[],
    unavailable: true,
  }
  if (!sb) return Response.json(empty)

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json(empty)

    const deps = await loadLookups(sb, orgId)
    const { data: rows, error } = await sb.from('initiatives').select('*').eq('org_id', orgId)
    if (error) return Response.json(empty)

    const all = await assembleInitiatives(sb, rows ?? [], deps)

    const counts = {
      drafts: all.filter((i) => i.status === 'draft').length,
      active: all.filter((i) => isInSection(i, 'active')).length,
      pendingApproval: all.filter((i) => isInSection(i, 'pending-approval')).length,
      approvedNotStarted: all.filter((i) => i.status === 'approved').length,
      forReview: all.filter((i) => isInSection(i, 'for-review')).length,
      closed: all.filter((i) => isInSection(i, 'closed')).length,
      draft: all.filter((i) => i.status === 'draft').length,
    }

    const inFlight = all.filter((i) => i.status === 'active' || i.status === 'completed')
    const budget = {
      approvedInFlight: sum(inFlight.map((i) => i.approvedBudget)),
      spentInFlight: sum(inFlight.map((i) => i.actualSpend)),
      totalSpendClosed: 0,
      totalIncrementalProfit: 0,
    }

    // Only verified outcomes count toward the ROI record.
    const closed = all.filter((i) => i.status === 'closed' && i.results?.reviewedAt)
    budget.totalSpendClosed = sum(closed.map((i) => i.results?.actualSpend))
    budget.totalIncrementalProfit = sum(closed.map((i) => i.results?.incrementalProfit))
    const portfolioRoi =
      budget.totalSpendClosed > 0
        ? ((budget.totalIncrementalProfit - budget.totalSpendClosed) / budget.totalSpendClosed) * 100
        : null

    // By initiative type — "which campaigns consistently outperform?"
    const typeGroups = new Map<InitiativeType, Initiative[]>()
    for (const i of closed) {
      const list = typeGroups.get(i.initiativeType) ?? []
      list.push(i)
      typeGroups.set(i.initiativeType, list)
    }
    const byType: TypeRollup[] = [...typeGroups.entries()]
      .map(([initiativeType, list]) => {
        const spend = sum(list.map((i) => i.results?.actualSpend))
        const profit = sum(list.map((i) => i.results?.incrementalProfit))
        const wins = list.filter((i) => i.results?.goalAchieved === 'yes').length
        return {
          initiativeType,
          label: TYPE_LABELS[initiativeType],
          count: list.length,
          totalSpend: spend,
          totalIncrementalProfit: profit,
          roi: spend > 0 ? ((profit - spend) / spend) * 100 : null,
          successRatePct: list.length > 0 ? Math.round((wins / list.length) * 100) : 0,
        }
      })
      .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity))

    // By KPI — "which KPIs actually respond to spend?"
    const kpiGroups = new Map<string, { spend: number; profit: number; count: number }>()
    for (const i of closed) {
      // Attribute the whole initiative to each KPI it targeted. Splitting spend
      // across KPIs would imply a precision the data does not have.
      for (const k of i.targetKpis) {
        const g = kpiGroups.get(k.kpiSlug) ?? { spend: 0, profit: 0, count: 0 }
        g.spend += i.results?.actualSpend ?? 0
        g.profit += i.results?.incrementalProfit ?? 0
        g.count += 1
        kpiGroups.set(k.kpiSlug, g)
      }
    }
    const byKpi: KpiRollup[] = [...kpiGroups.entries()]
      .map(([kpiSlug, g]) => ({
        kpiSlug,
        name: deps.kpiMeta[kpiSlug]?.name ?? kpiSlug,
        initiativeCount: g.count,
        totalSpend: g.spend,
        roi: g.spend > 0 ? ((g.profit - g.spend) / g.spend) * 100 : null,
      }))
      .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity))

    const ranked = [...closed]
      .filter((i) => i.results?.roi != null)
      .sort((a, b) => (b.results!.roi ?? 0) - (a.results!.roi ?? 0))

    return Response.json({
      counts,
      budget,
      portfolioRoi,
      byType,
      byKpi,
      topPerformers: ranked.slice(0, 5),
      underPerformers: ranked.slice(-5).reverse().filter((i) => (i.results?.roi ?? 0) < 0),
      recentlyClosed: [...closed]
        .sort((a, b) => +new Date(b.closedAt ?? 0) - +new Date(a.closedAt ?? 0))
        .slice(0, 5),
    })
  } catch {
    return Response.json(empty)
  }
}

function sum(values: (number | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0)
}
