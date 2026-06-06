-- Group 6 — CRM Activity Management.
--
-- Activities are logged against a company and/or a contact within a tenant.
-- Tenant-isolated, RBAC-gated via has_tenant_permission, audited at the
-- application layer. No DELETE (status lifecycle only). Additive + idempotent.

-- Enums ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type public.activity_type as enum (
      'call', 'email', 'meeting', 'task', 'note', 'whatsapp'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'activity_status') then
    create type public.activity_status as enum ('open', 'completed');
  end if;
end
$$;

-- contacts needs a composite unique key to be referenced by a composite FK
-- (companies already has one).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contacts_id_tenant_key'
  ) then
    alter table public.contacts
      add constraint contacts_id_tenant_key unique (id, tenant_id);
  end if;
end
$$;

-- Table ---------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type public.activity_type not null,
  subject text not null check (char_length(subject) between 1 and 200),
  body text,
  company_id uuid,
  contact_id uuid,
  status public.activity_status not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An activity must reference at least a company or a contact.
  constraint activities_target_present
    check (company_id is not null or contact_id is not null),
  -- Same-tenant integrity for both optional relationships.
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete cascade,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete cascade
);

-- Indexes -------------------------------------------------------------------
create index if not exists activities_company_idx
  on public.activities (tenant_id, company_id, created_at desc);
create index if not exists activities_contact_idx
  on public.activities (tenant_id, contact_id, created_at desc);
create index if not exists activities_status_idx
  on public.activities (tenant_id, status);

-- updated_at trigger --------------------------------------------------------
drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at before update on public.activities
for each row execute function public.set_updated_at();

-- Permissions ---------------------------------------------------------------
insert into public.permissions (key, description) values
  ('crm.activities.read', 'View CRM activities'),
  ('crm.activities.write', 'Create, edit, and complete CRM activities')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in ('crm.activities.read', 'crm.activities.write')
where role.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'crm.activities.read'
where role.key = 'supervisor'
on conflict do nothing;

-- Row level security --------------------------------------------------------
alter table public.activities enable row level security;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
for select to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.activities.read'));

drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert" on public.activities
for insert to authenticated
with check (public.has_tenant_permission(tenant_id, 'crm.activities.write'));

drop policy if exists "activities_update" on public.activities;
create policy "activities_update" on public.activities
for update to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.activities.write'))
with check (public.has_tenant_permission(tenant_id, 'crm.activities.write'));
