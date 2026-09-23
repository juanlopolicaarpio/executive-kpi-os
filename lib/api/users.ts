import type { User } from '@/types/user'
import { mockUsers } from '@/lib/mock-data/users'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

export async function getUsers(): Promise<User[]> {
  if (USE_MOCK) return mockUsers
  throw new Error('Live DB not configured')
}

export async function getUserById(id: string): Promise<User | null> {
  if (USE_MOCK) return mockUsers.find(u => u.id === id) ?? null
  throw new Error('Live DB not configured')
}
