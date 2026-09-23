import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { ROLE_LABELS } from '@/lib/permissions'
import type { UserRole } from '@/types/user'

const ROLE_PERMISSIONS_DISPLAY: Record<UserRole, string[]> = {
  'ceo': ['View all KPIs', 'Approve/reject plans', 'View admin', 'View AI insights', 'View upload history'],
  'econs-manager': ['View all KPIs', 'View admin', 'View AI insights', 'View upload history'],
  'category-lead': ['View own KPIs', 'Upload own KPIs', 'View AI insights'],
  'econs-officer': ['View own KPIs', 'Upload own KPIs', 'View AI insights'],
  'affiliate-officer': ['View own KPIs', 'Upload own KPIs'],
  'tts-ops': ['View own KPIs', 'Upload own KPIs'],
  'shopee-lazada-ops': ['View own KPIs', 'Upload own KPIs'],
  'finance': ['View own KPIs', 'Upload own KPIs', 'View AI insights'],
  'brand': ['View own KPIs'],
  'viewer': ['View own KPIs (read-only)'],
}

export default function RolesPage() {
  const roles = Object.keys(ROLE_LABELS) as UserRole[]

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Role-based access control matrix"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role}>
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-2">{ROLE_LABELS[role]}</p>
              <ul className="space-y-1">
                {ROLE_PERMISSIONS_DISPLAY[role].map((perm) => (
                  <li
                    key={perm}
                    className="text-xs text-muted-foreground flex items-center gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
