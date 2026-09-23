'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from '@/components/uploads/UploadZone'
import { UploadProgress } from '@/components/uploads/UploadProgress'
import { SchemaValidator } from '@/components/uploads/SchemaValidator'
import { uploadSchemas } from '@/lib/upload-schemas'
import { mockKpis } from '@/lib/mock-data/kpis'
import { useSession } from '@/hooks/useSession'

export default function KpiUploadPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useSession()
  const kpiId = params['kpiId'] as string

  const kpi = mockKpis.find(k => k.id === kpiId)
  const schema = kpi?.uploadSchemaId ? uploadSchemas[kpi.uploadSchemaId] : undefined

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<{
    status: 'uploading' | 'processing' | 'done' | 'error'
    progress: number
    error?: string
  } | null>(null)

  if (!kpi) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/uploads')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Uploads
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">KPI not found.</p>
      </div>
    )
  }

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)
    setUploadState(null)
  }

  const handleUpload = () => {
    if (!selectedFile) return

    setUploadState({ status: 'uploading', progress: 0 })

    // Simulate upload progress in mock mode
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 5
      if (progress >= 70) {
        clearInterval(interval)
        setUploadState({ status: 'processing', progress: 70 })
        setTimeout(() => {
          setUploadState({ status: 'done', progress: 100 })
          toast.success(`${selectedFile.name} uploaded and processed successfully (mock mode)`)
        }, 1200)
      } else {
        setUploadState({ status: 'uploading', progress })
      }
    }, 300)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push(`/kpis/${kpiId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to KPI
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Upload Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload for <span className="font-medium text-foreground">{kpi.name}</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Upload zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Select File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadZone
              kpiId={kpiId}
              onFileSelected={handleFileSelected}
              acceptedTypes={['.csv', '.xlsx']}
            />

            {uploadState && (
              <UploadProgress
                fileName={selectedFile?.name ?? ''}
                progress={uploadState.progress}
                status={uploadState.status}
                error={uploadState.error}
              />
            )}

            {selectedFile && !uploadState && (
              <Button
                onClick={handleUpload}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                Upload {selectedFile.name}
              </Button>
            )}

            {uploadState?.status === 'done' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    setUploadState(null)
                  }}
                >
                  Upload Another
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push(`/kpis/${kpiId}`)}
                >
                  View KPI
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schema reference */}
        {schema ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Expected File Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <SchemaValidator schema={schema} />
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No upload schema defined for this KPI. Contact your system administrator.
          </div>
        )}

        {/* Upload context */}
        <div className="rounded-lg bg-gray-50 border p-4 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium">Uploading as:</span> {user.name}</p>
          <p><span className="font-medium">KPI Cadence:</span> {kpi.cadence}</p>
          <p><span className="font-medium">Next check date:</span> {kpi.nextCheckDate}</p>
          <p className="pt-1 text-[11px]">
            Files are validated against the schema above before any rows are ingested. Invalid files are rejected without partial writes.
          </p>
        </div>
      </div>
    </div>
  )
}
