'use client'
import { useCallback, useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  kpiId: string
  onFileSelected?: (file: File) => void
  acceptedTypes?: string[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

export function UploadZone({ onFileSelected, acceptedTypes = ['.csv', '.xlsx'] }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!acceptedTypes.includes(ext)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`
    }
    if (file.size > 10 * 1_048_576) {
      return 'File too large. Maximum size: 10 MB'
    }
    return null
  }, [acceptedTypes])

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setValidationError(error)
      setSelectedFile(null)
    } else {
      setValidationError(null)
      setSelectedFile(file)
      onFileSelected?.(file)
    }
  }, [onFileSelected, validateFile])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setValidationError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          isDragging ? 'border-violet-500 bg-violet-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
          selectedFile && 'border-green-400 bg-green-50'
        )}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="h-10 w-10 text-green-600" />
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{selectedFile.name}</span>
              <button onClick={clearFile} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
              isDragging ? 'bg-violet-100' : 'bg-white border border-gray-200'
            )}>
              <Upload className={cn('h-6 w-6', isDragging ? 'text-violet-600' : 'text-gray-400')} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted: {acceptedTypes.join(', ')} · Max 10 MB
            </p>
          </div>
        )}

        {/* Hidden file input overlay */}
        {!selectedFile && (
          <input
            ref={inputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        )}
      </div>

      {validationError && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <X className="h-4 w-4" /> {validationError}
        </p>
      )}

      {!selectedFile && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      )}
    </div>
  )
}
