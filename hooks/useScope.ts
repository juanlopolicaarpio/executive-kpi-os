'use client'
import { useMe } from '@/hooks/useInitiatives'
import { useScopeStore, defaultScopeFor, type ScopeType } from '@/store/scopeStore'

/**
 * The scope to actually request, for whoever is acting right now.
 *
 * The store's value belongs to a specific member. Immediately after switching
 * person it still holds the PREVIOUS person's choice, and the selector's effect
 * has not corrected it yet — so reading the store directly meant one fetch at
 * the wrong scope, and a visible flash of the wrong KPI count. Falling back to
 * the new person's default until the store catches up removes that.
 */
export function useActiveScope(): ScopeType {
  const { data: me } = useMe()
  const scope = useScopeStore((s) => s.scope)
  const ownerId = useScopeStore((s) => s.ownerId)

  if (!me) return scope
  if (ownerId !== me.memberId) return me.defaultScope ?? defaultScopeFor(me.role)
  return scope
}
