'use client'
import { usePathname } from 'next/navigation'
import { TimeBar } from './TimeBar'

// The Time Bar scopes historical data screens (KPIs, market share). The Today
// screen is inherently "now", the chat owns its height, uploads has no time
// dimension — those skip it.
const NO_TIMEBAR = ['/today', '/chief-of-staff', '/chat', '/recovery-center', '/admin', '/uploads']

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showTimeBar = !NO_TIMEBAR.some((p) => pathname.startsWith(p))
  return (
    <>
      {showTimeBar && <TimeBar />}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </>
  )
}
