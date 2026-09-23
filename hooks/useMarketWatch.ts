'use client'
import { useQuery } from '@tanstack/react-query'
import { getMarketWatch } from '@/lib/api/market-watch'

export function useMarketWatch() {
  return useQuery({
    queryKey: ['market-watch'],
    queryFn: getMarketWatch,
  })
}
