'use client'
import { useEffect, useMemo } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMe } from '@/hooks/useInitiatives'
import { useScopeStore, SCOPE_LABELS, defaultScopeFor, type ScopeType } from '@/store/scopeStore'
import { cn } from '@/lib/utils'

/**
 * PRD §4.2 scope selector.
 *
 * The options come from the SERVER-resolved role, not from anything the client
 * asserts — a contributor cannot widen their view to the organization by
 * poking at local state, because the API applies the same scope rules.
 */
export function ScopeSelector({ className }: { className?: string }) {
  const { data: me } = useMe()
  const scope = useScopeStore((s) => s.scope)
  const setScope = useScopeStore((s) => s.setScope)
  const reconcile = useScopeStore((s) => s.reconcile)

  const role = me?.role ?? 'viewer'
  // Only scopes the server says can resolve — see /api/me. Memoised so the
  // effect below does not re-run on every render.
  const allowed = useMemo<ScopeType[]>(
    () => me?.availableScopes ?? ['organization'],
    [me?.availableScopes],
  )
  const memberId = me?.memberId ?? null
  const defaultScope = me?.defaultScope ?? defaultScopeFor(role)

  // Keep the STORE right, not just what this component renders: Home and the
  // KPI registry read the store directly, so a stale scope would keep them
  // fetching the wrong data while the selector displayed something else.
  useEffect(() => {
    if (!memberId) return
    reconcile({ memberId, defaultScope, allowed })
  }, [memberId, defaultScope, allowed, reconcile])

  // A single option is a label, not a choice.
  if (allowed.length <= 1) {
    return (
      <span
        className={cn('flex items-center gap-1.5 text-sm text-slate-600', className)}
        title="Your role has a fixed scope"
      >
        <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        {SCOPE_LABELS[allowed[0] ?? 'organization']}
      </span>
    )
  }

  const current = allowed.includes(scope) ? scope : (allowed[0] as ScopeType)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Scope: ${SCOPE_LABELS[current]}`}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground md:px-3',
          className,
        )}
      >
        <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        <span>{SCOPE_LABELS[current]}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {allowed.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => setScope(option)}
            className={cn(option === current && 'font-medium text-slate-900')}
          >
            {SCOPE_LABELS[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
