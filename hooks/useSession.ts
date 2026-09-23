'use client'
import { useUiStore } from '@/store/uiStore'
import { mockUsers } from '@/lib/mock-data/users'

export function useSession() {
  const { currentUserId, currentUserRole } = useUiStore()
  const user = mockUsers.find(u => u.id === currentUserId) ?? mockUsers[0]!
  return { user, role: currentUserRole }
}
