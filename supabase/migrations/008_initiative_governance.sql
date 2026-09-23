-- =============================================================================
-- 008 — Initiative governance: blocking approval gate, separate reviewer,
--       progress updates, and a decision audit trail
-- =============================================================================
-- Supersedes the non-blocking model in 007. Per PRD §11.4 the state machine is
-- now:
--
--   Draft → Pending Approval → Approved → Active → Completed
--         → Results Submitted → Under Review → Closed
--   (+ Rejected, Cancelled)
--
-- Execution CANNOT begin until an approver approves and the owner starts.
--
-- Per PRD §12.1 separation of duty: the owner may be neither the approver nor
-- the results reviewer. Enforced by CHECK constraints so it holds even if an
-- API route forgets.
--
-- Public-release reference migration. Apply only to a disposable local/demo project.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Status enum: replaced wholesale rather than ALTER TYPE ... ADD VALUE, which
-- cannot be used in the same transaction that references the new values.
-- ---------------------------------------------------------------------------

create type initiative_status_new as enum (
  'draft',
  'pending_approval',
  'approved',
  'active',
  'completed',
  'results_submitted',
  'under_review',
  'closed',
  'rejected',
  'cancelled'
);

-- 007 created a PARTIAL index whose predicate (`where status = 'active'`) is
-- bound to the old enum type. Postgres rebuilds index predicates during the
-- column retype and the stored literal still resolves to the old type, failing
-- with "operator does not exist: initiative_status_new = initiative_status".
--
-- It is dropped rather than recreated: it indexed `endorsement`, which the
-- blocking approval gate replaces. The `endorsement` column itself is left in
-- place — it is NOT NULL with a default, so it costs nothing, and dropping a
-- column is not reversible if this model ever needs revisiting.
drop index if exists initiatives_endorsement_idx;

alter table initiatives alter column status drop default;
alter table initiatives
  alter column status type initiative_status_new
  using status::text::initiative_status_new;
alter table initiatives alter column status set default 'draft';

drop type initiative_status;
alter type initiative_status_new rename to initiative_status;

-- ---------------------------------------------------------------------------
-- Governance columns
-- ---------------------------------------------------------------------------

alter table initiatives
  -- The results reviewer, distinct from the approver (PRD §12.4).
  add column if not exists reviewer_id uuid references members (id) on delete set null,
  -- Manual progress only — never inferred from KPI movement (PRD §7.4).
  add column if not exists progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  add column if not exists latest_update_at timestamptz,
  add column if not exists currency text not null default 'PHP',
  add column if not exists submitted_for_approval_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists cancellation_reason text;

-- Separation of duty (PRD §12.1). NOT VALID would let existing rows slip
-- through; there are none worth preserving that violate this.
alter table initiatives
  add constraint initiatives_owner_not_approver_ck
    check (approver_id is null or owner_id is null or approver_id <> owner_id),
  add constraint initiatives_owner_not_reviewer_ck
    check (reviewer_id is null or owner_id is null or reviewer_id <> owner_id);

create index if not exists initiatives_reviewer_idx on initiatives (reviewer_id);
create index if not exists initiatives_pending_idx on initiatives (org_id)
  where status = 'pending_approval';

-- ---------------------------------------------------------------------------
-- initiative_updates — progress updates on active work (PRD §7.4)
-- ---------------------------------------------------------------------------

create table if not exists initiative_updates (
  id               uuid primary key default gen_random_uuid(),
  initiative_id    uuid not null references initiatives (id) on delete cascade,
  author_id        uuid references members (id) on delete set null,
  progress_percent integer not null check (progress_percent between 0 and 100),
  note             text not null,
  is_blocked       boolean not null default false,
  blocker_note     text,
  created_at       timestamptz not null default now()
);

create index if not exists initiative_updates_initiative_idx
  on initiative_updates (initiative_id, created_at desc);

-- ---------------------------------------------------------------------------
-- initiative_approvals — the decision audit trail (PRD §12.4)
-- ---------------------------------------------------------------------------

create table if not exists initiative_approvals (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives (id) on delete cascade,
  -- 'approval' = the pre-execution gate; 'review' = the results review.
  stage         text not null check (stage in ('approval', 'review')),
  actor_id      uuid references members (id) on delete set null,
  decision      text not null check (decision in ('approved', 'rejected', 'revision_requested')),
  comment       text,
  created_at    timestamptz not null default now()
);

create index if not exists initiative_approvals_initiative_idx
  on initiative_approvals (initiative_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Keep the close guard from 007 aligned with the new status name.
-- Nothing reaches 'closed' without submitted + reviewed results.
-- ---------------------------------------------------------------------------

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

-- Mirror the progress/update timestamp onto the initiative so list views do
-- not need a join to show "last updated".
create or replace function touch_initiative_from_update() returns trigger
language plpgsql as $$
begin
  update initiatives
     set progress_percent = new.progress_percent,
         latest_update_at = new.created_at
   where id = new.initiative_id;
  return new;
end;
$$;

drop trigger if exists initiative_updates_touch_parent on initiative_updates;
create trigger initiative_updates_touch_parent
  after insert on initiative_updates
  for each row execute function touch_initiative_from_update();

-- ---------------------------------------------------------------------------
-- RLS, consistent with 007
-- ---------------------------------------------------------------------------

alter table initiative_updates   enable row level security;
alter table initiative_approvals enable row level security;

drop policy if exists initiative_updates_org_member on initiative_updates;
create policy initiative_updates_org_member on initiative_updates
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

drop policy if exists initiative_approvals_org_member on initiative_approvals;
create policy initiative_approvals_org_member on initiative_approvals
  for all using (
    initiative_id in (
      select i.id from initiatives i
      where i.org_id in (select m.org_id from members m where m.auth_user_id = auth.uid())
    )
  );

commit;
