'use client'
import { create } from 'zustand'

// The global time context. `asOf` is the "current read" month; `windowMonths`
// is how much history charts show. Both scope every data screen through the
// live routes' ?as_of= / ?window= params.
interface PeriodState {
  months: string[] // available snapshot months, ascending
  asOf: string // 'YYYY-MM' — defaults to the latest available
  windowMonths: number // 3 | 6 | 12 | 0 (all)
  ready: boolean
  setMonths: (m: string[]) => void
  setAsOf: (p: string) => void
  setWindow: (w: number) => void
  step: (dir: -1 | 1) => void
}

export const usePeriodStore = create<PeriodState>((set, get) => ({
  months: [],
  asOf: '',
  windowMonths: 0, // 0 = all history (the window preset control was removed)
  ready: false,
  setMonths: (months) =>
    set((s) => {
      const latest = months[months.length - 1] ?? ''
      const previousLatest = s.months[s.months.length - 1] ?? ''
      const shouldSnapToLatest =
        !s.asOf ||
        !months.includes(s.asOf) ||
        s.asOf === previousLatest

      return {
        months,
        asOf: shouldSnapToLatest ? latest : s.asOf,
        ready: months.length > 0,
      }
    }),
  setAsOf: (asOf) => set({ asOf }),
  setWindow: (windowMonths) => set({ windowMonths }),
  step: (dir) => {
    const { months, asOf } = get()
    const i = months.indexOf(asOf)
    const next = months[i + dir]
    if (next) set({ asOf: next })
  },
}))
