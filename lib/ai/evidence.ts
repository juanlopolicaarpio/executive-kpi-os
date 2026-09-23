import type { CompanyContext } from '@/types/chat'

// PRD §9.5: "Every factual claim about the organization must cite internal
// records or be labeled as an inference" and "Users can inspect and correct the
// evidence set."
//
// A prompt instruction alone cannot satisfy that — the user has to be able to
// SEE which records were in scope. So every record placed into the context is
// given a stable reference id, the model is told to cite those ids inline, and
// the API returns the reference table alongside the answer. The UI renders them
// as inspectable chips.

export type EvidenceKind = 'kpi' | 'initiative' | 'closed-initiative' | 'rollup' | 'miss'

export interface EvidenceRef {
  /** Short, stable, model-friendly id, e.g. `KPI:net_sales`. */
  id: string
  kind: EvidenceKind
  label: string
  /** One-line summary of what this record actually says. */
  summary: string
  /** Where a user goes to check it. Null when there is no dedicated screen. */
  link: string | null
  /** When the underlying data was measured, so staleness is visible. */
  asOf?: string
}

/** Version the prompt so generated output can be reproduced (PRD §9.5). */
export const PROMPT_VERSION = '2026-07-29.1'

const slugToId = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, '_')

/**
 * Build the reference table from the context that will be sent to the model.
 * Ids must be derived deterministically from the record, not from array
 * position, or a re-render would renumber every citation.
 */
export function buildEvidence(context: CompanyContext): EvidenceRef[] {
  const refs: EvidenceRef[] = []

  for (const k of context.kpis) {
    refs.push({
      id: `KPI:${slugToId(k.id)}`,
      kind: 'kpi',
      label: k.name,
      summary: `${k.currentValue} vs target ${k.target} · ${k.status} · owner ${k.ownerName}`,
      link: `/kpis/${k.id}`,
      asOf: k.lastChecked,
    })
  }

  for (const m of context.recentMisses) {
    refs.push({
      id: `MISS:${slugToId(m.kpiName)}`,
      kind: 'miss',
      label: `${m.kpiName} missed target`,
      summary: `Actual ${m.actual} vs target ${m.target}, ${m.consecutiveMisses} consecutive · owner ${m.ownerName}`,
      link: null,
      asOf: m.missedOn,
    })
  }

  for (const i of context.activeInitiatives) {
    refs.push({
      id: `INIT:${slugToId(i.id.slice(0, 8))}`,
      kind: 'initiative',
      label: i.name,
      summary: `${i.type} · ${i.status} · ${i.progressPercent}% · owner ${i.ownerName} · targets ${i.targetKpis.join(', ') || 'no KPI'}`,
      link: `/initiatives/${i.id}`,
    })
  }

  context.closedInitiatives.forEach((c, idx) => {
    refs.push({
      id: `CLOSED:${slugToId(c.name).slice(0, 24)}_${idx}`,
      kind: 'closed-initiative',
      label: c.name,
      summary: `${c.type} · goal ${c.goalAchieved} · ROI ${c.roi != null ? `${c.roi.toFixed(1)}%` : '—'} · spent ${Math.round(c.actualSpend).toLocaleString()} · lesson: ${c.lessonsLearned.slice(0, 120)}`,
      link: null,
    })
  })

  for (const r of context.roiByType) {
    refs.push({
      id: `ROLLUP:${slugToId(r.label)}`,
      kind: 'rollup',
      label: `${r.label} ROI record`,
      summary: `${r.count} closed · ROI ${r.roi != null ? `${r.roi.toFixed(1)}%` : '—'} · success rate ${r.successRatePct}%`,
      link: null,
    })
  }

  return refs
}

/** The citation contract handed to the model, appended to the system prompt. */
export function evidenceInstructions(refs: EvidenceRef[]): string {
  if (refs.length === 0) {
    return `## Evidence
You have NO internal records in scope for this question. Say so plainly and do not assert
anything about the organization's performance, initiatives or history.`
  }

  return `## Evidence and Citation (MANDATORY)
Every factual claim you make about this organization must carry a citation to one of the
record ids below, written inline in square brackets exactly as given — for example [KPI:net_sales].

Rules:
- Cite the id immediately after the claim it supports. Multiple ids are fine: [KPI:aov][CLOSED:Double_Double_0].
- If you cannot support a statement with a record below, either omit it or label it explicitly
  as an inference ("this is an inference, not something the records show").
- Never invent an id. Only the ids listed here exist.
- Never claim causality from timing alone, even when a record supports both facts.

Available records:
${refs.map((r) => `[${r.id}] ${r.label} — ${r.summary}`).join('\n')}`
}

/** Which references the model actually cited, in order of first appearance. */
export function extractCitations(text: string, refs: EvidenceRef[]): EvidenceRef[] {
  const byId = new Map(refs.map((r) => [r.id, r]))
  const seen = new Set<string>()
  const out: EvidenceRef[] = []
  // Match [ANYTHING_WITHOUT_SPACES] and keep only ids we actually issued, so a
  // hallucinated citation is dropped rather than rendered as if it were real.
  for (const m of text.matchAll(/\[([A-Za-z]+:[A-Za-z0-9_]+)\]/g)) {
    const id = m[1]
    if (!id || seen.has(id)) continue
    const ref = byId.get(id)
    if (!ref) continue
    seen.add(id)
    out.push(ref)
  }
  return out
}

/**
 * Confidence band (PRD §9.5 / §14.5: High / Medium / Low, never a precise
 * probability). Derived from how much verified evidence backs the answer, not
 * from the model's self-assessment — a model's stated confidence is not
 * evidence.
 */
export function confidenceBand(context: CompanyContext): {
  band: 'high' | 'medium' | 'low'
  limitations: string[]
} {
  const limitations: string[] = []
  const closed = context.closedInitiatives.length
  const kpisWithData = context.kpis.filter((k) => k.currentValue !== 'awaiting data').length

  if (closed === 0) {
    limitations.push('No closed initiatives yet — there is no historical outcome record to learn from.')
  } else if (closed < 5) {
    limitations.push(
      `Only ${closed} closed initiative${closed === 1 ? '' : 's'} on record — historical patterns are indicative, not established.`,
    )
  }

  const awaiting = context.kpis.length - kpisWithData
  if (awaiting > 0) {
    limitations.push(`${awaiting} of ${context.kpis.length} KPIs have no measurements yet.`)
  }

  if (context.activeInitiatives.some((i) => i.targetKpis.length === 0)) {
    limitations.push('Some running initiatives have no target KPI, so their impact cannot be evaluated.')
  }

  const band: 'high' | 'medium' | 'low' =
    closed >= 5 && awaiting === 0 ? 'high' : closed >= 1 && kpisWithData > 0 ? 'medium' : 'low'

  return { band, limitations }
}
