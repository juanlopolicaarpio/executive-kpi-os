'use client'

interface Props {
  fileName: string
  progress: number // 0-100
  status: 'uploading' | 'processing' | 'done' | 'error'
  error?: string
}

export function UploadProgress({ fileName, progress, status, error }: Props) {
  const statusMessages: Record<Props['status'], string> = {
    uploading: 'Uploading…',
    processing: 'Processing rows…',
    done: 'Upload complete',
    error: error ?? 'Upload failed',
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      {/* File name */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium truncate">{fileName}</p>
        {status === 'done' && (
          <span className="text-green-600 shrink-0" aria-label="Done">
            ✓
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            status === 'error'
              ? 'bg-red-500'
              : status === 'done'
              ? 'bg-green-500'
              : 'bg-violet-500'
          }`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>

      {/* Status message */}
      <p
        className={`text-xs ${
          status === 'error'
            ? 'text-red-600 font-medium'
            : status === 'done'
            ? 'text-green-600'
            : 'text-muted-foreground'
        }`}
      >
        {statusMessages[status]}
        {status !== 'error' && status !== 'done' && (
          <span className="ml-1 text-muted-foreground">{progress}%</span>
        )}
      </p>
    </div>
  )
}
