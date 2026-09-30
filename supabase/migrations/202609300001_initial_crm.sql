-- Orbit multi-tenant CRM foundation. Apply with the Supabase SQL editor or CLI.
create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_members m where m.workspace_id = target_workspace and m.user_id = (select auth.uid()))
$$;
revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, website text, industry text, owner_id uuid references auth.users(id), data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null, name text not null, email text, title text,
  owner_id uuid references auth.users(id), data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null, primary_contact_id uuid references public.contacts(id) on delete set null,
  name text not null, stage text not null default 'Discovery', amount numeric(14,2) not null default 0 check (amount >= 0),
  close_date date, owner_id uuid references auth.users(id), data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null, title text not null, due_at timestamptz,
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  assignee_id uuid references auth.users(id), created_by uuid references auth.users(id), data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.action_approvals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id), action_type text not null, payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','executing','completed','failed')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, idempotency_key text not null,
  result jsonb, created_at timestamptz not null default now(), unique(workspace_id, idempotency_key)
);
create table if not exists public.audit_events (
  id bigint generated always as identity primary key, workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id), event_type text not null, entity_type text, entity_id uuid,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null, external_connection_id text not null, connected_by uuid references auth.users(id),
  created_at timestamptz not null default now(), unique(workspace_id, provider, external_connection_id)
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.action_approvals enable row level security;
alter table public.audit_events enable row level security;
alter table public.integration_connections enable row level security;

create policy "members read own workspaces" on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy "members read membership" on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "member data access" on public.companies for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member data access" on public.contacts for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member data access" on public.deals for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member data access" on public.tasks for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member data access" on public.action_approvals for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member data access" on public.audit_events for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member data access" on public.integration_connections for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

grant select on public.workspaces, public.workspace_members to authenticated;
grant select, insert, update, delete on public.companies, public.contacts, public.deals, public.tasks, public.action_approvals, public.integration_connections to authenticated;
grant select, insert on public.audit_events to authenticated;

-- A new account starts with its own private workspace. No client-supplied workspace IDs are trusted.
create or replace function public.create_user_workspace()
returns trigger language plpgsql security definer set search_path = '' as $$
declare new_workspace uuid;
begin
  insert into public.workspaces(name) values (coalesce(nullif(new.raw_user_meta_data->>'workspace_name',''), split_part(new.email,'@',1) || '''s workspace')) returning id into new_workspace;
  insert into public.workspace_members(workspace_id,user_id,role) values (new_workspace,new.id,'owner');
  return new;
end
$$;
drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace after insert on auth.users for each row execute function public.create_user_workspace();
