-- Audit Log table — append-only, 2-year retention
-- Never allow DELETE or UPDATE on this table

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- CEO and E-comm Manager can read all audit log entries
CREATE POLICY "audit_log_read" ON audit_log FOR SELECT USING (
  (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
);

-- Any authenticated user can insert (system inserts on their behalf)
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (
  actor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR actor_id IS NULL -- allow system/service-role inserts
);

-- No UPDATE or DELETE policies — append-only
-- Enforce via service role only for writes from Edge Functions
