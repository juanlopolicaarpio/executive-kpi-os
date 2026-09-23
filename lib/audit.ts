// Audit log writer — in mock mode, logs to console. In production, writes to audit_log table.
export type AuditAction =
  | 'login' | 'logout' | 'kpi_value_updated' | 'plan_submitted'
  | 'plan_approved' | 'plan_rejected' | 'file_uploaded' | 'file_processed'
  | 'user_created' | 'user_role_changed' | 'target_updated'
  | 'chat_session_started'

interface AuditEntry {
  actorId: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== 'false') {
    console.log('[AUDIT]', entry)
    return
  }
  // Phase 1+: insert into audit_log table via Supabase service role
  throw new Error('Live audit logging not yet implemented')
}
