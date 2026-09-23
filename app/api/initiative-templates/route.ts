import { getClient, getOrgId, typeFromDb } from '@/lib/initiatives/mapping'
import type { InitiativeTemplate } from '@/types/initiative'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/initiative-templates — PRD §7.4 template gallery.
//
// Returns system templates (org_id null) plus this organization's own clones.
// Applying one only PREFILLS the recommendation form — it never bypasses
// Master KPI selection, validation or approval routing.

export async function GET(): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ templates: [] })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ templates: [] })

    const { data, error } = await sb
      .from('initiative_templates')
      .select('*')
      .or(`org_id.is.null,org_id.eq.${orgId}`)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) return Response.json({ templates: [] })

    const templates: InitiativeTemplate[] = (data ?? []).map((t) => ({
      id: String(t.id),
      orgId: t.org_id ? String(t.org_id) : undefined,
      name: String(t.name),
      initiativeType: typeFromDb(String(t.initiative_type)),
      objectivePrompt: t.objective_prompt ? String(t.objective_prompt) : undefined,
      mechanicsTemplate: t.mechanics_template ? String(t.mechanics_template) : undefined,
      projectKpiDefaults: (t.project_kpi_defaults ?? []) as InitiativeTemplate['projectKpiDefaults'],
      budgetCategories: (t.budget_categories ?? []) as string[],
      defaultDurationDays: t.default_duration_days ? Number(t.default_duration_days) : undefined,
      version: Number(t.version ?? 1),
      isActive: Boolean(t.is_active),
    }))

    return Response.json({ templates })
  } catch {
    return Response.json({ templates: [] })
  }
}
