import { getNorthstarKpis, northstarPeople } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const kpis = getNorthstarKpis()
  return Response.json({
    enabled: true,
    people: northstarPeople.map((person) => ({
      memberId: person.memberId,
      name: person.name,
      dbRole: person.dbRole,
      role: person.role,
      roleLabel: person.roleLabel,
      ownedKpiCount: person.role === 'ceo' ? kpis.length : kpis.filter((kpi) => kpi.ownerId === person.memberId).length,
      defaultScope: person.role === 'ceo' || person.role === 'econs-manager' ? 'organization' : 'individual',
    })),
  })
}
