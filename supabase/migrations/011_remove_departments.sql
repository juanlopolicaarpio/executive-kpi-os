-- =============================================================================
-- 011 — Remove departments. KPIs belong to PEOPLE.
-- =============================================================================
-- Run AFTER 010.
--
-- Decision: Northstar has no department layer. A KPI is owned by exactly one
-- person, and that ownership is the only scoping concept the product needs.
--
-- This removes three things that only existed to serve a department model:
--   * members.department        — never populated, and now conceptually wrong
--   * initiatives.department    — inherited from the Master KPI's department
--   * active_kpis.scope_type/id — organization vs department vs team vs person
--
-- Scope collapses to two honest views:
--   Organization  → every KPI
--   My KPIs       → KPIs where owner_id = me
--
-- Approval routing loses its department hop and resolves through the reporting
-- line instead (members.manager_id), which is the relationship that actually
-- exists here.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Drop department columns
-- ---------------------------------------------------------------------------

drop index if exists members_department_idx;
drop index if exists initiatives_department_idx;
drop index if exists active_kpis_scope_idx;

alter table members     drop column if exists department;
alter table initiatives drop column if exists department;

-- Scope columns go with it. Ownership (owner_id) is the scoping concept now.
alter table active_kpis
  drop column if exists scope_type,
  drop column if exists scope_id;

-- ---------------------------------------------------------------------------
-- Approval tiers: resolve through the reporting line, not a department
-- ---------------------------------------------------------------------------

alter table approval_tiers drop column if exists scope_resolution;

-- 'department_head' no longer means anything. A tier now routes to the KPI
-- owner's manager, or to an executive, or to a named person.
alter table approval_tiers drop constraint if exists approval_tiers_approver_role_check;
update approval_tiers set approver_role = 'manager' where approver_role = 'department_head';
alter table approval_tiers
  add constraint approval_tiers_approver_role_check
  check (approver_role is null or approver_role in ('manager', 'executive', 'admin'));

-- ---------------------------------------------------------------------------
-- Reporting line — the relationship that replaces department for routing
-- ---------------------------------------------------------------------------
-- Everyone reports to the founder unless told otherwise. Without this, a tier
-- that routes to "the owner's manager" has nobody to resolve to and blocks
-- submission (§11.5 step 4), which would be correct but useless.

do $$
declare
  v_founder uuid;
begin
  select id into v_founder from members where role = 'founder' limit 1;
  if v_founder is null then return; end if;

  update members
  set manager_id = v_founder
  where manager_id is null
    and id <> v_founder;
end $$;

commit;
