'use client'
import { useQuery } from '@tanstack/react-query'
import { usePeriodStore } from '@/store/periodStore'
import { useActiveScope } from '@/hooks/useScope'
import { usePersonaKey } from '@/hooks/usePersonas'
import { getKpis, getKpiById } from '@/lib/api/kpis'

export function useKpis() {
  const asOf = usePeriodStore((s) => s.asOf)
  const windowMonths = usePeriodStore((s) => s.windowMonths)
  const scope = useActiveScope()
  // The persona is part of the key, not just the request: switching person must
  // invalidate the cache, or the new persona reads the previous one's KPIs.
  const persona = usePersonaKey()
  return useQuery({
    queryKey: ['kpis', asOf, windowMonths, scope, persona],
    queryFn: () => getKpis({ asOf, window: windowMonths, scope }),
    placeholderData: (prev) => prev,
  })
}

export function useKpiById(id: string) {
  const asOf = usePeriodStore((s) => s.asOf)
  const windowMonths = usePeriodStore((s) => s.windowMonths)
  const persona = usePersonaKey()
  return useQuery({
    queryKey: ['kpi', id, asOf, windowMonths, persona],
    queryFn: () => getKpiById(id, { asOf, window: windowMonths }),
    enabled: !!id,
    placeholderData: (prev) => prev,
  })
}
