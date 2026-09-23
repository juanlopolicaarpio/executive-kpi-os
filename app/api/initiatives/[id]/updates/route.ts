import {
  getClient,
  getOrgId,
  loadLookups,
  assembleInitiatives,
  toInitiativeUpdate,
} from '@/lib/initiatives/mapping'
import { viewerMayPerform } from '@/lib/initiatives/lifecycle'
import {
  requireActor,
  requireCapability,
  permissionResponse,
  PermissionError,
} from '@/lib/permissions/actor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET  /api/initiatives/[id]/updates — the progress history.
// POST /api/initiatives/[id]/updates — record a progress update (PRD §7.4).
//
// Progress is MANUAL. It is deliberately never inferred from KPI movement —
// a KPI moving does not mean the work happened, and conflating the two would
// corrupt both the execution signal and the learning record.

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ updates: [] })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ updates: [] })

    const deps = await loadLookups(sb, orgId)
    const { data } = await sb
      .from('initiative_updates')
      .select('*')
      .eq('initiative_id', id)
      .order('created_at', { ascending: false })

    return Response.json({ updates: (data ?? []).map((r) => toInitiativeUpdate(r, deps.names)) })
  } catch {
    return Response.json({ updates: [] })
  }
}

interface UpdateBody {
  progressPercent: number
  note: string
  isBlocked?: boolean
  blockerNote?: string
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const sb = getClient()
  if (!sb) return Response.json({ error: 'Backend unavailable' }, { status: 503 })

  let body: UpdateBody
  try {
    body = (await req.json()) as UpdateBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const progress = Number(body.progressPercent)
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return Response.json({ error: 'Progress must be between 0 and 100' }, { status: 400 })
  }
  if (!body.note?.trim()) {
    return Response.json({ error: 'An update note is required' }, { status: 400 })
  }
  if (body.isBlocked && !body.blockerNote?.trim()) {
    return Response.json({ error: 'Describe the blocker when flagging one' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ error: 'Organization not found' }, { status: 404 })

    const actor = await requireActor(sb, orgId, req)
    requireCapability(actor, 'initiative:update')

    const deps = await loadLookups(sb, orgId)
    const { data: row } = await sb
      .from('initiatives')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!row) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    const [current] = await assembleInitiatives(sb, [row], deps)
    if (!current) return Response.json({ error: 'Initiative not found' }, { status: 404 })

    if (current.status !== 'active') {
      return Response.json(
        { error: `Progress can only be updated on an active initiative (this one is ${current.status}).` },
        { status: 409 },
      )
    }
    // The owner, or a manager acting on the owner's behalf.
    const isOwner = current.ownerId === actor.memberId
    if (!isOwner && !viewerMayPerform(current, 'reopen', { memberId: actor.memberId, role: actor.role })) {
      throw new PermissionError('Only the owner or a manager may update this initiative.')
    }

    // The trigger in 008 mirrors progress_percent and latest_update_at onto the
    // parent initiative, so list views need no join.
    const { error } = await sb.from('initiative_updates').insert({
      initiative_id: id,
      author_id: actor.memberId,
      progress_percent: progress,
      note: body.note.trim(),
      is_blocked: Boolean(body.isBlocked),
      blocker_note: body.blockerNote?.trim() ?? null,
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const { data: updated } = await sb.from('initiatives').select('*').eq('id', id).single()
    const [initiative] = await assembleInitiatives(sb, updated ? [updated] : [], deps)
    return Response.json({ initiative }, { status: 201 })
  } catch (e) {
    const denied = permissionResponse(e)
    if (denied) return denied
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
