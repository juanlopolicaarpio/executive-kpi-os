import { getClient, getOrgId, loadLookups, assembleInitiatives } from '@/lib/initiatives/mapping'
import { resolveActor } from '@/lib/permissions/actor'
import { nextActionFor, isOverdue, STATUS_LABELS } from '@/lib/initiatives/lifecycle'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET  /api/notifications — what needs this person's attention.
// PATCH /api/notifications — mark read.
//
// PRD §10.1 lists eight event types. Rather than depending on a background job
// that does not exist yet, the action-required ones are DERIVED from current
// state on read: an initiative sitting in Pending Approval *is* a pending
// notification for its approver. Derived notifications cannot go stale or fire
// twice, which also satisfies §10.1's duplicate-suppression requirement for
// free.
//
// Persisted rows (the `notifications` table from migration 009) are merged in
// for events that are genuinely moments in time rather than states — those are
// written by the actions that cause them.

export interface NotificationItem {
  id: string
  eventType:
    | 'initiative_submitted'
    | 'results_submitted'
    | 'results_due'
    | 'initiative_overdue'
    | 'kpi_off_track'
    | 'data_stale'
  title: string
  body: string
  link: string
  isCritical: boolean
  createdAt: string
  read: boolean
}

export async function GET(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ notifications: [], unreadCount: 0 })

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ notifications: [], unreadCount: 0 })

    const actor = await resolveActor(sb, orgId, req)
    if (!actor) return Response.json({ notifications: [], unreadCount: 0 })

    const items: NotificationItem[] = []
    const viewer = { memberId: actor.memberId, role: actor.role }

    // ----- Derived from initiative state -----
    try {
      const deps = await loadLookups(sb, orgId)
      const { data: rows } = await sb.from('initiatives').select('*').eq('org_id', orgId)
      const initiatives = await assembleInitiatives(sb, rows ?? [], deps)

      for (const i of initiatives) {
        const next = nextActionFor(i, viewer)
        if (next.forViewer) {
          const eventType: NotificationItem['eventType'] =
            i.status === 'pending-approval'
              ? 'initiative_submitted'
              : i.status === 'completed'
                ? 'results_due'
                : 'results_submitted'
          items.push({
            id: `derived-${eventType}-${i.id}`,
            eventType,
            title: i.name,
            body: `${STATUS_LABELS[i.status]} — ${next.label}`,
            link: `/initiatives/${i.id}`,
            // A decision the org is waiting on cannot be muted.
            isCritical: true,
            createdAt: i.updatedAt,
            read: false,
          })
        }

        // Overdue work reaches the owner and their approver.
        if (
          isOverdue(i) &&
          (i.ownerId === actor.memberId || i.approverId === actor.memberId)
        ) {
          items.push({
            id: `derived-overdue-${i.id}`,
            eventType: 'initiative_overdue',
            title: `${i.name} is overdue`,
            body: `End date ${i.endDate} has passed and it is still ${STATUS_LABELS[i.status].toLowerCase()}.`,
            link: `/initiatives/${i.id}`,
            isCritical: false,
            createdAt: i.endDate ?? i.updatedAt,
            read: false,
          })
        }
      }
    } catch {
      /* pre-migration: derived initiative notifications are simply absent */
    }

    // ----- Persisted point-in-time events -----
    try {
      const { data: stored } = await sb
        .from('notifications')
        .select('*')
        .eq('recipient_id', actor.memberId)
        .order('created_at', { ascending: false })
        .limit(50)

      for (const n of stored ?? []) {
        items.push({
          id: String(n.id),
          eventType: String(n.event_type) as NotificationItem['eventType'],
          title: String(n.title),
          body: String(n.body ?? ''),
          link: String(n.link ?? '/today'),
          isCritical: Boolean(n.is_critical),
          createdAt: String(n.created_at),
          read: Boolean(n.read_at),
        })
      }
    } catch {
      /* pre-migration: table does not exist yet */
    }

    items.sort((a, b) => {
      if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
      return +new Date(b.createdAt) - +new Date(a.createdAt)
    })

    return Response.json({
      notifications: items.slice(0, 30),
      unreadCount: items.filter((i) => !i.read).length,
    })
  } catch {
    return Response.json({ notifications: [], unreadCount: 0 })
  }
}

export async function PATCH(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ ok: false }, { status: 503 })

  let body: { ids?: string[]; all?: boolean }
  try {
    body = (await req.json()) as { ids?: string[]; all?: boolean }
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ ok: false }, { status: 404 })
    const actor = await resolveActor(sb, orgId, req)
    if (!actor) return Response.json({ ok: false }, { status: 401 })

    const now = new Date().toISOString()
    // Derived notifications have no row to mark; they clear when the underlying
    // work moves on, which is the honest behaviour.
    const persistedIds = (body.ids ?? []).filter((id) => !id.startsWith('derived-'))

    let q = sb.from('notifications').update({ read_at: now }).eq('recipient_id', actor.memberId)
    if (!body.all) {
      if (persistedIds.length === 0) return Response.json({ ok: true, updated: 0 })
      q = q.in('id', persistedIds)
    }
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 })
  }
}
