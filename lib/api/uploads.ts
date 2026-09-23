import type { UploadRecord } from '@/types/upload'
import { mockUploadRecords } from '@/lib/mock-data/uploads'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

export async function getUploadRecords(): Promise<UploadRecord[]> {
  if (USE_MOCK) return mockUploadRecords
  throw new Error('Live DB not configured')
}
