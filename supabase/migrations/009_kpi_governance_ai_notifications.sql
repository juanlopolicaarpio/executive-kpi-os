-- =============================================================================
-- 009 — KPI governance fields, AI accountability, and notifications
-- =============================================================================
-- Run AFTER 008_initiative_governance.sql.
--
-- Three things the PRD needs that the schema cannot express yet:
--
--   * §6.3 / §11.1 / §11.3 — KPIs need weight, priority, explicit status
--     thresholds, freshness tolerance, aggregation and scope before the status
--     engine and Health Score can be anything but hardcoded guesses.
--   * §9.5 / §12.4 — AI output must be reproducible: which model, which prompt,
--     which records, what the user did with it. Without this the guardrails are
--     promises rather than records.
--   * §10.1 — notifications.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- KPI governance (PRD §6.3 field dictionary)
-- ---------------------------------------------------------------------------

alter table active_kpis
  -- Health Score weighting (PRD §11.3). 1-5, default 3 = neutral.
  add column if not exists weight integer not null default 3
    check (weight between 1 and 5),
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  -- Status thresholds. Null = fall back to the organization defaults, so a KPI
  -- only carries values here when someone deliberately overrode them.
  --   { "onTrack": 1.0, "atRisk": 0.9 }  as performance ratios
  add column if not exists thresholds jsonb,
  -- Range direction needs bounds; null for above/below KPIs.
  add column if not exists target_lower numeric,
  add column if not exists target_upper numeric,
  -- How long after the expected measurement before the KPI reads as Stale.
  add column if not exists freshness_tolerance_hours integer not null default 720,
  add column if not exists aggregation text not null default 'last'
    check (aggregation in ('sum', 'average', 'last', 'min', 'max')),
  add column if not exists scope_type text not null default 'organization'
    check (scope_type in ('organization', 'department', 'team', 'individual')),
  add column if not exists scope_id uuid,
  add column if not exists is_archived boolean not null default false;

-- 'range' joins above/below as a valid direction.
alter table active_kpis drop constraint if exists active_kpis_target_direction_check;
alter table active_kpis
  add constraint active_kpis_target_direction_check
  check (target_direction in ('above', 'below', 'range'));

alter table active_kpis
  add constraint active_kpis_range_bounds_ck
  check (
    target_direction <> 'range'
    or (target_lower is not null and target_upper is not null and target_upper >= target_lower)
  );

create index if not exists active_kpis_scope_idx on active_kpis (org_id, scope_type, scope_id);
create index if not exists active_kpis_priority_idx on active_kpis (org_id, priority)
  where is_archived = false;

-- Organization-level defaults for thresholds and freshness (PRD §10.2).
alter table organizations
  add column if not exists default_thresholds jsonb
    not null default '{"onTrack": 1.0, "atRisk": 0.9}'::jsonb,
  add column if not exists default_freshness_hours integer not null default 720;

-- ---------------------------------------------------------------------------
-- KPI status change events (PRD §11.1: "all recalculations write a
-- status-change event when the resulting status differs")
-- ---------------------------------------------------------------------------

create table if not exists kpi_status_events (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  kpi_slug     text not null,
  from_status  text,
  to_status    text not null,
  value        numeric,
  target_value numeric,
  ratio        numeric,
  period       date,
  created_at   timestamptz not null default now()
);

create index if not exists kpi_status_events_idx
  on kpi_status_events (org_id, kpi_slug, created_at desc);

-- ---------------------------------------------------------------------------
-- AI accountability (PRD §9.5, §12.4)
-- ---------------------------------------------------------------------------

-- query_log exists but cannot answer "which model, which prompt, what did the
-- user do with it" — which is the whole point of logging AI output.
alter table query_log
  add column if not exists model_version text,
  add column if not exists prompt_version text,
  add column if not exists evidence_refs jsonb not null default '[]'::jsonb,
  add column if not exists scope jsonb,
  add column if not exists user_action text
    check (user_action is null or user_action in ('viewed', 'accepted', 'modified', 'dismissed')),
  add column if not exists feedback text
    check (feedback is null or feedback in ('helpful', 'not_helpful')),
  add column if not exists feedback_reason text,
  add column if not exists latency_ms integer;

create index if not exists query_log_org_idx on query_log (org_id, created_at desc);

create table if not exists ai_recommendations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  type            text not null,          -- initiative | diagnosis | investment
  scope           jsonb not null default '{}'::jsonb,
  kpi_slug        text,
  title           text not null,
  rationale       text not null,
  -- The §9.4 weighted score and its component breakdown, so a ranking can be
  -- explained rather than asserted.
  score           numeric,
  score_breakdown jsonb not null default '{}'::jsonb,
  -- High | Medium | Low. PRD §14.5 rules out precise probabilities in MVP.
  confidence_band text check (confidence_band in ('high', 'medium', 'low')),
  limitations     text,
  evidence_refs   jsonb not null default '[]'::jsonb,
  expected_impact text,
  effort          text,
  model_version   text,
  prompt_version  text,
  generated_at    timestamptz not null default now(),
  generated_for   uuid references members (id) on delete set null,
  user_action     text check (user_action is null or user_action in ('viewed', 'accepted', 'modified', 'dismissed')),
  user_feedback   text check (user_feedback is null or user_feedback in ('helpful', 'not_helpful')),
  acted_at        timestamptz,
  -- Set when "accept" turned this into a Draft initiative.
  initiative_id   uuid references initiatives (id) on delete set null
);

create index if not exists ai_recommendations_org_idx
  on ai_recommendations (org_id, generated_at desc);
create index if not exists ai_recommendations_kpi_idx on ai_recommendations (org_id, kpi_slug);

-- ---------------------------------------------------------------------------
-- Notifications (PRD §10.1)
-- ---------------------------------------------------------------------------

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  recipient_id uuid not null references members (id) on delete cascade,
  event_type   text not null,
  title        text not null,
  body         text,
  -- Where clicking it goes.
  link         text,
  -- Object reference, so duplicates can be suppressed per §10.1.
  object_type  text,
  object_id    uuid,
  -- Critical notifications cannot be muted by admins (PRD §10.1).
  is_critical  boolean not null default false,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on notifications (recipient_id, read_at, created_at desc);
-- Suppress repeat alerts for the same object + event until it is read.
create unique index if not exists notifications_dedupe_idx
  on notifications (recipient_id, event_type, object_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table kpi_status_events  enable row level security;
alter table ai_recommendations enable row level security;
alter table notifications      enable row level security;

drop policy if exists kpi_status_events_org_member on kpi_status_events;
create policy kpi_status_events_org_member on kpi_status_events
  for all using (
    org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
  );

drop policy if exists ai_recommendations_org_member on ai_recommendations;
create policy ai_recommendations_org_member on ai_recommendations
  for all using (
    org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
  );

-- Notifications are personal, not org-wide.
drop policy if exists notifications_own on notifications;
create policy notifications_own on notifications
  for all using (
    recipient_id in (select m.id from members m where m.auth_user_id = auth.uid())
  );

commit;
