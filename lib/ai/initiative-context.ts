import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  InitiativeContextItem,
  ClosedInitiativeContextItem,
  RoiRollupItem,
} from '@/types/chat'
import { TYPE_LABELS } from '@/lib/initiatives/lifecycle'
import { loadLookups, assembleInitiatives } from '@/lib/initiatives/mapping'
import type { InitiativeType } from '@/types/initiative'

// Feeds the AI Coach the half of the picture it was missing: what the org is
// actually doing, what it cost, and what past initiatives returned.
//
// Closed initiatives are the valuable part — they are the institutional memory
// that lets the assistant answer "which campaigns consistently outperform?" and
// "where should next month's budget go?" with evidence rather than opinion.

export interface InitiativeContext {
  activeInitiatives: InitiativeContextItem[]
  closedInitiatives: ClosedInitiativeContextItem[]
  roiByType: RoiRollupItem[]
  portfolio: {
    activeCount: number
    budgetInFlight: number
    totalSpendClosed: number
    totalIncrementalProfit: number
    portfolioRoi: number | null
  }
}

const EMPTY: InitiativeContext = {
  activeInitiatives: [],
  closedInitiatives: [],
  roiByType: [],
  portfolio: {
    activeCount: 0,
    budgetInFlight: 0,
    totalSpendClosed: 0,
    totalIncrementalProfit: 0,
    portfolioRoi: null,
  },
}

const timeline = (start?: string, end?: string) =>
  start || end ? `${start ?? '—'} to ${end ?? '—'}` : 'no dates set'

export async function buildInitiativeContext(
  sb: SupabaseClient,
  orgId: string,
): Promise<InitiativeContext> {
  try {
    const { data: rows, error } = await sb.from('initiatives').select('*').eq('org_id', orgId)
    // Pre-migration the table does not exist — the assistant simply has no
    // initiative context rather than failing the whole chat.
    if (error || !rows) return EMPTY

    const deps = await loadLookups(sb, orgId)
    const all = await assembleInitiatives(sb, rows, deps)
    const now = new Date()

    const inFlight = all.filter((i) =>
      ['pending-approval', 'approved', 'active', 'completed'].includes(i.status),
    )
    const activeInitiatives: InitiativeContextItem[] = inFlight.map((i) => ({
      id: i.id,
      name: i.name,
      type: TYPE_LABELS[i.initiativeType],
      status: i.status,
      ownerName: i.ownerName ?? 'Unassigned',
      approverName: i.approverName,
      progressPercent: i.progressPercent,
      timeline: timeline(i.startDate, i.endDate),
      approvedBudget: i.approvedBudget,
      actualSpend: i.actualSpend,
      targetKpis: i.targetKpis.map((k) => deps.kpiMeta[k.kpiSlug]?.name ?? k.kpiSlug),
      overdue: Boolean(i.status === 'active' && i.endDate && +new Date(i.endDate) < +now),
    }))

    const closed = all.filter((i) => i.status === 'closed' && i.results?.reviewedAt)
    const closedInitiatives: ClosedInitiativeContextItem[] = closed
      .sort((a, b) => +new Date(b.closedAt ?? 0) - +new Date(a.closedAt ?? 0))
      // Cap the payload — the most recent 25 closed initiatives carry the
      // signal without flooding the prompt.
      .slice(0, 25)
      .map((i) => ({
        name: i.name,
        type: TYPE_LABELS[i.initiativeType],
          ownerName: i.ownerName ?? 'Unassigned',
        timeline: timeline(i.startDate, i.endDate),
        targetKpis: i.targetKpis.map((k) => deps.kpiMeta[k.kpiSlug]?.name ?? k.kpiSlug),
        approvedBudget: i.approvedBudget,
        actualSpend: i.results!.actualSpend,
        revenueGenerated: i.results!.revenueGenerated,
        incrementalProfit: i.results!.incrementalProfit,
        roi: i.results!.roi,
        roas: i.results!.roas,
        goalAchieved: i.results!.goalAchieved,
        businessResults: i.results!.businessResults,
        lessonsLearned: i.results!.lessonsLearned,
      }))

    // Aggregate return by type — the basis for investment recommendations.
    const groups = new Map<InitiativeType, typeof closed>()
    for (const i of closed) {
      const list = groups.get(i.initiativeType) ?? []
      list.push(i)
      groups.set(i.initiativeType, list)
    }
    const roiByType: RoiRollupItem[] = [...groups.entries()]
      .map(([type, list]) => {
        const spend = sum(list.map((i) => i.results?.actualSpend))
        const profit = sum(list.map((i) => i.results?.incrementalProfit))
        const wins = list.filter((i) => i.results?.goalAchieved === 'yes').length
        return {
          label: TYPE_LABELS[type],
          count: list.length,
          totalSpend: spend,
          totalIncrementalProfit: profit,
          roi: spend > 0 ? ((profit - spend) / spend) * 100 : null,
          successRatePct: Math.round((wins / list.length) * 100),
        }
      })
      .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity))

    const totalSpendClosed = sum(closed.map((i) => i.results?.actualSpend))
    const totalIncrementalProfit = sum(closed.map((i) => i.results?.incrementalProfit))

    return {
      activeInitiatives,
      closedInitiatives,
      roiByType,
      portfolio: {
        activeCount: all.filter((i) => i.status === 'active').length,
        budgetInFlight: sum(inFlight.map((i) => i.approvedBudget)),
        totalSpendClosed,
        totalIncrementalProfit,
        portfolioRoi:
          totalSpendClosed > 0
            ? ((totalIncrementalProfit - totalSpendClosed) / totalSpendClosed) * 100
            : null,
      },
    }
  } catch {
    return EMPTY
  }
}

function sum(values: (number | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0)
}
