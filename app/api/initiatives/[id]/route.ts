import {
  getClient,
  getOrgId,
  loadLookups,
  assembleInitiatives,
  toInitiativeEvent,
  typeToDb,
} from '@/lib/initiatives/mapping'
import type { InitiativePriority, InitiativeType } from '@/types/initiative'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET   /api/initiatives/[id] — full detail: basic info, target KPIs (with the
//                               KPI's own trend), budget, results, and the
//                               accountability thread.
// PATCH /api/initiatives/[id] — edit the plan. Only fields that make sense to
//                               change post-hoc are writable; status moves go
//                               through /actions instead.

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const { data: row, error } = await sb
      .from('initiatives')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error || !row) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    const deps = await loadLookups(sb, orgId)
    const [initiative] = await assembleInitiatives(sb, [row], deps)
    if (!initiative) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    const { data: eventRows } = await sb
      .from('initiative_events')
      .select('*')
      .eq('initiative_id', id)
      .order('created_at', { ascending: true })

    initiative.events = (eventRows ?? []).map(toInitiativeEvent)

    // The KPI series behind each target, so the detail page can show whether
    // the needle actually moved rather than just what was promised.
    const slugs = initiative.targetKpis.map((k) => k.kpiSlug)
    let kpiSeries: Record<string, { date: string; value: number; target: number | null }[]> = {}
    if (slugs.length > 0) {
      const { data: snaps } = await sb
        .from('kpi_snapshots')
        .select('kpi_slug,value,target_value,computed_at')
        .eq('org_id', orgId)
        .in('kpi_slug', slugs)
        .order('computed_at', { ascending: true })

      kpiSeries = (snaps ?? []).reduce<typeof kpiSeries>((acc, s) => {
        ;(acc[String(s.kpi_slug)] ??= []).push({
          date: String(s.computed_at).slice(0, 10),
          value: Number(s.value),
          target: s.target_value == null ? null : Number(s.target_value),
        })
        return acc
      }, {})
    }

    return Response.json({ initiative, kpiSeries })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

interface PatchBody {
  name?: string
  description?: string
  initiativeType?: InitiativeType
  priority?: InitiativePriority
  startDate?: string | null
  endDate?: string | null
  approvedBudget?: number | null
  actualSpend?: number | null
  targetKpiSlugs?: string[]
  primaryKpiSlug?: string
}

export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const { data: existing } = await sb
      .from('initiatives')
      .select('id,status,start_date,end_date')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!existing) return Response.json({ error: 'Initiative not found' }, { status: 404 })
    if (existing.status === 'closed' || existing.status === 'cancelled') {
      return Response.json({ error: `A ${existing.status} initiative cannot be edited` }, { status: 409 })
    }

    const patch: Record<string, unknown> = {}
    if (body.name !== undefined) {
      if (!body.name.trim()) return Response.json({ error: 'Name cannot be empty' }, { status: 400 })
      patch['name'] = body.name.trim()
    }
    if (body.description !== undefined) patch['description'] = body.description
    if (body.initiativeType !== undefined) patch['initiative_type'] = typeToDb(body.initiativeType)
    if (body.priority !== undefined) patch['priority'] = body.priority
    if (body.startDate !== undefined) patch['start_date'] = body.startDate
    if (body.endDate !== undefined) patch['end_date'] = body.endDate
    if (body.approvedBudget !== undefined) patch['approved_budget'] = body.approvedBudget
    if (body.actualSpend !== undefined) patch['actual_spend'] = body.actualSpend

    const start = (body.startDate ?? existing.start_date) as string | null
    const end = (body.endDate ?? existing.end_date) as string | null
    if (start && end && end < start) {
      return Response.json({ error: 'End date must be on or after the start date' }, { status: 400 })
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await sb.from('initiatives').update(patch).eq('id', id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    // Target KPIs are replaced wholesale when provided, but existing rows are
    // preserved so captured baselines/results are not lost on an unrelated edit.
    if (body.targetKpiSlugs) {
      const slugs = [...new Set(body.targetKpiSlugs)]
      const { data: current } = await sb
        .from('initiative_kpis')
        .select('id,kpi_slug')
        .eq('initiative_id', id)

      const currentSlugs = new Set((current ?? []).map((r) => String(r.kpi_slug)))
      const toRemove = (current ?? []).filter((r) => !slugs.includes(String(r.kpi_slug)))
      const toAdd = slugs.filter((s) => !currentSlugs.has(s))

      if (toRemove.length > 0) {
        await sb
          .from('initiative_kpis')
          .delete()
          .in('id', toRemove.map((r) => r.id))
      }
      if (toAdd.length > 0) {
        await sb.from('initiative_kpis').insert(
          toAdd.map((slug) => ({ initiative_id: id, kpi_slug: slug, is_primary: false })),
        )
      }
      if (body.primaryKpiSlug) {
        await sb.from('initiative_kpis').update({ is_primary: false }).eq('initiative_id', id)
        await sb
          .from('initiative_kpis')
          .update({ is_primary: true })
          .eq('initiative_id', id)
          .eq('kpi_slug', body.primaryKpiSlug)
      }
    }

    const deps = await loadLookups(sb, orgId)
    const { data: updated } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, updated ? [updated] : [], deps)
    return Response.json({ initiative })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
