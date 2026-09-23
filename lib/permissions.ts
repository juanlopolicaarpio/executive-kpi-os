import type { UserRole } from '@/types/user'

export const ROLE_LABELS: Record<UserRole, string> = {
  'ceo': 'CEO',
  'econs-manager': 'Head of Growth',
  'category-lead': 'CRM & Lifecycle Lead',
  'econs-officer': 'Paid Acquisition Lead',
  'affiliate-officer': 'Affiliate Marketing Lead',
  'tts-ops': 'Telesales Lead',
  'shopee-lazada-ops': 'Commercial Partnerships Lead',
  'finance': 'Finance',
  'brand': 'Customer Intelligence',
  'viewer': 'Viewer',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  'ceo': 'bg-purple-100 text-purple-800',
  'econs-manager': 'bg-blue-100 text-blue-800',
  'category-lead': 'bg-green-100 text-green-800',
  'econs-officer': 'bg-cyan-100 text-cyan-800',
  'affiliate-officer': 'bg-orange-100 text-orange-800',
  'tts-ops': 'bg-pink-100 text-pink-800',
  'shopee-lazada-ops': 'bg-red-100 text-red-800',
  'finance': 'bg-yellow-100 text-yellow-800',
  'brand': 'bg-indigo-100 text-indigo-800',
  'viewer': 'bg-gray-100 text-gray-800',
}

type Permission =
  | 'view:all-kpis'
  | 'view:own-kpis'
  | 'upload:own-kpis'
  | 'approve:plans'
  | 'view:admin'
  | 'view:ai-insights'
  | 'view:upload-history'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'ceo': ['view:all-kpis', 'upload:own-kpis', 'approve:plans', 'view:admin', 'view:ai-insights', 'view:upload-history'],
  'econs-manager': ['view:all-kpis', 'upload:own-kpis', 'view:admin', 'view:ai-insights', 'view:upload-history'],
  'category-lead': ['view:own-kpis', 'upload:own-kpis', 'view:ai-insights'],
  'econs-officer': ['view:own-kpis', 'upload:own-kpis', 'view:ai-insights'],
  'affiliate-officer': ['view:own-kpis', 'upload:own-kpis'],
  'tts-ops': ['view:own-kpis', 'upload:own-kpis'],
  'shopee-lazada-ops': ['view:own-kpis', 'upload:own-kpis'],
  'finance': ['view:own-kpis', 'upload:own-kpis', 'view:ai-insights'],
  'brand': ['view:own-kpis'],
  'viewer': ['view:own-kpis'],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  if (route.startsWith('/admin') && !hasPermission(role, 'view:admin')) return false
  if (route.startsWith('/uploads/history') && !hasPermission(role, 'view:upload-history')) return false
  if (route.startsWith('/ai-insights') && !hasPermission(role, 'view:ai-insights')) return false
  return true
}
