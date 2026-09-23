import { getNorthstarKpis, getNorthstarPerson } from '@/lib/northstar/demo-data'
import { MEMBER_HEADER } from '@/lib/permissions/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const person = getNorthstarPerson(req.headers.get(MEMBER_HEADER))
  const kpis = getNorthstarKpis()
  const ownedKpiCount = person.role === 'ceo' ? kpis.length : kpis.filter((kpi) => kpi.ownerId === person.memberId).length
  const availableScopes = person.role === 'ceo' || person.role === 'econs-manager'
    ? ['organization', 'individual']
    : ['individual']

  return Response.json({
    demoPersonas: true,
    actor: {
      defaultScope: availableScopes[0],
      via: 'persona',
      memberId: person.memberId,
      name: person.name,
      role: person.role === 'ceo' || person.role === 'econs-manager' ? 'executive' : 'contributor',
      roleLabel: person.roleLabel,
      dbRole: person.dbRole,
      orgId: 'northstar-demo',
      availableScopes,
      ownedKpiCount,
    },
  })
}
