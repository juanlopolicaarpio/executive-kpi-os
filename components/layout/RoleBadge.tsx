import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'
import type { UserRole } from '@/types/user'

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge className={`text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}
