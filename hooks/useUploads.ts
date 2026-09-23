'use client'
import { useQuery } from '@tanstack/react-query'
import { getUploadRecords } from '@/lib/api/uploads'

export function useUploads() {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: getUploadRecords,
  })
}
