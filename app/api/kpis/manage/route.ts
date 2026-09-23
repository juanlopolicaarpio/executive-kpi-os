import { getClient, getOrgId } from '@/lib/initiatives/mapping'
import { requireActor, requireCapability, permissionResponse } from '@/lib/permissions/actor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST  /api/kpis/manage — create a KPI (definition + activation in one call).
// PATCH /api/kpis/manage — edit an existing one.
//
// PRD §6.3. Creating a KPI touches two tables: `kpi_definitions` is the shared
// catalog (what the metric MEANS) and `active_kpis` is this org's activation of
// it (target, owner, thresholds, weight). Splitting them across two API calls
// would let a definition exist with no activation, so both happen here.
//
// §11.5: KPIs with measurements or linked initiatives can never be deleted,
// only archived. There is deliberately no DELETE handler.

interface KpiBody {
  slug?: string
  name: string
  definition: string
  ownerId: string
  category: string
  unit: 'number' | 'currency' | 'percentage' | 'ratio' | 'duration'
  direction: 'above' | 'below' | 'range'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'
  aggregation: 'sum' | 'average' | 'last' | 'min' | 'max'
  targetValue?: number | null
  targetLower?: number | null
  targetUpper?: number | null
  thresholds?: { onTrack: number; atRisk: number } | null
  weight: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  formulaDescription?: string
}

function validate(body: Partial<KpiBody>): string | null {
  if (!body.name || body.name.trim().length < 3 || body.name.trim().length > 100) {
    return 'Name must be between 3 and 100 characters'
  }
  if (!body.definition?.trim()) return 'A plain-language definition is required'
  if (!body.ownerId) return 'An owner is required'
  if (body.weight != null && (body.weight < 1 || body.weight > 5)) {
    return 'Weight must be between 1 and 5'
  }
  if (body.direction === 'range') {
    if (body.targetLower == null || body.targetUpper == null) {
      return 'A target range needs both a lower and an upper bound'
    }
    if (body.targetUpper < body.targetLower) return 'Upper bound must be at or above the lower bound'
  } else if (body.targetValue == null) {
    return 'A target value is required'
  } else if (body.targetValue === 0) {
    // PRD §11.1: a zero target breaks ratio maths; the spec requires range
    // logic instead rather than a special case that silently misreports.
    return 'A target of zero needs a target range instead — ratio scoring cannot divide by zero'
  }
  return null
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)

export async function POST(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: KpiBody
  try {
    body = (await req.json()) as KpiBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const invalid = validate(body)
  if (invalid) return Response.json({ error: invalid }, { status: 400 })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'kpi:create')

    const slug = body.slug?.trim() || slugify(body.name)

    // Uniqueness is per-organization in the PRD, but slugs are global in this
    // schema — so surface the clash plainly instead of silently reusing a
    // definition that means something different elsewhere.
    const { data: existingDef } = await sb
      .from('kpi_definitions')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    let defId = existingDef?.id as string | undefined

    if (defId) {
      const { data: alreadyActive } = await sb
        .from('active_kpis')
        .select('id')
        .eq('org_id', orgId)
        .eq('kpi_def_id', defId)
        .maybeSingle()
      if (alreadyActive) {
        return Response.json(
          { error: 'A KPI with this name is already active in your organization' },
          { status: 409 },
        )
      }
    } else {
      const { data: created, error } = await sb
        .from('kpi_definitions')
        .insert({
          slug,
          name: body.name.trim(),
          category: body.category,
          description: body.definition.trim(),
          formula_description: body.formulaDescription ?? null,
          required_sources: [],
          default_rhythm: body.frequency,
          default_direction: body.direction,
          unit: body.unit,
        })
        .select('id')
        .single()
      if (error || !created) {
        return Response.json({ error: error?.message ?? 'Could not create KPI' }, { status: 500 })
      }
      defId = created.id as string
    }

    const { data: active, error: activeErr } = await sb
      .from('active_kpis')
      .insert({
        org_id: orgId,
        kpi_def_id: defId,
        owner_id: body.ownerId,
        target_value: body.direction === 'range' ? (body.targetLower ?? 0) : body.targetValue,
        target_direction: body.direction,
        target_lower: body.targetLower ?? null,
        target_upper: body.targetUpper ?? null,
        rhythm: body.frequency,
        thresholds: body.thresholds ?? null,
        weight: body.weight ?? 3,
        priority: body.priority ?? 'medium',
        aggregation: body.aggregation ?? 'last',
        is_active: true,
      })
      .select('id')
      .single()

    if (activeErr) return Response.json({ error: activeErr.message }, { status: 500 })

    return Response.json({ id: active?.id, slug }, { status: 201 })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

interface PatchBody extends Partial<KpiBody> {
  activeKpiId: string
  isArchived?: boolean
}

export async function PATCH(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.activeKpiId) return Response.json({ error: 'activeKpiId is required' }, { status: 400 })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'kpi:edit')

    const { data: existing } = await sb
      .from('active_kpis')
      .select('id,kpi_def_id,target_value,target_direction')
      .eq('id', body.activeKpiId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!existing) return Response.json({ error: 'KPI not found' }, { status: 404 })

    // Only validate what is actually being changed.
    if (body.targetValue === 0 && body.direction !== 'range') {
      return Response.json(
        { error: 'A target of zero needs a target range instead' },
        { status: 400 },
      )
    }

    const patch: Record<string, unknown> = {}
    if (body.ownerId !== undefined) patch['owner_id'] = body.ownerId
    if (body.targetValue !== undefined) patch['target_value'] = body.targetValue
    if (body.targetLower !== undefined) patch['target_lower'] = body.targetLower
    if (body.targetUpper !== undefined) patch['target_upper'] = body.targetUpper
    if (body.direction !== undefined) patch['target_direction'] = body.direction
    if (body.frequency !== undefined) patch['rhythm'] = body.frequency
    if (body.thresholds !== undefined) patch['thresholds'] = body.thresholds
    if (body.weight !== undefined) patch['weight'] = body.weight
    if (body.priority !== undefined) patch['priority'] = body.priority
    if (body.aggregation !== undefined) patch['aggregation'] = body.aggregation
    // §11.5: archive, never delete.
    if (body.isArchived !== undefined) patch['is_archived'] = body.isArchived

    if (Object.keys(patch).length > 0) {
      const { error } = await sb.from('active_kpis').update(patch).eq('id', body.activeKpiId)
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    // Narrative fields live on the shared definition.
    const defPatch: Record<string, unknown> = {}
    if (body.name !== undefined) defPatch['name'] = body.name.trim()
    if (body.definition !== undefined) defPatch['description'] = body.definition.trim()
    if (body.formulaDescription !== undefined)
      defPatch['formula_description'] = body.formulaDescription
    if (body.category !== undefined) defPatch['category'] = body.category
    if (body.unit !== undefined) defPatch['unit'] = body.unit
    if (Object.keys(defPatch).length > 0) {
      await sb.from('kpi_definitions').update(defPatch).eq('id', existing.kpi_def_id)
    }

    return Response.json({ ok: true })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
