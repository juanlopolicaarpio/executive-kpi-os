'use client'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockKpis } from '@/lib/mock-data/kpis'
import { mockUploadRecords } from '@/lib/mock-data/uploads'
import { useSession } from '@/hooks/useSession'
import { format, isPast } from 'date-fns'
import { Upload } from 'lucide-react'

export default function UploadsPage() {
  const { user, role } = useSession()
  const router = useRouter()

  // Filter KPIs this user can upload to
  const uploadableKpis = mockKpis
    .filter((kpi) => {
      if (role === 'ceo' || role === 'econs-manager') return true
      return kpi.ownerId === user.id
    })
    .filter((kpi) => kpi.uploadSchemaId !== '')

  return (
    <div>
      <PageHeader
        title="Upload Hub"
        description="Upload data files to update KPI actuals"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {uploadableKpis.map((kpi) => {
          const lastUpload = mockUploadRecords
            .filter((u) => u.kpiId === kpi.id)
            .sort(
              (a, b) =>
                new Date(b.uploadedAt).getTime() -
                new Date(a.uploadedAt).getTime()
            )[0]

          const isOverdue = isPast(new Date(kpi.nextCheckDate))

          return (
            <Card key={kpi.id} className={isOverdue ? 'border-red-200' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold leading-tight">
                    {kpi.name}
                  </CardTitle>
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-800 text-xs shrink-0 ml-2">
                      Overdue
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">
                  Cadence: {kpi.cadence}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {lastUpload
                    ? `Last upload: ${format(new Date(lastUpload.uploadedAt), 'MMM d, HH:mm')} · ${lastUpload.status}`
                    : 'No uploads yet'}
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/kpis/${kpi.id}/upload`)}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Upload Data
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
