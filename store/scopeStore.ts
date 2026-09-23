'use client'
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import {
  SCOPE_LABELS,
  defaultScopeFor,
  scopesForRole,
  type ScopeType,
} from '@/lib/permissions/scope'

// PRD §4.2: the scope selector. This store holds only the user's CHOICE —
// which scopes exist, which a role may select, and which one it starts on all
// live in lib/permissions/scope.ts, because the server applies the same rules
// when it answers. Re-exported here so components keep importing one module.

export { SCOPE_LABELS, defaultScopeFor, scopesForRole }
export type { ScopeType }

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

interface ScopeState {
  scope: ScopeType
  /** False until the user has chosen explicitly, so role defaults can apply. */
  userChose: boolean
  /**
   * The member the current choice belongs to.
   *
   * A scope preference is per-person, not global. Without this the persisted
   * choice followed you across the switcher: after viewing an executive at
   * "Organization", every person you switched to stayed on Organization and
   * showed all 15 KPIs — which reads as the role switcher being broken.
   */
  ownerId: string | null
  setScope: (scope: ScopeType) => void
  /**
   * Bring the store in line with whoever is acting now. Called on every render
   * of the selector; only writes when something is actually wrong, so it
   * settles in one pass.
   */
  reconcile: (args: { memberId: string; defaultScope: ScopeType; allowed: ScopeType[] }) => void
}

export const useScopeStore = create<ScopeState>()(
  persist(
    (set, get) => ({
      scope: 'organization',
      userChose: false,
      ownerId: null,

      setScope: (scope) => set({ scope, userChose: true }),

      reconcile: ({ memberId, defaultScope, allowed }) => {
        const state = get()

        // Switched person: their default wins, and the previous person's
        // explicit choice does not carry over.
        if (state.ownerId !== memberId) {
          set({ ownerId: memberId, scope: defaultScope, userChose: false })
          return
        }

        // Same person, but the stored scope is not one they may select — e.g. a
        // choice persisted before their role changed. Correct it WITHOUT
        // marking it as their choice, so their real default still applies next
        // time.
        if (!allowed.includes(state.scope)) {
          set({ scope: allowed.includes(defaultScope) ? defaultScope : (allowed[0] ?? 'organization') })
        }
      },
    }),
    {
      name: 'kpai-scope',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? noopStorage : window.localStorage,
      ),
    },
  ),
)
