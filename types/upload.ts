export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface UploadRecord {
  id: string
  kpiId: string
  kpiName: string
  uploadedById: string
  uploadedByName: string
  fileName: string
  fileSize: number
  status: UploadStatus
  rowsProcessed?: number
  rowsRejected?: number
  errors?: UploadError[]
  uploadedAt: string
  processedAt?: string
  storagePath?: string
}

export interface UploadError {
  row: number
  field: string
  message: string
}

export interface UploadSchema {
  kpiId: string
  kpiName: string
  requiredColumns: SchemaColumn[]
  optionalColumns: SchemaColumn[]
  allowedMimeTypes: string[]
  maxFileSizeMb: number
  notes: string
}

export interface SchemaColumn {
  name: string
  type: 'string' | 'number' | 'date' | 'percentage'
  description: string
  example: string
}
