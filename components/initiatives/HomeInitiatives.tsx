'use client'
import Link from 'next/link'
import { Rocket, Hourglass, FileCheck2, Archive, ArrowRight, Wallet } from 'lucide-react'
import { useInitiativeBoard, useInitiativeStats } from '@/hooks/useInitiatives'
import { InitiativeCard } from './InitiativeCard'
import { RoiBadge } from './InitiativeBadges'
import { formatPeso, formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Home's second question: "What initiatives are currently running?"
 *
 * Deliberately compact — Home is a snapshot, not the Initiatives page. It shows
 * what is in flight, what is waiting on someone, and what just closed, then
 * gets out of the way.
 */
export function HomeInitiatives() {
  const { bySection, needsYou, viewer, unavailable, isLoading } = useInitiativeBoard()
  const { data: stats } = useInitiativeStats()

  if (isLoading) return null

  // Pre-migration, or a backend with nothing in it yet — say so plainly rather
  // than rendering an empty shell.
  if (unavailable) return null

  const active = bySection['active']
  const pendingApproval = bySection['pending-approval']
  const forReview = bySection['for-review']
  const recentlyClosed = stats?.recentlyClosed ?? []

  const nothingAtAll =
    active.length === 0 && forReview.length === 0 && recentlyClosed.length === 0

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <h2 className="text-sm font-semibold text-slate-900">What we&apos;re working on</h2>
        <span className="text-xs text-slate-400">{active.length}</span>
        <Link
          href="/initiatives"
          className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          All initiatives <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {nothingAtAll ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">No initiatives running yet.</p>
          <Link
            href="/initiatives"
            className="mt-1 inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            Launch one to start improving a KPI
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Counters — the execution snapshot */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile icon={Rocket} label="Active" value={active.length} href="/initiatives" />
            <Tile
              icon={Hourglass}
              label="Pending approval"
              value={pendingApproval.length}
              href="/initiatives"
              tone={pendingApproval.length > 0 ? 'warn' : undefined}
            />
            <Tile
              icon={FileCheck2}
              label="For review"
              value={forReview.length}
              href="/initiatives"
              tone={forReview.length > 0 ? 'warn' : undefined}
            />
            <Tile icon={Archive} label="Closed" value={stats?.counts.closed ?? 0} href="/initiatives" />
          </div>

          {/* Budget in flight */}
          {stats && stats.budget.approvedInFlight > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Wallet className="h-3.5 w-3.5 text-slate-400" />
                Budget in flight
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatPeso(stats.budget.approvedInFlight)}
              </span>
              {stats.portfolioRoi != null && (
                <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                  Portfolio ROI to date
                  <RoiBadge roi={stats.portfolioRoi} />
                </span>
              )}
            </div>
          )}

          {/* Anything waiting on the viewer comes first */}
          {needsYou.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {needsYou.slice(0, 2).map((initiative) => (
                <InitiativeCard
                  key={initiative.id}
                  initiative={initiative}
                  viewer={viewer}
                  emphasize
                />
              ))}
            </div>
          )}

          {/* Otherwise, the work currently in flight */}
          {needsYou.length === 0 && active.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {active.slice(0, 2).map((initiative) => (
                <InitiativeCard key={initiative.id} initiative={initiative} viewer={viewer} />
              ))}
            </div>
          )}

          {/* Recently closed — the learning loop, made visible */}
          {recentlyClosed.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Recently closed</p>
              <ul className="space-y-1.5">
                {recentlyClosed.slice(0, 3).map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/initiatives/${i.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-700">{i.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <RoiBadge roi={i.results?.roi} />
                        <span className="text-xs text-slate-400">
                          {i.closedAt ? formatDay(i.closedAt) : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: number
  href: string
  tone?: 'warn'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border bg-white p-3 transition-colors hover:bg-slate-50',
        tone === 'warn' ? 'border-amber-200' : 'border-slate-200',
      )}
    >
      <Icon
        className={cn('h-4 w-4', tone === 'warn' ? 'text-amber-600' : 'text-slate-400')}
        aria-hidden
      />
      <p className="mt-1.5 text-xl font-semibold leading-none text-slate-950 tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-tight text-slate-500">{label}</p>
    </Link>
  )
}
