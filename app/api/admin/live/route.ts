import { mockUsers } from '@/lib/mock-data/users'
import { mockUploadRecords } from '@/lib/mock-data/uploads'
import { NORTHSTAR_AS_OF } from '@/lib/northstar/demo-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  return Response.json({
    users: mockUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasLogin: true,
      createdAt: NORTHSTAR_AS_OF,
    })),
    uploads: mockUploadRecords.map((upload) => ({
      id: upload.id,
      source: 'Northstar demo workbook',
      dataType: upload.kpiName,
      rows: upload.rowsProcessed,
      period: '2026-06 to 2026-08',
      uploadedAt: upload.uploadedAt.slice(0, 10),
      status: upload.status,
    })),
    connections: [
      {
        provider: 'Northstar mock workbook',
        status: 'demo',
        lastSyncedAt: NORTHSTAR_AS_OF,
      },
    ],
  })
}
