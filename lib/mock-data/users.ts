import type { User } from '@/types/user'
import { getNorthstarKpis, northstarPeople } from '@/lib/northstar/demo-data'

const allKpiIds = getNorthstarKpis().map((kpi) => kpi.appId)

export const mockUsers: User[] = northstarPeople.map((person) => ({
  id: person.userId,
  authId: `auth-${person.userId}`,
  name: person.name,
  email: person.email,
  role: person.role,
  telegramLinked: false,
  ownedKpiIds: person.role === 'ceo' ? allKpiIds : person.ownedKpiIds,
  createdAt: '2026-06-01T00:00:00Z',
  lastLoginAt: '2026-08-23T09:00:00Z',
  mfaEnabled: false,
}))
