import { getClient, getOrgId, loadLookups } from '@/lib/initiatives/mapping'
import { resolveActor } from '@/lib/permissions/actor'
import { can } from '@/lib/permissions/capabilities'
import { scopeFilter } from '@/lib/permissions/scope'
import { STATUS_LABELS as INITIATIVE_STATUS } from '@/lib/initiatives/lifecycle'
import { SLUG_TO_APP_ID } from '@/lib/kpi-map'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/search?q= — PRD §4.2 global search across KPI names, initiative
// names and owners.
//
// "Results respect permissions": the capability check happens HERE, server
// side. Search is the classic way scope leaks — a user who cannot open a
// record must not be able to confirm it exists by typing its name.

export interface SearchHit {
  kind: 'kpi' | 'initiative' | 'person'
  id: string
  title: string
  subtitle: string
  link: string
}

const LIMIT = 8

export async function GET(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ hits: [] })

  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (q.length < 2) return Response.json({ hits: [] })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ hits: [] })

    const actor = await resolveActor(sb, orgId, req)

    const deps = await loadLookups(sb, orgId)
    const hits: SearchHit[] = []

    // ----- KPIs -----
    if (!actor || can(actor.role, 'kpi:view')) {
      // `kpi:view` only says this role may see KPIs at all; without a scope
      // filter too, search becomes the bypass — a contributor could confirm the
      // existence of, and read the owner of, every KPI in the company by typing
      // its name.
      //
      // Asks for 'organization' rather than the role's default scope, because
      // search means "find anything I am allowed to open", not "search my
      // current view". The clamp turns that into the widest scope the role
      // actually holds: the whole org for a manager, own KPIs for a contributor.
      const { visible } = scopeFilter(actor, 'organization')

      const [{ data: defs }, { data: aks }] = await Promise.all([
        sb.from('kpi_definitions').select('id,slug,name,category'),
        sb.from('active_kpis').select('*').eq('org_id', orgId),
      ])
      const activeByDef = new Map(
        (aks ?? []).filter((a) => !a.is_archived).map((a) => [a.kpi_def_id, a]),
      )
      for (const d of defs ?? []) {
        const active = activeByDef.get(d.id)
        if (!active) continue
        if (!visible(active.owner_id)) continue
        const owner = deps.names[String(active.owner_id ?? '')] ?? 'Unassigned'
        const name = String(d.name)
        if (!name.toLowerCase().includes(q) && !owner.toLowerCase().includes(q)) continue
        const appId = SLUG_TO_APP_ID[String(d.slug)]
        hits.push({
          kind: 'kpi',
          id: String(d.slug),
          title: name,
          subtitle: `KPI · ${owner}`,
          link: appId ? `/kpis/${appId}` : '/kpis',
        })
        if (hits.length >= LIMIT * 3) break
      }
    }

    // ----- Initiatives -----
    if (!actor || can(actor.role, 'initiative:view')) {
      try {
        // No `department` here — the column was dropped when KPIs became
        // person-owned. Selecting it made the query error, and the catch below
        // turned that into "no initiatives match", so initiative search had
        // silently returned nothing at all.
        const { data: rows } = await sb
          .from('initiatives')
          .select('id,name,status,owner_id')
          .eq('org_id', orgId)
          .limit(200)

        for (const r of rows ?? []) {
          const owner = deps.names[String(r.owner_id ?? '')] ?? 'Unassigned'
          const name = String(r.name)
          if (!name.toLowerCase().includes(q) && !owner.toLowerCase().includes(q)) continue
          const status = String(r.status).replace(/_/g, '-') as keyof typeof INITIATIVE_STATUS
          hits.push({
            kind: 'initiative',
            id: String(r.id),
            title: name,
            subtitle: `Initiative · ${INITIATIVE_STATUS[status] ?? r.status} · ${owner}`,
            link: `/initiatives/${r.id}`,
          })
        }
      } catch {
        /* pre-migration: search simply returns no initiatives */
      }
    }

    // ----- People (owners) -----
    for (const m of deps.members) {
      if (!m.name.toLowerCase().includes(q)) continue
      hits.push({
        kind: 'person',
        id: m.id,
        title: m.name,
        subtitle: 'Person',
        link: `/initiatives?owner=${m.id}`,
      })
    }

    // Exact-prefix matches first — typing "net" should surface "Net Sales"
    // above something that merely contains the letters.
    hits.sort((a, b) => {
      const ap = a.title.toLowerCase().startsWith(q) ? 0 : 1
      const bp = b.title.toLowerCase().startsWith(q) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.title.length - b.title.length
    })

    return Response.json({ hits: hits.slice(0, LIMIT) })
  } catch {
    return Response.json({ hits: [] })
  }
}
