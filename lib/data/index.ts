import type { DataRepository } from './repository'
import { LiveRepository } from './live-repository'

export type { DataRepository } from './repository'

let repository: DataRepository | null = null

/**
 * Single data-source entry point for the whole app.
 *
 * Now backed by the real KPAI OS Supabase backend (LiveRepository). It reads
 * /api/data/live and serves every screen from real data; it falls back to mock
 * only if the backend is unreachable, so the app never hard-fails.
 */
export function getRepository(): DataRepository {
  if (!repository) {
    repository = new LiveRepository()
  }
  return repository
}
