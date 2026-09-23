'use client'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface AuditEntry {
  id: string
  actorName: string
  action: string
  resourceType: string
  resourceId: string | null
  createdAt: string
}

const MOCK_AUDIT: AuditEntry[] = [
  { id: '1', actorName: 'Marco Reyes', action: 'plan_approved', resourceType: 'recovery_plan', resourceId: 'plan-old-1', createdAt: '2026-06-09T14:22:00Z' },
  { id: '2', actorName: 'Lia Torres', action: 'plan_submitted', resourceType: 'recovery_plan', resourceId: 'plan-1', createdAt: '2026-06-08T09:15:00Z' },
  { id: '3', actorName: 'Kai Lim', action: 'file_uploaded', resourceType: 'upload_record', resourceId: 'upload-3', createdAt: '2026-06-08T08:00:00Z' },
  { id: '4', actorName: 'Ana Santos', action: 'plan_submitted', resourceType: 'recovery_plan', resourceId: 'plan-2', createdAt: '2026-06-07T16:45:00Z' },
  { id: '5', actorName: 'Dana Sy', action: 'file_uploaded', resourceType: 'upload_record', resourceId: 'upload-5', createdAt: '2026-06-07T10:30:00Z' },
  { id: '6', actorName: 'Marco Reyes', action: 'login', resourceType: 'auth', resourceId: null, createdAt: '2026-06-07T08:00:00Z' },
  { id: '7', actorName: 'Ana Santos', action: 'target_updated', resourceType: 'kpi', resourceId: 'kpi-1', createdAt: '2026-06-06T15:00:00Z' },
  { id: '8', actorName: 'Marco Reyes', action: 'plan_rejected', resourceType: 'recovery_plan', resourceId: 'plan-old-2', createdAt: '2026-06-05T11:20:00Z' },
  { id: '9', actorName: 'Kai Lim', action: 'file_processed', resourceType: 'upload_record', resourceId: 'upload-1', createdAt: '2026-06-05T08:05:00Z' },
  { id: '10', actorName: 'Ben Cruz', action: 'login', resourceType: 'auth', resourceId: null, createdAt: '2026-06-04T09:00:00Z' },
  { id: '11', actorName: 'Lia Torres', action: 'chat_session_started', resourceType: 'chat', resourceId: null, createdAt: '2026-06-04T14:30:00Z' },
  { id: '12', actorName: 'Dana Sy', action: 'file_uploaded', resourceType: 'upload_record', resourceId: 'upload-7', createdAt: '2026-06-03T11:00:00Z' },
]

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-gray-100 text-gray-700',
  plan_approved: 'bg-green-100 text-green-800',
  plan_rejected: 'bg-red-100 text-red-800',
  plan_submitted: 'bg-blue-100 text-blue-800',
  file_uploaded: 'bg-violet-100 text-violet-800',
  file_processed: 'bg-violet-100 text-violet-800',
  target_updated: 'bg-amber-100 text-amber-800',
  chat_session_started: 'bg-purple-100 text-purple-800',
}

export default function AuditLogPage() {
  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable record of all system actions · 2-year retention"
      />
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_AUDIT.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {format(new Date(entry.createdAt), 'MMM d, HH:mm:ss')}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {entry.actorName}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {entry.action.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {entry.resourceType}
                  {entry.resourceId ? ` · ${entry.resourceId}` : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
