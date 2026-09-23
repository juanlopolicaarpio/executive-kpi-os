-- =============================================================================
-- 007 — Initiatives: the operating engine of KPI OS
-- =============================================================================
-- Public-release reference migration. Apply only to a disposable local/demo project. The rest of
-- supabase/migrations/ is the retired original draft; this file is kept here as
-- the record of what was actually run.
--
-- Model decisions baked in here:
--   * ONE initiatives table. A recovery plan is just initiative_type='recovery'
--     — there is no separate reactive object. Reactive initiatives keep a link
--     back to the ticket/KPI that triggered them.
--   * Oversight is NON-BLOCKING. Submitting moves an initiative straight to
--     'active'; `endorsement` tracks the manager's read separately so the loop
--     never waits on an approval gate.
--   * Results submission is MANDATORY: closing requires a row in
--     initiative_results (enforced by trigger below).
--   * ROI and ROAS are generated columns so they can never drift from spend.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- draft            → being written, not yet visible as work in flight
-- active           → submitted and executing (endorsement runs alongside)
-- completed        → timeline ended, awaiting the results submission
-- results_submitted→ results in, awaiting manager review
-- closed           → reviewed and archived; written to institutional memory
-- cancelled        → abandoned before completion
create type initiative_status as enum (
  'draft',
  'active',
  'completed',
  'results_submitted',
  'closed',
  'cancelled'
);

-- Non-blocking manager oversight, tracked independently of status.
create type endorsement_status as enum ('pending', 'endorsed', 'sent_back');

create type initiative_type as enum (
  'campaign',
  'mega_sale',
  'bundle_promo',
  'media',
  'product_launch',
  'pricing',
  'crm',
  'ai_deployment',
  'ops_improvement',
  'hiring',
  'process',
  'recovery',
  'other'
);

create type initiative_priority as enum ('low', 'medium', 'high', 'critical');

create type goal_achieved as enum ('yes', 'partial', 'no');

-- ---------------------------------------------------------------------------
-- members: department + reporting line
-- ---------------------------------------------------------------------------
-- Needed so an initiative can resolve its approver and be filtered by
-- department. Both nullable — existing rows stay valid.

alter table members add column if not exists department text;
alter table members add column if not exists manager_id uuid references members (id) on delete set null;

create index if not exists members_manager_idx on members (manager_id);
create index if not exists members_department_idx on members (org_id, department);

-- ---------------------------------------------------------------------------
-- initiatives
-- ---------------------------------------------------------------------------

create table initiatives (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,

  -- Basic information
  name              text not null,
  description       text,
  initiative_type   initiative_type not null default 'other',
  status            initiative_status not null default 'draft',
  priority          initiative_priority not null default 'medium',
  department        text,

  -- People
  owner_id          uuid references members (id) on delete set null,
  approver_id       uuid references members (id) on delete set null,

  -- Timeline
  start_date        date,
  end_date          date,

  -- Budget (results carry the financial outcome; these are the plan)
  approved_budget   numeric,
  actual_spend      numeric,

  -- Non-blocking oversight
  endorsement       endorsement_status not null default 'pending',
  endorsed_by       uuid references members (id) on delete set null,
  endorsed_at       timestamptz,
  endorsement_note  text,

  -- Provenance: where this initiative came from
  source            text not null default 'manual'
                    check (source in ('manual', 'recovery', 'ai_suggested')),
  ticket_id         uuid references tickets (id) on delete set null,
  trigger_kpi_slug  text,
  parent_initiative_id uuid references initiatives (id) on delete set null,

  -- AI assist captured at draft time (what the AI proposed, and any warning
  -- about an approach that failed before)
  ai_suggestion     text,
  ai_warning        text,

  -- Lifecycle timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  completed_at      timestamptz,
  closed_at         timestamptz,

  constraint initiatives_timeline_ck check (end_date is null or start_date is null or end_date >= start_date),
  constraint initiatives_budget_ck   check (approved_budget is null or approved_budget >= 0),
  constraint initiatives_spend_ck    check (actual_spend is null or actual_spend >= 0)
);

create index initiatives_org_status_idx  on initiatives (org_id, status);
create index initiatives_owner_idx       on initiatives (owner_id);
create index initiatives_approver_idx    on initiatives (approver_id);
create index initiatives_type_idx        on initiatives (org_id, initiative_type);
create index initiatives_department_idx  on initiatives (org_id, department);
create index initiatives_endorsement_idx on initiatives (org_id, endorsement)
  where status = 'active';
create index initiatives_dates_idx       on initiatives (org_id, start_date, end_date);
create index initiatives_ticket_idx      on initiatives (ticket_id);

