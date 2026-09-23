-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (mirrors Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ceo','econs-manager','category-lead','econs-officer','affiliate-officer','tts-ops','shopee-lazada-ops','finance','brand','viewer')),
  telegram_id BIGINT UNIQUE,
  telegram_linked BOOLEAN NOT NULL DEFAULT FALSE,
  owned_kpi_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE
);

-- KPIs table
CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('business-performance','profitability','growth-engine','operations')),
  strategic_purpose TEXT NOT NULL,
  target TEXT NOT NULL,
  target_numeric NUMERIC,
  current_value NUMERIC,
  current_value_display TEXT NOT NULL DEFAULT '—',
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly','quarterly')),
  next_check_date DATE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('primary','shared','alert','track')),
  status TEXT NOT NULL CHECK (status IN ('on-track','at-risk','missed','not-started','pending-data')),
  platform TEXT NOT NULL CHECK (platform IN ('shopee','lazada','tiktok-shop','all')),
  trend TEXT CHECK (trend IN ('up','down','flat')),
  why_its_core TEXT NOT NULL,
  upload_schema_id TEXT NOT NULL DEFAULT '',
  visible_to_roles TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- KPI Values (historical data points)
CREATE TABLE kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  target NUMERIC NOT NULL,
  upload_id UUID,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kpi_values_kpi_date ON kpi_values(kpi_id, recorded_date DESC);

-- Recovery Plans
CREATE TABLE recovery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpis(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','approved','rejected','in-progress','resolved','failed')),
  summary TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  target_date DATE NOT NULL,
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low','medium','high')),
  source TEXT NOT NULL CHECK (source IN ('dashboard','telegram')),
  ai_suggestion TEXT,
  ai_warning TEXT,
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  previous_plan_ids UUID[] NOT NULL DEFAULT '{}',
  outcome TEXT CHECK (outcome IN ('resolved','failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accountability Events
CREATE TABLE accountability_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpis(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('miss','check-in','plan-submitted','plan-approved','plan-rejected','escalation','resolved','telegram-response')),
  actor_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('dashboard','telegram','system')),
  metadata JSONB
);

CREATE INDEX idx_accountability_kpi ON accountability_events(kpi_id, triggered_at DESC);

-- Market Watch Snapshots
CREATE TABLE market_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  period TEXT NOT NULL,
  rank INTEGER NOT NULL,
  brand TEXT NOT NULL,
  is_northstar BOOLEAN NOT NULL DEFAULT FALSE,
  market_share NUMERIC NOT NULL,
  sales_est_low NUMERIC NOT NULL,
  sales_est_high NUMERIC NOT NULL,
  units_est_low NUMERIC NOT NULL,
  units_est_high NUMERIC NOT NULL,
  growth NUMERIC,
  snapshot_date DATE NOT NULL
);

CREATE INDEX idx_market_watch_period ON market_watch(period, platform, subcategory);

-- Upload Records
CREATE TABLE upload_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpis(id),
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
  rows_processed INTEGER,
  rows_rejected INTEGER,
  errors JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  storage_path TEXT
);
