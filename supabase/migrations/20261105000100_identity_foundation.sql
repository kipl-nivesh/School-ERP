-- PREPARED ONLY. Never applied by Step 13. Review against an empty target before use.
-- No users, credentials, Super Admin grants, school records or permissive policies.
begin;

create table public.roles (
  code text primary key check (code in ('admin', 'teacher', 'student', 'parent', 'accountant'))
);
insert into public.roles (code) values ('admin'), ('teacher'), ('student'), ('parent'), ('accountant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  account_status text not null default 'invited' check (account_status in ('invited', 'active', 'suspended', 'disabled')),
  credential_reset_required boolean not null default true,
  authorization_version bigint not null default 1 check (authorization_version > 0),
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role_code text not null references public.roles(code),
  membership_status text not null default 'revoked' check (membership_status in ('active', 'revoked')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  unique (profile_id, role_code),
  unique (id, profile_id, role_code),
  check (valid_until is null or valid_until > valid_from)
);

create table public.admin_privileges (
  profile_id uuid primary key,
  role_code text not null default 'admin' check (role_code = 'admin'),
  tier text not null check (tier = 'super_admin'),
  privilege_status text not null default 'pending' check (privilege_status in ('pending', 'active', 'revoked')),
  privilege_version bigint not null default 1 check (privilege_version > 0),
  foreign key (profile_id, role_code) references public.user_roles(profile_id, role_code) on delete restrict
);

create table public.role_contexts (
  id uuid primary key, -- genuine provider session_id; not a caller-selected role cookie
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role_code text not null references public.roles(code),
  assignment_id uuid not null,
  context_version bigint not null default 1 check (context_version > 0),
  authorization_version bigint not null check (authorization_version > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  foreign key (assignment_id, profile_id, role_code) references public.user_roles(id, profile_id, role_code) on delete restrict
);
create index role_contexts_profile_idx on public.role_contexts (profile_id, expires_at);

alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.admin_privileges enable row level security;
alter table public.admin_privileges force row level security;
alter table public.role_contexts enable row level security;
alter table public.role_contexts force row level security;

-- Intentionally ZERO allowing policies. Revoking grants adds another default-deny boundary.
revoke all on table public.roles, public.profiles, public.user_roles,
  public.admin_privileges, public.role_contexts from public, anon, authenticated;

-- Do not add a self-update policy, auto-provision trigger, security-definer helper or
-- Super Admin bootstrap here. No app operation is enabled by this migration.
commit;
