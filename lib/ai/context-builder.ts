import type { CompanyContext } from '@/types/chat'
import type { UserRole } from '@/types/user'
import { buildMockContext } from './mock-context'
import { buildRealContext } from './real-context'

export async function buildCompanyContext(
  userId: string,
  userRole: UserRole,
  question?: string,
  viewer?: { id: string; name: string; role: string },
): Promise<CompanyContext> {
  // Prefer the real backend (kpi_snapshots etc.); fall back to mock only if the
  // backend is unreachable so the chat never breaks.
  const real = await buildRealContext(userId, userRole, question, viewer)
  return real ?? buildMockContext(userId, userRole)
}
