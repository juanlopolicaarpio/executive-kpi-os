import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getClient, getOrgId, loadLookups, assembleInitiatives } from '@/lib/initiatives/mapping'
import { computeStatus, computeTrend, parseThresholds, DEFAULT_THRESHOLDS, type TargetDirection } from '@/lib/kpi/status'
import { APP_ID_TO_SLUG } from '@/lib/kpi-map'
import { PROMPT_VERSION } from '@/lib/ai/evidence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MODEL = 'claude-sonnet-4-6'

// GET /api/kpis/[kpiId]/explain — PRD §6.2 AI Insight and §9.2 KPI explanation.
//
// "What changed, trend context, related KPI movements, related initiatives,
// data limitations and hypotheses."
//
// The hard requirement here is §9.5: no causality from timing alone. Initiative
// timing is supplied as CONTEXT and the model is told explicitly that overlap
// is not proof — because on a KPI page, a chart with an initiative marker on it
// is exactly where a reader is most tempted to infer cause.

export async function GET(req: Request, ctx: { params: Promise<{ kpiId: string }> }): Promise<Response> {
  const { kpiId } = await ctx.params
  const slug = APP_ID_TO_SLUG[kpiId]
  const sb = getClient()

  if (!sb || !slug) {
    return Response.json({ available: false, reason: 'Unknown KPI.' })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ available: false, reason: 'Backend unavailable.' })

    const [{ data: org }, { data: defs }, { data: aks }, { data: snaps }] = await Promise.all([
      sb.from('organizations').select('*').eq('id', orgId).single(),
      sb.from('kpi_definitions').select('id,slug,name,unit,description,formula_description'),
      sb.from('active_kpis').select('*').eq('org_id', orgId),
      sb
        .from('kpi_snapshots')
        .select('kpi_slug,value,target_value,computed_at')
        .eq('org_id', orgId)
        .eq('kpi_slug', slug)
        .order('computed_at', { ascending: true }),
    ])

    const def = (defs ?? []).find((d) => d.slug === slug)
    if (!def) return Response.json({ available: false, reason: 'KPI not configured.' })
    const active = (aks ?? []).find((a) => a.kpi_def_id === def.id)

    const series = snaps ?? []
    if (series.length === 0) {
      return Response.json({
        available: false,
        reason: 'No measurements recorded for this KPI yet, so there is nothing to explain.',
      })
    }

    const latest = series[series.length - 1]!
    const prev = series[series.length - 2]
    const direction = (active?.target_direction as TargetDirection) ?? 'above'
    const thresholds = active?.thresholds
      ? parseThresholds(active.thresholds)
      : parseThresholds(org?.default_thresholds ?? DEFAULT_THRESHOLDS)

    const status = computeStatus({
      value: Number(latest.value),
      target: active?.target_value != null ? Number(active.target_value) : null,
      direction,
      lower: active?.target_lower != null ? Number(active.target_lower) : null,
      upper: active?.target_upper != null ? Number(active.target_upper) : null,
      thresholds,
    })
    const trend = computeTrend(
      Number(latest.value),
      prev ? Number(prev.value) : null,
      direction,
    )
    // Initiatives that targeted this KPI — context, explicitly not causation.
    const deps = await loadLookups(sb, orgId)
    let related: { name: string; status: string; window: string; goal?: string; roi?: number | null }[] = []
    try {
      const { data: links } = await sb
        .from('initiative_kpis')
        .select('initiative_id')
        .eq('kpi_slug', slug)
      const ids = (links ?? []).map((l) => String(l.initiative_id))
      if (ids.length > 0) {
        const { data: rows } = await sb.from('initiatives').select('*').in('id', ids)
        const initiatives = await assembleInitiatives(sb, rows ?? [], deps)
        related = initiatives.map((i) => ({
          name: i.name,
          status: i.status,
          window: `${i.startDate ?? '—'} to ${i.endDate ?? '—'}`,
          goal: i.results?.goalAchieved,
          roi: i.results?.roi ?? null,
        }))
      }
    } catch {
      /* pre-migration */
    }

    const history = series
      .slice(-12)
      .map((s) => `${String(s.computed_at).slice(0, 7)}: ${s.value}${s.target_value != null ? ` (target ${s.target_value})` : ''}`)
      .join('\n')

    const limitations: string[] = []
    if (series.length < 3) limitations.push('Fewer than three measurements — trend is not yet meaningful.')
    if (active?.target_value == null) limitations.push('No target is set, so status cannot be evaluated.')
    if (related.length === 0) limitations.push('No initiatives have targeted this KPI, so no action context exists.')

    const prompt = `You are explaining ONE KPI inside KPI OS for a Philippine health-supplements e-commerce brand.

KPI: ${def.name} (${def.unit})
Definition: ${def.description ?? '—'}
Formula: ${def.formula_description ?? '—'}
Direction: ${direction === 'below' ? 'lower is better' : direction === 'range' ? 'target range' : 'higher is better'}
Current: ${latest.value}${active?.target_value != null ? ` vs target ${active.target_value}` : ' (no target set)'}
Status: ${status.status}${status.deviationPct != null ? ` (${status.deviationPct > 0 ? '+' : ''}${status.deviationPct.toFixed(1)}% vs target)` : ''}
Trend: ${trend.direction}${trend.changePct != null ? ` (${trend.changePct.toFixed(1)}% period over period)` : ''}${trend.isMaterial ? ' - significant movement' : ''}

Last 12 measurements:
${history}

Initiatives that targeted this KPI:
${related.length > 0 ? related.map((r) => `- ${r.name} (${r.status}, ${r.window})${r.goal ? ` — goal ${r.goal}, ROI ${r.roi != null ? `${r.roi.toFixed(0)}%` : 'n/a'}` : ''}`).join('\n') : '- none'}

Known data limitations:
${limitations.length > 0 ? limitations.map((l) => `- ${l}`).join('\n') : '- none'}

Write four short labelled sections, no preamble:
**What changed** — the movement, in plain numbers.
**Likely drivers** — HYPOTHESES only. Label each as a hypothesis. If an initiative overlaps in time, you may note the overlap but you must state explicitly that timing is not evidence of cause.
**Limitations** — restate any limitation above that affects how much weight to put on this read. If there are none, say the data supports this read.
**What to do next** — one or two concrete actions, naming an initiative type where relevant.

Be concise. Under 200 words total. Never assert causality.`

    try {
      const { text } = await generateText({
        model: anthropic(MODEL),
        prompt,
        maxOutputTokens: 700,
      })
      return Response.json({
        available: true,
        insight: text.trim(),
        status: status.status,
        deviationPct: status.deviationPct,
        trend: trend.direction,
        changePct: trend.changePct,
        isMaterial: trend.isMaterial,
        isStale: false,
        asOf: String(latest.computed_at),
        relatedInitiatives: related,
        limitations,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
      })
    } catch {
      // AI down: the computed facts are still worth returning. PRD §4.3 —
      // core KPI functionality must survive an AI outage.
      return Response.json({
        available: false,
        reason: 'AI is unavailable right now.',
        status: status.status,
        deviationPct: status.deviationPct,
        trend: trend.direction,
        changePct: trend.changePct,
        isStale: false,
        asOf: String(latest.computed_at),
        relatedInitiatives: related,
        limitations,
      })
    }
  } catch (e) {
    return Response.json({ available: false, reason: e instanceof Error ? e.message : 'Unknown error' })
  }
}
