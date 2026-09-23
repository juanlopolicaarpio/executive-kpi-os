'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Sun,
  Target,
  Users,
  Rocket,
  MessageSquare,
  FolderUp,
  Sparkles,
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { RoleBadge } from './RoleBadge'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/store/uiStore'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

// Four screens. That's it. Home = the daily command center; KPIs = what we
// measure; Initiatives = everything we're doing about it (recovery plans
// included, as a type); AI Coach = the intelligence over all of it. Uploads is
// tucked at the bottom, out of the daily path.
const NAV_ITEMS: NavItem[] = [
  { href: '/today', label: 'Home', icon: Sun },
  { href: '/kpis', label: 'KPIs', icon: Target },
  { href: '/people', label: 'People', icon: Users },
  { href: '/initiatives', label: 'Initiatives', icon: Rocket },
  { href: '/chief-of-staff', label: 'AI Coach', icon: MessageSquare },
]
const UTILITY_ITEMS: NavItem[] = [
  { href: '/uploads', label: 'Uploads', icon: FolderUp },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, role } = useSession()
  const { isSidebarOpen, setSidebarOpen } = useUiStore()
  const [collapsed, setCollapsed] = useState(false)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname, setSidebarOpen])

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex flex-col bg-white text-slate-900 border-r border-border shrink-0',
          // Mobile: fixed overlay drawer
          'fixed inset-y-0 left-0 z-50 w-72',
          'transition-transform duration-200',
          // Desktop: static in flex layout, can collapse
          'lg:relative lg:inset-auto lg:z-auto',
          'lg:transition-all lg:duration-200',
          collapsed ? 'lg:w-16' : 'lg:w-60',
          // Mobile: show/hide via transform
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center border-b border-border h-16 px-4', collapsed ? 'lg:justify-center' : 'gap-3')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight truncate text-slate-950 font-heading">KPI OS</p>
              <p className="text-xs text-muted-foreground truncate">Northstar Demo</p>
            </div>
          )}
          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7 shrink-0 hidden lg:flex', collapsed && 'hidden')}
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapse toggle when collapsed (desktop only) */}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto mt-2 h-7 w-7 hidden lg:flex"
            onClick={() => setCollapsed(false)}
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}

        {/* Navigation — four screens, flat */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
          <div className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                    collapsed && 'lg:justify-center lg:px-2',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-emerald-700')} />
                  <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                </Link>
              )
            })}
          </div>

          <div className="mt-auto space-y-1 border-t border-border pt-2">
            {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700',
                    collapsed && 'lg:justify-center lg:px-2',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User info */}
        <div className={cn('border-t border-border p-3', collapsed && 'lg:flex lg:flex-col lg:items-center lg:gap-2')}>
          <div className={cn('flex items-center gap-3 mb-2 min-w-0', collapsed && 'lg:hidden')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <RoleBadge role={role} />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
