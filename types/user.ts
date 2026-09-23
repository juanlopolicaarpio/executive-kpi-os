export type UserRole =
  | 'ceo'
  | 'econs-manager'
  | 'category-lead'
  | 'econs-officer'
  | 'affiliate-officer'
  | 'tts-ops'
  | 'shopee-lazada-ops'
  | 'finance'
  | 'brand'
  | 'viewer'

export interface User {
  id: string
  authId: string
  name: string
  email: string
  role: UserRole
  telegramId?: string
  telegramLinked: boolean
  ownedKpiIds: string[]
  createdAt: string
  lastLoginAt?: string
  mfaEnabled: boolean
}
