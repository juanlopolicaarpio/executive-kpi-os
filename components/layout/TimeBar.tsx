'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays } from 'lucide-react'
import { usePeriodStore } from '@/store/periodStore'
import { formatMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The global Time Bar. One control, present on every data screen, that scopes
 * the whole dashboard: an "as-of" month (step / pick) and a history window.
 */
export function TimeBar() {
  const { months, asOf, ready, setMonths, setAsOf, step } = usePeriodStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => (await fetch('/api/periods')).json() as Promise<{ months: string[] }>,
  })

  useEffect(() => {
    if (data?.months?.length) setMonths(data.months)
  }, [data, setMonths])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!ready) {
    return <div className="h-12 border-b border-slate-200 bg-white" />
  }

  const i = months.indexOf(asOf)
  const canPrev = i > 0
  const canNext = i < months.length - 1

  // group available months by year for the picker grid
  const byYear: Record<string, string[]> = {}
  for (const m of months) (byYear[m.slice(0, 4)] ??= []).push(m)

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
      {/* stepper + picker */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => step(-1)}
          disabled={!canPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {formatMonth(`${asOf}-01`)}
            <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', pickerOpen && 'rotate-180')} />
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              {Object.entries(byYear)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([year, ms]) => (
                  <div key={year} className="mb-2 last:mb-0">
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{year}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {ms.map((m) => {
                        const label = new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
                        return (
                          <button
                            key={m}
                            onClick={() => { setAsOf(m); setPickerOpen(false) }}
                            className={cn(
                              'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                              m === asOf ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <button
          onClick={() => step(1)}
          disabled={!canNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
