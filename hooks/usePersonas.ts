'use client'
import { useQuery } from '@tanstack/react-query'
import { useUiStore } from '@/store/uiStore'
import { sessionFetch } from '@/lib/api/session-fetch'

export interface DemoPersona {
  memberId: string
  name: string
  dbRole: string
  role: string
  roleLabel: string
  ownedKpiCount: number
  defaultScope: 'organization' | 'individual'
}

/**
 * The real people available in the no-login people switcher.
 */
export function useDemoPersonas() {
  return useQuery({
    queryKey: ['demo-personas'],
    queryFn: async () => {
      const res = await sessionFetch('/api/dev/personas')
      return (await res.json()) as { enabled: boolean; people: DemoPersona[] }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * A cache key identifying who the client currently claims to be.
 *
 * Every query whose RESULT depends on the viewer must include this, or
 * switching person replays the previous person's cached data — which looks
 * exactly like scoping being broken.
 */
export function usePersonaKey(): string {
  const role = useUiStore((s) => s.currentUserRole)
  const memberId = useUiStore((s) => s.personaMemberId)
  return `${role}:${memberId ?? ''}`
}
