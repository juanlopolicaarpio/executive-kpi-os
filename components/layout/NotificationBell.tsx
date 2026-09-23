'use client'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, AlertOctagon, Clock, FileCheck2, CheckCheck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sessionFetch } from '@/lib/api/session-fetch'
import { formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '@/app/api/notifications/route'

// PRD §10.1. The badge counts REAL outstanding items — never a placeholder.

const ICONS: Record<string, React.ElementType> = {
  initiative_submitted: FileCheck2,
  results_submitted: FileCheck2,
  results_due: Clock,
  initiative_overdue: AlertOctagon,
  kpi_off_track: AlertOctagon,
  data_stale: Clock,
}

export function NotificationBell() {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await sessionFetch('/api/notifications')
      return (await res.json()) as { notifications: NotificationItem[]; unreadCount: number }
    },
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: async () => {
      await sessionFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = data?.notifications ?? []
  const unread = data?.unreadCount ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications, none unread'}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {items.some((i) => !i.read) && (
            <button
              onClick={() => markRead.mutate()}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">Nothing needs you right now.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const Icon = ICONS[n.eventType] ?? Bell
              return (
                <li key={n.id} className="border-b border-border last:border-0">
                  <Link
                    href={n.link}
                    className={cn(
                      'flex gap-2.5 px-3 py-2.5 hover:bg-slate-50',
                      !n.read && 'bg-blue-50/40',
                    )}
                  >
                    <Icon
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 shrink-0',
                        n.isCritical ? 'text-red-500' : 'text-slate-400',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {n.title}
                      </span>
                      <span className="block text-xs leading-snug text-slate-600">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {formatDay(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
