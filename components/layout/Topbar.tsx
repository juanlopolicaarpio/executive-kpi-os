'use client'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useMe } from '@/hooks/useInitiatives'
import { useDemoPersonas } from '@/hooks/usePersonas'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { RoleBadge } from './RoleBadge'
import { ScopeSelector } from './ScopeSelector'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROUTE_LABELS: Record<string, string> = {
  '/today': 'Home',
  '/kpis': 'KPIs',
  '/initiatives': 'Initiatives',
  '/market-share': 'Market Share',
  '/chief-of-staff': 'AI Coach',
  '/uploads': 'Uploads',
}

function getPageTitle(pathname: string): string {
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return label
    }
  }
  return 'KPI OS'
}

export function Topbar() {
  const pathname = usePathname()
  const { user, role } = useSession()
  const { data: me } = useMe()
  const { data: personas } = useDemoPersonas()
  const { setPersonaMember, toggleSidebar } = useUiStore()
  const pageTitle = getPageTitle(pathname)

  // Gated on the SERVER's answer, not a client env var. If the backend is not
  // honouring persona headers, switching would silently change nothing — which
  // reads as "the role system is broken" rather than "demo mode is off".
  const people = personas?.people ?? []
  const canSwitchPersona = personas?.enabled === true && people.length > 0

  // The server-resolved member is the truth about who is acting; the mock
  // session is only a fallback while /api/me is in flight.
  const displayName = me?.name || user.name

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-3 md:px-6 shrink-0">
      {/* Left: hamburger (mobile) + Page title */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold">{pageTitle}</h2>
        {/* Scope selector — options come from the server-resolved role */}
        <span className="hidden md:block">
          <ScopeSelector className="ml-2" />
        </span>
      </div>

      {/* Centre: global search (§4.2) */}
      <div className="mx-3 hidden max-w-sm flex-1 lg:block">
        <GlobalSearch />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* People switcher — hide label on small screens */}
        {canSwitchPersona && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2 md:px-3 h-8 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <span className="hidden sm:inline">Switch Person</span>
              <span className="sm:hidden">Person</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[72vh] w-96 overflow-y-auto">
              <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                View as — real people from the database
              </div>
              <DropdownMenuSeparator />
              {people.map((p) => (
                <DropdownMenuItem
                  key={p.memberId}
                  onClick={() => setPersonaMember(p.memberId)}
                  className="items-start gap-2 py-2 text-sm"
                >
                  <span className={cn('min-w-0 flex-1', p.memberId === me?.memberId && 'font-semibold')}>
                    <span className="block truncate">{p.name}</span>
                    <span className="block truncate text-[11px] font-normal text-muted-foreground">
                      {p.roleLabel} · {p.ownedKpiCount} KPI{p.ownedKpiCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  {p.memberId === me?.memberId && (
                    <Badge variant="secondary" className="text-[10px] font-medium">Current</Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {/* The server's answer, so a persona that does not take effect is
                  visible rather than silently ignored. */}
              <div className="px-1.5 py-1 text-xs leading-relaxed text-muted-foreground">
                {!me ? (
                  'Choose a person to view their role and KPI scope.'
                ) : me.via === 'session' ? (
                  <>
                    You are really signed in as{' '}
                    <span className="font-medium text-foreground">{me.name}</span>, so switching
                    here does nothing.
                  </>
                ) : (
                  <>
                    Acting as{' '}
                    <span className="font-medium text-foreground">{me.name}</span> · {me.roleLabel}{' '}
                    · owns {me.ownedKpiCount} KPI{me.ownedKpiCount === 1 ? '' : 's'}
                  </>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <NotificationBell />

        {/* Role badge — the SERVER's role, falling back to the mock session
            only while /api/me is still in flight. Showing the local role here
            was another way the chrome could disagree with the API. */}
        <span className="hidden md:block">
          {me ? (
            <Badge variant="secondary" className="text-[11px] font-medium">
              {me.roleLabel}
            </Badge>
          ) : (
            <RoleBadge role={role} />
          )}
        </span>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 h-8 hover:bg-accent transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">
              {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="hidden md:block text-sm font-medium">{displayName.split(' ')[0]}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-1.5 py-1 text-xs">
              <div>{displayName}</div>
              <div className="font-normal text-muted-foreground">
                {me ? me.roleLabel : user.email}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
