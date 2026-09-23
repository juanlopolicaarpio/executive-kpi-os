'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, Target, Rocket, User2, Loader2 } from 'lucide-react'
import { sessionFetch } from '@/lib/api/session-fetch'
import { cn } from '@/lib/utils'
import type { SearchHit } from '@/app/api/search/route'

// PRD §4.2 global search. Permission filtering happens server-side; this is
// purely presentation.

const ICONS: Record<SearchHit['kind'], React.ElementType> = {
  kpi: Target,
  initiative: Rocket,
  person: User2,
}

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      const res = await sessionFetch(`/api/search?q=${encodeURIComponent(q)}`)
      return (await res.json()) as { hits: SearchHit[] }
    },
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  })

  const hits = data?.hits ?? []

  // Reset the highlighted row when the query changes. Derived during render
  // rather than in an effect, which would cause a cascading re-render.
  const [lastQ, setLastQ] = useState(q)
  if (q !== lastQ) {
    setLastQ(q)
    setActive(0)
  }

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Ctrl/Cmd-K to focus, as the PRD's search affordance implies.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = (hit: SearchHit) => {
    router.push(hit.link)
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!hits.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[active]
      if (hit) go(hit)
    }
  }

  const showPanel = open && q.trim().length >= 2

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <label htmlFor="global-search" className="sr-only">
        Search KPIs, initiatives and people
      </label>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        id="global-search"
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search…"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-ring"
      />

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-9 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {isFetching && hits.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">No matches you have access to.</p>
          ) : (
            <ul>
              {hits.map((hit, i) => {
                const Icon = ICONS[hit.kind]
                return (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(hit)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left',
                        i === active ? 'bg-slate-100' : 'hover:bg-slate-50',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-900">{hit.title}</span>
                        <span className="block truncate text-xs text-slate-500">{hit.subtitle}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