-- ---------------------------------------------------------------------------
-- initiative_kpis — "Target KPIs" (an initiative may improve several)
-- ---------------------------------------------------------------------------

create table initiative_kpis (
  id             uuid primary key default gen_random_uuid(),
  initiative_id  uuid not null references initiatives (id) on delete cascade,
  active_kpi_id  uuid references active_kpis (id) on delete set null,
  -- Denormalised so history survives a KPI being deactivated, and so the app
  -- can join on the slug it already uses everywhere (lib/kpi-map.ts).
  kpi_slug       text not null,
  is_primary     boolean not null default false,

  -- Measured impact on THIS KPI
  baseline_value numeric,   -- captured when the initiative goes active
  target_delta   numeric,   -- optional explicit goal for this KPI
  result_value   numeric,   -- captured at results submission

  created_at     timestamptz not null default now(),

  unique (initiative_id, kpi_slug)
);

create index initiative_kpis_slug_idx       on initiative_kpis (kpi_slug);
create index initiative_kpis_initiative_idx on initiative_kpis (initiative_id);

-- ---------------------------------------------------------------------------
-- initiative_results — the mandatory results submission (one per initiative)
-- ---------------------------------------------------------------------------

create table initiative_results (
  id                  uuid primary key default gen_random_uuid(),
  initiative_id       uuid not null unique references initiatives (id) on delete cascade,

  -- Required fields from the results submission form
  goal_achieved       goal_achieved not null,
  actual_spend        numeric not null default 0 check (actual_spend >= 0),
  business_results    text not null,
  lessons_learned     text not null,

  -- Financial outcome
  revenue_generated   numeric,
  incremental_revenue numeric,
  incremental_profit  numeric,

  -- Derived — never stored by hand, so they cannot drift from spend.
  -- ROI  = (incremental profit - spend) / spend, as a percentage.
  -- ROAS = revenue generated / spend.
  roi  numeric generated always as (
    case when actual_spend > 0 and incremental_profit is not null
         then (incremental_profit - actual_spend) / actual_spend * 100
    end
  ) stored,
  roas numeric generated always as (
    case when actual_spend > 0 and revenue_generated is not null
         then revenue_generated / actual_spend
    end
  ) stored,

  -- Submission
  submitted_by  uuid references members (id) on delete set null,
  submitted_at  timestamptz not null default now(),

  -- Manager review (this is what actually closes the initiative)
  reviewed_by   uuid references members (id) on delete set null,
  reviewed_at   timestamptz,
  review_notes  text
);

create index initiative_results_roi_idx on initiative_results (roi desc nulls last);

-- ---------------------------------------------------------------------------
-- initiative_events — the accountability thread
-- ---------------------------------------------------------------------------

create table initiative_events (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives (id) on delete cascade,
  event_type    text not null,   -- created | submitted | endorsed | sent_back |
                                 -- completed | results_submitted | reviewed |
                                 -- closed | cancelled | comment | note
  actor_id      uuid references members (id) on delete set null,
  actor_name    text,
  message       text,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index initiative_events_initiative_idx on initiative_events (initiative_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger initiatives_touch_updated_at
  before update on initiatives
  for each row execute function touch_updated_at();

-- Results submission is mandatory: an initiative cannot reach 'closed' without
-- a reviewed results row. This is the rule that makes institutional memory
-- trustworthy, so it is enforced in the database, not just the UI.
create or replace function enforce_results_before_close() returns trigger
language plpgsql as $$
begin
  if new.status = 'closed' and (old.status is distinct from 'closed') then
    if not exists (
      select 1 from initiative_results r
      where r.initiative_id = new.id and r.reviewed_at is not null
    ) then
      raise exception
        'Initiative % cannot be closed: results must be submitted and reviewed first.', new.id
        using errcode = 'check_violation';
    end if;
    new.closed_at = coalesce(new.closed_at, now());
  end if;
  return new;
end;
$$;

create trigger initiatives_enforce_results_before_close
  before update on initiatives
  for each row execute function enforce_results_before_close();

-- ---------------------------------------------------------------------------
-- RLS — consistent with the rest of the schema. The app reads server-side with
-- the service-role key, which bypasses these; they guard direct client access.
-- ---------------------------------------------------------------------------

alter table initiatives        enable row level security;
alter table initiative_kpis    enable row level security;
alter table initiative_results enable row level security;
alter table initiative_events  enable row level security;

create policy initiatives_org_member on initiatives
  for all using (
    org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
  );

create policy initiative_kpis_org_member on initiative_kpis
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

create policy initiative_results_org_member on initiative_results
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

create policy initiative_events_org_member on initiative_events
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

commit;
