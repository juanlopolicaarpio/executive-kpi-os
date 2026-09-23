'use client'
import { PageHeader } from '@/components/shared/PageHeader'
import { UploadHistory } from '@/components/uploads/UploadHistory'
import { mockUploadRecords } from '@/lib/mock-data/uploads'

export default function UploadHistoryPage() {
  return (
    <div>
      <PageHeader
        title="Upload History"
        description="All file uploads across all KPIs"
      />
      <UploadHistory records={mockUploadRecords} />
    </div>
  )
}
