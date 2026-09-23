-- ============================================================================
-- Migration 006 — Schema v2
-- Brings the database in line with KPAI OS as actually built:
--   * institutional memory (playbooks + learnings) for the recovery loop
--   * dimensional + raw storage so per-platform / per-category uploads can be
--     stored, recomputed and drilled into (not just a single scalar per date)
--   * stable KPI `code` slugs to bridge app ids ('kpi-1') <-> UUID PKs
--   * recovery_plan memory provenance columns
--   * SECURITY DEFINER RLS helpers (fix the users-policy recursion footgun and
--     stop re-running the role lookup per row) + owner update policies
--   * the foreign-key indexes the v1 schema was missing
--   * updated_at triggers
-- Safe to run after 001–005. Idempotent where practical.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RLS helper functions (SECURITY DEFINER bypasses RLS -> no recursion, and
--    the lookup is evaluated once per statement instead of once per row).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE auth_id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE auth_id = (SELECT auth.uid()))
      IN ('ceo','econs-manager'),
    FALSE)
$$;

-- Generic updated_at maintainer.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. KPIs: stable code slug + shared ownership.
-- ----------------------------------------------------------------------------
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS shared_owner_ids UUID[] NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS uq_kpis_code ON kpis(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpis_owner ON kpis(owner_id);

-- Classifies whether a KPI's value is uploaded directly or computed by KPAI OS
-- from raw inputs (GP, EBITDA, conversion, AOV, new-user-growth, etc.).
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS compute_mode TEXT NOT NULL DEFAULT 'uploaded'
  CHECK (compute_mode IN ('uploaded','computed'));

-- ----------------------------------------------------------------------------
-- 3. kpi_values: add dimensions so a KPI can carry per-platform / per-segment
--    series. Defaults of 'all' keep existing single-series rows valid.
-- ----------------------------------------------------------------------------
ALTER TABLE kpi_values ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'all';
ALTER TABLE kpi_values ADD COLUMN IF NOT EXISTS segment  TEXT NOT NULL DEFAULT 'all';
ALTER TABLE kpi_values ADD COLUMN IF NOT EXISTS metadata JSONB;
-- One value per KPI / date / platform / segment (enables idempotent upserts).
CREATE UNIQUE INDEX IF NOT EXISTS uq_kpi_values_dim
  ON kpi_values(kpi_id, recorded_date, platform, segment);
CREATE INDEX IF NOT EXISTS idx_kpi_values_upload ON kpi_values(upload_id);

-- ----------------------------------------------------------------------------
-- 4. Raw uploaded rows — preserved verbatim for recompute / audit / drill-down.
--    The ingest pipeline parses a file into these, then computes kpi_values.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpi_data_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES upload_records(id) ON DELETE CASCADE,
  kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  period TEXT NOT NULL,                 -- 'YYYY-MM' or 'YYYY-MM-DD'
  platform TEXT NOT NULL DEFAULT 'all',
  segment TEXT NOT NULL DEFAULT 'all',  -- category / subcategory
  payload JSONB NOT NULL,               -- parsed raw columns as uploaded
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kpi_data_rows_kpi ON kpi_data_rows(kpi_id, period);
CREATE INDEX IF NOT EXISTS idx_kpi_data_rows_upload ON kpi_data_rows(upload_id);

-- ----------------------------------------------------------------------------
-- 5. Institutional memory — playbooks + learnings (the recovery loop's brain).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  issue_type TEXT NOT NULL,
  intervention TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_impact TEXT,
  effort_level TEXT NOT NULL DEFAULT 'medium' CHECK (effort_level IN ('low','medium','high')),
  default_owner_role TEXT,
  success_rate_pct NUMERIC NOT NULL DEFAULT 0,
  times_used INTEGER NOT NULL DEFAULT 0,
  related_learning_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  context TEXT,
  outcome TEXT NOT NULL,
  result TEXT CHECK (result IN ('resolved','failed')),   -- what worked vs not
  source_plan_id UUID REFERENCES recovery_plans(id) ON DELETE SET NULL,
  source_kpi_id UUID REFERENCES kpis(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learnings_kpi ON learnings(source_kpi_id);
CREATE INDEX IF NOT EXISTS idx_learnings_playbook ON learnings(playbook_id);

-- ----------------------------------------------------------------------------
-- 6. recovery_plans: memory provenance + the FK indexes v1 lacked.
-- ----------------------------------------------------------------------------
ALTER TABLE recovery_plans ADD COLUMN IF NOT EXISTS plan_source TEXT
  CHECK (plan_source IN ('ai-suggestion','own'));
ALTER TABLE recovery_plans ADD COLUMN IF NOT EXISTS source_playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL;
ALTER TABLE recovery_plans ADD COLUMN IF NOT EXISTS source_learning_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_recovery_plans_kpi ON recovery_plans(kpi_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_owner ON recovery_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_status ON recovery_plans(status);

-- ----------------------------------------------------------------------------
-- 7. upload_records FK indexes.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_upload_records_kpi ON upload_records(kpi_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_records_user ON upload_records(uploaded_by_id, uploaded_at DESC);

-- ----------------------------------------------------------------------------
-- 8. updated_at triggers.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_kpis_updated ON kpis;
CREATE TRIGGER trg_kpis_updated BEFORE UPDATE ON kpis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_plans_updated ON recovery_plans;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON recovery_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_playbooks_updated ON playbooks;
CREATE TRIGGER trg_playbooks_updated BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. RLS — fix recursion, use helpers, and add the missing write policies.
-- ----------------------------------------------------------------------------
ALTER TABLE kpi_data_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learnings ENABLE ROW LEVEL SECURITY;

-- users: previous policy queried `users` inside a `users` policy (recursion).
-- is_admin() is SECURITY DEFINER so it does not re-trigger RLS.
DROP POLICY IF EXISTS "users_read_own" ON users;
CREATE POLICY "users_read_own" ON users FOR SELECT USING (
  auth_id = (SELECT auth.uid()) OR public.is_admin()
);

-- kpis read: owner, shared owner, admin, or role-permitted viewer.
DROP POLICY IF EXISTS "kpi_read" ON kpis;
CREATE POLICY "kpi_read" ON kpis FOR SELECT USING (
  owner_id = public.current_app_user_id()
  OR public.current_app_user_id() = ANY(shared_owner_ids)
  OR public.is_admin()
  OR public.current_app_role() = ANY(visible_to_roles)
);

-- recovery_plans: read + insert as before, but now owners can UPDATE their own
-- plan (record outcome) and admins can UPDATE any (endorse / send back). The v1
-- policy only let the CEO move a plan to approved/rejected.
DROP POLICY IF EXISTS "plan_read" ON recovery_plans;
CREATE POLICY "plan_read" ON recovery_plans FOR SELECT USING (
  owner_id = public.current_app_user_id() OR public.is_admin()
);
DROP POLICY IF EXISTS "plan_insert" ON recovery_plans;
CREATE POLICY "plan_insert" ON recovery_plans FOR INSERT WITH CHECK (
  owner_id = public.current_app_user_id()
  AND kpi_id IN (SELECT id FROM kpis WHERE owner_id = public.current_app_user_id())
);
DROP POLICY IF EXISTS "plan_approve" ON recovery_plans;
DROP POLICY IF EXISTS "plan_update_own" ON recovery_plans;
CREATE POLICY "plan_update_own" ON recovery_plans FOR UPDATE
  USING (owner_id = public.current_app_user_id());
DROP POLICY IF EXISTS "plan_update_admin" ON recovery_plans;
CREATE POLICY "plan_update_admin" ON recovery_plans FOR UPDATE
  USING (public.is_admin());

-- kpi_values / events read: follow KPI visibility via the (RLS-respecting) kpis set.
DROP POLICY IF EXISTS "kpi_values_read" ON kpi_values;
CREATE POLICY "kpi_values_read" ON kpi_values FOR SELECT USING (
  kpi_id IN (SELECT id FROM kpis)
);
DROP POLICY IF EXISTS "kpi_values_insert" ON kpi_values;
CREATE POLICY "kpi_values_insert" ON kpi_values FOR INSERT WITH CHECK (
  kpi_id IN (SELECT id FROM kpis WHERE owner_id = public.current_app_user_id())
  OR public.is_admin()
);

-- raw rows: read follows KPI visibility; write by KPI owner or admin (or the
-- service role used by the ingest function, which bypasses RLS entirely).
DROP POLICY IF EXISTS "kpi_data_rows_read" ON kpi_data_rows;
CREATE POLICY "kpi_data_rows_read" ON kpi_data_rows FOR SELECT USING (
  kpi_id IN (SELECT id FROM kpis)
);
DROP POLICY IF EXISTS "kpi_data_rows_insert" ON kpi_data_rows;
CREATE POLICY "kpi_data_rows_insert" ON kpi_data_rows FOR INSERT WITH CHECK (
  kpi_id IN (SELECT id FROM kpis WHERE owner_id = public.current_app_user_id())
  OR public.is_admin()
);

-- institutional memory: readable by all authenticated users; learnings can be
-- appended by any user (the loop writes them); playbooks curated by admins.
DROP POLICY IF EXISTS "playbooks_read" ON playbooks;
CREATE POLICY "playbooks_read" ON playbooks FOR SELECT USING (true);
DROP POLICY IF EXISTS "playbooks_write_admin" ON playbooks;
CREATE POLICY "playbooks_write_admin" ON playbooks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "learnings_read" ON learnings;
CREATE POLICY "learnings_read" ON learnings FOR SELECT USING (true);
DROP POLICY IF EXISTS "learnings_insert" ON learnings;
CREATE POLICY "learnings_insert" ON learnings FOR INSERT
  WITH CHECK (public.current_app_user_id() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 10. Audit-log retention helper (the v1 comment promised 2-year retention but
--     never implemented it). Schedule via pg_cron if available, else call
--     periodically from an Edge Function.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_audit_log()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.audit_log WHERE created_at < now() - INTERVAL '2 years'
$$;
