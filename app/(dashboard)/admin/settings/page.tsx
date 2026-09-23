import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bot, Database, Clock } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Platform configuration and integrations"
      />

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Telegram Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Bot Status</span>
              <Badge className="bg-amber-100 text-amber-800">
                Phase 2 — Not Deployed
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Webhook URL</span>
              <span className="text-xs font-mono text-muted-foreground">
                demo.northstar.example/api/telegram
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Linked Accounts</span>
              <span className="text-sm font-medium">0 / 6</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mock Mode</span>
              <Badge className="bg-violet-100 text-violet-800">
                Enabled (NEXT_PUBLIC_USE_MOCK=true)
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Upload File Retention</span>
              <span className="text-sm font-medium">90 days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Audit &amp; Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Audit Log Retention</span>
              <span className="text-sm font-medium">2 years</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Audit Log Mode</span>
              <span className="text-sm font-medium">
                Append-only (no delete)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
