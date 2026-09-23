'use client'
export function SessionExpiry() {
  // In mock mode, no-op
  if (process.env.NEXT_PUBLIC_USE_MOCK !== 'false') return null
  return null // Phase 1+: implement session expiry monitoring
}
