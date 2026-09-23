import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ChatFloatingButton } from '@/components/layout/ChatFloatingButton'
import { SessionExpiry } from '@/components/layout/SessionExpiry'
import { DashboardChrome } from '@/components/layout/DashboardChrome'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <DashboardChrome>{children}</DashboardChrome>
      </div>
      <ChatPanel />
      <ChatFloatingButton />
      <SessionExpiry />
    </div>
  )
}
