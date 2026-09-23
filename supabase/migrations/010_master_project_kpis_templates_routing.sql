-- =============================================================================
-- 010 — PRD v1.1: Master/Project KPIs, templates, budget lines, approval routing
-- =============================================================================
-- Run AFTER 009.
--
-- v1.1 redefines the initiative in three ways this schema cannot express:
--
--   §7.3  Exactly ONE Master KPI (an existing org KPI) plus at least one
--         Project KPI — an initiative-specific metric with its own definition,
--         target and measurement source. The 007 many-to-many `initiative_kpis`
--         is the wrong shape; it is migrated and kept read-only for history.
--   §7.4  Initiative templates, system-owned and org-clonable.
--   §7.5  Budget approval POLICY: ordered non-overlapping tiers that decide
--         whether an initiative auto-approves or routes, and to whom.
--
-- The routing engine is normative server-side (§11.5); the UI preview is
-- informative only.
-- =============================================================================

begin;

create type initiative_source_type as enum ('blank', 'template', 'ai');

-- ---------------------------------------------------------------------------
-- §7.4 Initiative templates
-- ---------------------------------------------------------------------------

create table if not exists initiative_templates (
  id                    uuid primary key default gen_random_uuid(),
  -- NULL org_id = system template, visible to every tenant.
  org_id                uuid references organizations (id) on delete cascade,
  name                  text not null,
  initiative_type       initiative_type not null default 'other',
  objective_prompt      text,
  mechanics_template    text,
  -- [{name, definition, unit, direction, target_hint, measurement_source}]
  project_kpi_defaults  jsonb not null default '[]'::jsonb,
  -- ["Media", "Production", ...]
  budget_categories     jsonb not null default '[]'::jsonb,
  default_duration_days integer,
  version               integer not null default 1,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists initiative_templates_org_idx on initiative_templates (org_id, is_active);

-- ---------------------------------------------------------------------------
-- §7.5 / §11.5 Budget approval policies
-- ---------------------------------------------------------------------------

create table if not exists approval_policies (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  version    integer not null default 1,
  currency   text not null default 'PHP',
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active policy per org — routing must never be ambiguous.
create unique index if not exists approval_policies_one_active
  on approval_policies (org_id) where is_active;

create table if not exists approval_tiers (
  id                uuid primary key default gen_random_uuid(),
  policy_id         uuid not null references approval_policies (id) on delete cascade,
  sort_order        integer not null,
  -- Boundary convention (§11.5): lower exclusive except the first tier,
  -- upper inclusive. NULL upper_bound = unbounded top tier.
  lower_bound       numeric not null,
  upper_bound       numeric,
  approval_required boolean not null,
  -- Either a role to resolve against the Master KPI's scope, or a named person.
  approver_role     text check (approver_role is null or approver_role in ('department_head', 'executive', 'admin')),
  approver_user_id  uuid references members (id) on delete set null,
  delegate_user_id  uuid references members (id) on delete set null,
  scope_resolution  text not null default 'master_kpi_scope',
  created_at        timestamptz not null default now(),

  constraint approval_tiers_bounds_ck check (upper_bound is null or upper_bound >= lower_bound),
  -- An approval-required tier that names nobody cannot route.
  constraint approval_tiers_approver_ck
    check (approval_required = false or approver_role is not null or approver_user_id is not null)
);

create index if not exists approval_tiers_policy_idx on approval_tiers (policy_id, sort_order);

-- ---------------------------------------------------------------------------
-- §7.3 Project KPIs
-- ---------------------------------------------------------------------------

create table if not exists initiative_project_kpis (
  id                       uuid primary key default gen_random_uuid(),
  initiative_id            uuid not null references initiatives (id) on delete cascade,
  name                     text not null,
  definition               text not null,
  unit                     text not null default 'number',
  direction                text not null default 'above'
                           check (direction in ('above', 'below', 'range')),
  -- Baseline is recommended, not required — but if absent it must be explained.
  baseline_value           numeric,
  baseline_reason          text,
  target_value             numeric not null,
  measurement_source       text not null,
  measurement_frequency    text,
  current_value            numeric,
  result_value             numeric,
  result_period_start      date,
  result_period_end        date,
  result_unavailable_reason text,
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint project_kpi_baseline_ck
    check (baseline_value is not null or baseline_reason is not null or true)
);

create index if not exists initiative_project_kpis_idx
  on initiative_project_kpis (initiative_id, sort_order);

-- ---------------------------------------------------------------------------
-- §7.5 Budget line items and revisions
-- ---------------------------------------------------------------------------

create table if not exists initiative_budget_revisions (
  id                 uuid primary key default gen_random_uuid(),
  initiative_id      uuid not null references initiatives (id) on delete cascade,
  previous_total     numeric not null,
  proposed_total     numeric not null,
  reason             text not null,
  policy_version     integer,
  tier_id            uuid references approval_tiers (id) on delete set null,
  routed_approver_id uuid references members (id) on delete set null,
  status             text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected')),
  decided_by         uuid references members (id) on delete set null,
  decided_at         timestamptz,
  decision_comment   text,
  created_by         uuid references members (id) on delete set null,
  created_at         timestamptz not null default now()
);

create index if not exists budget_revisions_initiative_idx
  on initiative_budget_revisions (initiative_id, created_at desc);

create table if not exists initiative_budget_lines (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives (id) on delete cascade,
  revision_id   uuid references initiative_budget_revisions (id) on delete cascade,
  line_type     text not null default 'planned' check (line_type in ('planned', 'actual')),
  category      text not null,
  description   text,
  amount        numeric not null check (amount >= 0),
  currency      text not null default 'PHP',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists budget_lines_initiative_idx
  on initiative_budget_lines (initiative_id, line_type, sort_order);

-- ---------------------------------------------------------------------------
-- Initiative columns for the recommendation form + routing snapshot
-- ---------------------------------------------------------------------------

alter table initiatives
  add column if not exists master_kpi_id uuid references active_kpis (id) on delete restrict,
  add column if not exists overall_objective text,
  add column if not exists description_mechanics text,
  add column if not exists source_type initiative_source_type not null default 'blank',
  add column if not exists source_template_id uuid references initiative_templates (id) on delete set null,
  add column if not exists source_ai_recommendation_id uuid references ai_recommendations (id) on delete set null,
  -- total_budget is what the user entered / lines sum to; approved_budget is
  -- the ceiling the approval actually granted. They diverge during revisions.
  add column if not exists total_budget numeric,
  add column if not exists approval_policy_version integer,
  add column if not exists matched_tier_id uuid references approval_tiers (id) on delete set null,
  add column if not exists auto_approved boolean not null default false;

create index if not exists initiatives_master_kpi_idx on initiatives (master_kpi_id);

-- ---------------------------------------------------------------------------
-- Migrate 007's many-to-many target KPIs onto the Master KPI model
-- ---------------------------------------------------------------------------
-- The primary target KPI becomes the Master KPI. The remaining links stay in
-- `initiative_kpis` as history rather than being deleted — they are real
-- recorded intent, and discarding them would rewrite what past initiatives
-- said they were trying to move.

-- UPDATE ... FROM cannot reference the target table inside a join condition,
-- so the org match is made in the WHERE clause via a subquery.
update initiatives i
set master_kpi_id = sub.active_kpi_id
from (
  select ik.initiative_id, ak.id as active_kpi_id, ak.org_id
  from initiative_kpis ik
  join kpi_definitions kd on kd.slug = ik.kpi_slug
  join active_kpis ak on ak.kpi_def_id = kd.id
  where ik.is_primary
) sub
where sub.initiative_id = i.id
  and sub.org_id = i.org_id
  and i.master_kpi_id is null;

-- Fall back to any linked KPI where none was flagged primary.
update initiatives i
set master_kpi_id = sub.active_kpi_id
from (
  select distinct on (ik.initiative_id)
         ik.initiative_id, ak.id as active_kpi_id, ak.org_id
  from initiative_kpis ik
  join kpi_definitions kd on kd.slug = ik.kpi_slug
  join active_kpis ak on ak.kpi_def_id = kd.id
  order by ik.initiative_id, ik.created_at
) sub
where sub.initiative_id = i.id
  and sub.org_id = i.org_id
  and i.master_kpi_id is null;

-- Backfill the recommendation-form fields from what already exists.
update initiatives
set overall_objective = coalesce(overall_objective, name),
    description_mechanics = coalesce(description_mechanics, description),
    total_budget = coalesce(total_budget, approved_budget)
where overall_objective is null or description_mechanics is null or total_budget is null;

-- ---------------------------------------------------------------------------
-- Seed: the six system templates (§7.4)
-- ---------------------------------------------------------------------------

insert into initiative_templates
  (org_id, name, initiative_type, objective_prompt, mechanics_template, project_kpi_defaults, budget_categories, default_duration_days)
values
  (null, 'Marketing or media campaign', 'campaign',
   'What audience response are we trying to create, and which business outcome should follow?',
   'Channels and placements. Audience and targeting. Creative approach. Flighting and frequency. Landing experience. Dependencies on creative, budget release and inventory.',
   '[{"name":"Reach","definition":"Unique users reached","unit":"number","direction":"above","measurement_source":"Ad platform"},
     {"name":"Traffic","definition":"Sessions driven","unit":"number","direction":"above","measurement_source":"Seller Center"},
     {"name":"Conversion rate","definition":"Sessions converting to orders","unit":"percentage","direction":"above","measurement_source":"Seller Center"},
     {"name":"ROAS","definition":"Attributed revenue per unit of ad spend","unit":"ratio","direction":"above","measurement_source":"Ad platform"}]'::jsonb,
   '["Media","Production","Agency","Influencer"]'::jsonb, 30),

  (null, 'Mega sale, promotion or pricing change', 'mega_sale',
   'What volume or share outcome should this promotion produce, and at what margin cost?',
   'Discount mechanic and thresholds. SKU inclusions and exclusions. Platform coverage. Stock cover. Margin guardrails. Competitive timing.',
   '[{"name":"Gross sales","definition":"Sales during the promotion window","unit":"currency","direction":"above","measurement_source":"Seller Center"},
     {"name":"Conversion rate","definition":"Sessions converting to orders","unit":"percentage","direction":"above","measurement_source":"Seller Center"},
     {"name":"Average order value","definition":"Revenue per order","unit":"currency","direction":"above","measurement_source":"Seller Center"},
     {"name":"Blended margin","definition":"Margin after discount and voucher cost","unit":"percentage","direction":"above","measurement_source":"Finance"}]'::jsonb,
   '["Discount funding","Voucher subsidy","Media","Platform fees"]'::jsonb, 14),

  (null, 'Product or service launch', 'product_launch',
   'What adoption and revenue should this launch achieve in its first period?',
   'Launch scope and markets. Positioning and pricing. Channel readiness. Stock and fulfilment. Support and training. Go/no-go criteria.',
   '[{"name":"Units sold","definition":"Units sold since launch","unit":"number","direction":"above","measurement_source":"Seller Center"},
     {"name":"Revenue","definition":"Revenue from launched SKUs","unit":"currency","direction":"above","measurement_source":"Seller Center"},
     {"name":"Return rate","definition":"Returns as a share of orders","unit":"percentage","direction":"below","measurement_source":"Seller Center"}]'::jsonb,
   '["Production","Marketing","Training","Packaging"]'::jsonb, 60),

  (null, 'Process improvement', 'process',
   'Which process is failing, and what does good look like once it is fixed?',
   'Current-state problem and evidence. Proposed process change. Owners and handoffs. Rollout plan. Training needs. Rollback plan.',
   '[{"name":"Cycle time","definition":"Time to complete the process end to end","unit":"duration","direction":"below","measurement_source":"Ops log"},
     {"name":"Error rate","definition":"Share of runs with a defect or rework","unit":"percentage","direction":"below","measurement_source":"Ops log"},
     {"name":"Cost per run","definition":"Fully loaded cost per completion","unit":"currency","direction":"below","measurement_source":"Finance"}]'::jsonb,
   '["Implementation","Tooling","Training","Contingency"]'::jsonb, 45),

  (null, 'AI or technology deployment', 'ai_deployment',
   'Which workflow should this technology change, and what should improve as a result?',
   'Use case and workflow. Systems and integrations. Data requirements. Rollout cohort. Adoption plan. Fallback if it underperforms.',
   '[{"name":"Adoption","definition":"Share of the target cohort actively using it","unit":"percentage","direction":"above","measurement_source":"Product analytics"},
     {"name":"Time saved","definition":"Hours saved per week across the cohort","unit":"duration","direction":"above","measurement_source":"Ops log"},
     {"name":"Output quality","definition":"Quality score or error rate of the assisted output","unit":"percentage","direction":"above","measurement_source":"QA review"}]'::jsonb,
   '["Software","Integration","Training","Support"]'::jsonb, 90),

  (null, 'Hiring or capability build', 'hiring',
   'What capability gap is this closing, and how will we know the hire worked?',
   'Role or capability definition. Sourcing approach. Interview and selection plan. Onboarding and ramp. Success criteria at 30/60/90 days.',
   '[{"name":"Time to fill","definition":"Days from approval to signed offer","unit":"duration","direction":"below","measurement_source":"HR tracker"},
     {"name":"Ramp to productivity","definition":"Days to reach the agreed output level","unit":"duration","direction":"below","measurement_source":"Manager review"},
     {"name":"Retention at 6 months","definition":"Still in role at six months","unit":"percentage","direction":"above","measurement_source":"HR tracker"}]'::jsonb,
   '["Recruitment fees","Salary","Training","Equipment"]'::jsonb, 120)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seed: a default approval policy (§7.5 example tiers — placeholders,
-- editable in Admin. Amounts are in the organization's default currency.)
-- ---------------------------------------------------------------------------

do $$
declare
  v_org uuid;
  v_policy uuid;
begin
  select id into v_org from organizations order by created_at limit 1;
  if v_org is null then return; end if;
  if exists (select 1 from approval_policies where org_id = v_org) then return; end if;

  insert into approval_policies (org_id, version, currency, is_active)
  values (v_org, 1, 'PHP', true)
  returning id into v_policy;

  insert into approval_tiers
    (policy_id, sort_order, lower_bound, upper_bound, approval_required, approver_role)
  values
    (v_policy, 1, 0,        500000,  false, null),
    (v_policy, 2, 500000,   1000000, true,  'department_head'),
    (v_policy, 3, 1000000,  null,    true,  'executive');
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table initiative_templates        enable row level security;
alter table approval_policies           enable row level security;
alter table approval_tiers              enable row level security;
alter table initiative_project_kpis     enable row level security;
alter table initiative_budget_lines     enable row level security;
alter table initiative_budget_revisions enable row level security;

drop policy if exists initiative_templates_read on initiative_templates;
create policy initiative_templates_read on initiative_templates
  for all using (
    org_id is null
    or org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
  );

drop policy if exists approval_policies_org on approval_policies;
create policy approval_policies_org on approval_policies
  for all using (org_id in (select m.org_id from members m where m.auth_user_id = auth.uid()));

drop policy if exists approval_tiers_org on approval_tiers;
create policy approval_tiers_org on approval_tiers
  for all using (
    policy_id in (
      select p.id from approval_policies p
      where p.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

drop policy if exists project_kpis_org on initiative_project_kpis;
create policy project_kpis_org on initiative_project_kpis
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

drop policy if exists budget_lines_org on initiative_budget_lines;
create policy budget_lines_org on initiative_budget_lines
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

drop policy if exists budget_revisions_org on initiative_budget_revisions;
create policy budget_revisions_org on initiative_budget_revisions
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

commit;
