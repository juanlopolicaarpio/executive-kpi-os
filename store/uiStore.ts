'use client'
import { create } from 'zustand'
import type { UserRole } from '@/types/user'
import { mockUsers } from '@/lib/mock-data/users'

interface UiState {
  isChatOpen: boolean
  setChatOpen: (open: boolean) => void
  toggleChat: () => void

  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Demo session state (only honoured when DEMO_PERSONAS is on server-side)
  currentUserId: string
  currentUserRole: UserRole
  setCurrentUser: (userId: string, role: UserRole) => void

  /**
   * The `members.id` to act as while testing, sent as x-kpai-member.
   *
   * Picking a PERSON rather than a role is what makes the switcher honest:
   * several roles map to the same PRD role, so a role-only header resolved
   * two different personas to whichever member the query returned first.
   * null means "fall back to the role header".
   */
  personaMemberId: string | null
  setPersonaMember: (memberId: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  isChatOpen: false,
  setChatOpen: (open) => set({ isChatOpen: open }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  currentUserId: 'user-ceo',
  currentUserRole: 'ceo',
  setCurrentUser: (userId, role) => set({ currentUserId: userId, currentUserRole: role }),

  personaMemberId: null,
  setPersonaMember: (memberId) => set({ personaMemberId: memberId }),
}))

export function getDemoUser(userId: string) {
  return mockUsers.find(u => u.id === userId) ?? mockUsers[0]
}
