-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_records ENABLE ROW LEVEL SECURITY;

-- Users: read own profile; CEO/Manager read all
CREATE POLICY "users_read_own" ON users FOR SELECT USING (
  auth_id = auth.uid()
  OR (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth_id = auth.uid());

-- KPIs: owners + admins + role-permitted viewers
CREATE POLICY "kpi_read" ON kpis FOR SELECT USING (
  owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
  OR (SELECT role FROM users WHERE auth_id = auth.uid())::text = ANY(visible_to_roles)
);

-- KPI values: follows KPI visibility
CREATE POLICY "kpi_values_read" ON kpi_values FOR SELECT USING (
  kpi_id IN (SELECT id FROM kpis)
);
CREATE POLICY "kpi_values_insert" ON kpi_values FOR INSERT WITH CHECK (
  kpi_id IN (SELECT id FROM kpis WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
);

-- Recovery Plans
CREATE POLICY "plan_read" ON recovery_plans FOR SELECT USING (
  owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
);
CREATE POLICY "plan_insert" ON recovery_plans FOR INSERT WITH CHECK (
  owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  AND kpi_id IN (SELECT id FROM kpis WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
);
CREATE POLICY "plan_approve" ON recovery_plans FOR UPDATE USING (
  (SELECT role FROM users WHERE auth_id = auth.uid()) = 'ceo'
) WITH CHECK (status IN ('approved', 'rejected'));

-- Accountability Events
CREATE POLICY "events_read" ON accountability_events FOR SELECT USING (
  kpi_id IN (SELECT id FROM kpis)
);
CREATE POLICY "events_insert" ON accountability_events FOR INSERT WITH CHECK (
  actor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Market Watch: all roles can read
CREATE POLICY "market_watch_read" ON market_watch FOR SELECT USING (true);

-- Upload Records
CREATE POLICY "uploads_read" ON upload_records FOR SELECT USING (
  uploaded_by_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
);
CREATE POLICY "uploads_insert" ON upload_records FOR INSERT WITH CHECK (
  uploaded_by_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);
