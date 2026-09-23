-- =============================================================================
-- 012 — Real sign-in, invite-only, admin-assigned roles
-- =============================================================================
-- Run AFTER 011.
--
-- Access model: there is NO self-signup. An admin creates the person first
-- (email + role), and only then can that email sign in. Matching happens on
-- email at first login, which binds auth.users -> members.
--
-- The alternative — anyone with the URL creates an account and waits to be
-- assigned — means an unassigned stranger is already inside the tenant. For an
-- internal tool over real revenue data, invite-only is the right default.
-- =============================================================================

begin;

alter table members
  -- Cleared when someone is offboarded. Ownership history is preserved
  -- (§11.6 forbids deleting a user who owns records), so this is the off switch.
  add column if not exists is_active boolean not null default true,
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references members (id) on delete set null,
  add column if not exists last_seen_at timestamptz;

-- Email is the join key between auth.users and members, so it has to be unique
-- and comparable case-insensitively — "Ana@" and "ana@" must not be two people.
update members set email = lower(trim(email));

create unique index if not exists members_email_unique on members (lower(email));
create index if not exists members_active_idx on members (org_id) where is_active;

-- One auth user maps to at most one member.
create unique index if not exists members_auth_user_unique
  on members (auth_user_id) where auth_user_id is not null;

-- ---------------------------------------------------------------------------
-- Bind an authenticated user to their pre-created member row.
-- ---------------------------------------------------------------------------
-- Runs on first sign-in. SECURITY DEFINER so it can write members while the
-- caller holds only the anon role; the WHERE clause is what keeps it safe —
-- it can only ever claim a row whose email already matches and which is not
-- already bound to a different auth user.
create or replace function claim_member_for_auth_user(p_auth_user_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  update members
     set auth_user_id = p_auth_user_id,
         last_seen_at = now(),
         updated_at   = now()
   where lower(email) = lower(trim(p_email))
     and is_active
     and (auth_user_id is null or auth_user_id = p_auth_user_id)
  returning id into v_member_id;

  return v_member_id;  -- null means "not invited" — the caller denies access
end;
$$;

revoke all on function claim_member_for_auth_user(uuid, text) from public;
grant execute on function claim_member_for_auth_user(uuid, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Seed: make the founder an admin so there is someone who can invite others.
-- ---------------------------------------------------------------------------
-- Without this the first real sign-in has nobody able to manage users, and the
-- only way in is editing rows by hand.

do $$
declare
  v_founder uuid;
begin
  select id into v_founder from members where role = 'founder' order by created_at limit 1;
  if v_founder is null then return; end if;

  update members
  set invited_at = coalesce(invited_at, created_at),
      is_active  = true
  where invited_at is null;
end $$;

commit;
