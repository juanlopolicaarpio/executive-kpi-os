import { getClient, getOrgId } from '@/lib/initiatives/mapping'
import { resolveActor } from '@/lib/permissions/actor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/ai/feedback — PRD §9.1 and §9.5.
//
// Two things get recorded: whether the output was useful, and what the user
// DID with it (viewed / accepted / modified / dismissed). The second is the
// one that matters for §13.4's "AI usefulness" metric — a thumbs-up is an
// opinion, accepting a recommendation into a Draft is a behaviour.

interface FeedbackBody {
  /** A query_log row or an ai_recommendations row. */
  target: 'query' | 'recommendation'
  id?: string
  feedback?: 'helpful' | 'not_helpful'
  reason?: string
  action?: 'viewed' | 'accepted' | 'modified' | 'dismissed'
}

export async function POST(req: Request): Promise<Response> {
  const sb = getClient()
  if (!sb) return Response.json({ ok: false }, { status: 503 })

  let body: FeedbackBody
  try {
    body = (await req.json()) as FeedbackBody
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.feedback && !body.action) {
    return Response.json({ error: 'Provide feedback or an action' }, { status: 400 })
  }

  try {
    const orgId = await getOrgId(sb)
    if (!orgId) return Response.json({ ok: false }, { status: 404 })

    // Identify the actor so feedback is attributable, but do not require a
    // capability — anyone who can see an answer may say it was wrong.
    const actor = await resolveActor(sb, orgId, req)

    if (body.target === 'recommendation') {
      const patch: Record<string, unknown> = { acted_at: new Date().toISOString() }
      if (body.feedback) patch['user_feedback'] = body.feedback
      if (body.action) patch['user_action'] = body.action

      const q = body.id
        ? sb.from('ai_recommendations').update(patch).eq('id', body.id).eq('org_id', orgId)
        : null
      if (!q) return Response.json({ error: 'Recommendation id required' }, { status: 400 })
      const { error } = await q
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ ok: true })
    }

    // Query feedback. Without an explicit id, attach to this user's most recent
    // logged answer — which is what a thumbs-down on the last message means.
    const patch: Record<string, unknown> = {}
    if (body.feedback) patch['feedback'] = body.feedback
    if (body.reason) patch['feedback_reason'] = body.reason
    if (body.action) patch['user_action'] = body.action

    let targetId = body.id
    if (!targetId) {
      const { data } = await sb
        .from('query_log')
        .select('id')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetId = data?.id ? String(data.id) : undefined
    }
    if (!targetId) return Response.json({ error: 'Nothing to attach feedback to' }, { status: 404 })

    if (actor) patch['asked_by'] = actor.memberId
    const { error } = await sb.from('query_log').update(patch).eq('id', targetId)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 })
  }
}
