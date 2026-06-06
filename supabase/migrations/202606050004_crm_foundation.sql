-- Group 5 — CRM Foundation: companies and contacts.
--
-- First business domain on top of the foundation. Tenant-isolated, RBAC-gated
-- via has_tenant_permission, audited at the application layer. No DELETE is
-- permitted (deactivation only). Additive and idempotent.

-- Shared status enum for CRM records (active / inactive — no hard delete).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'crm_record_status') then
    create type public.crm_record_status as enum ('active', 'inactive');
  end if;
end
$$;

-- 1. Tables -----------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  tax_id text,
  industry text,
  website text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  notes text,
  status public.crm_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Enables the composite foreign key used by contacts to enforce same-tenant.
  unique (id, tenant_id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid,
  first_name text not null check (char_length(first_name) between 1 and 120),
  last_name text,
  email text,
  phone text,
  mobile text,
  title text,
  department text,
  notes text,
  status public.crm_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A contact's company must belong to the same tenant.
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete set null
);

-- 2. Indexes ----------------------------------------------------------------
create index if not exists companies_tenant_idx
  on public.companies (tenant_id, status, name);
create index if not exists contacts_tenant_idx
  on public.contacts (tenant_id, status, last_name, first_name);
create index if not exists contacts_company_idx
  on public.contacts (company_id);

-- 3. updated_at triggers (reuse foundation function) ------------------------
drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts
for each row execute function public.set_updated_at();

-- 4. Permissions ------------------------------------------------------------
insert into public.permissions (key, description) values
  ('crm.companies.read', 'View CRM companies'),
  ('crm.companies.write', 'Create and edit CRM companies'),
  ('crm.contacts.read', 'View CRM contacts'),
  ('crm.contacts.write', 'Create and edit CRM contacts')
on conflict (key) do nothing;

-- tenant_admin and sales_representative: full CRM read+write
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in (
    'crm.companies.read', 'crm.companies.write',
    'crm.contacts.read', 'crm.contacts.write'
  )
where role.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

-- supervisor: CRM read only
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in ('crm.companies.read', 'crm.contacts.read')
where role.key = 'supervisor'
on conflict do nothing;

-- 5. Row level security -----------------------------------------------------
alter table public.companies enable row level security;
alter table public.contacts enable row level security;

drop policy if exists "companies_select" on public.companies;
create policy "companies_select" on public.companies
for select to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.companies.read'));

drop policy if exists "companies_insert" on public.companies;
create policy "companies_insert" on public.companies
for insert to authenticated
with check (public.has_tenant_permission(tenant_id, 'crm.companies.write'));

drop policy if exists "companies_update" on public.companies;
create policy "companies_update" on public.companies
for update to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.companies.write'))
with check (public.has_tenant_permission(tenant_id, 'crm.companies.write'));

drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts
for select to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.contacts.read'));

drop policy if exists "contacts_insert" on public.contacts;
create policy "contacts_insert" on public.contacts
for insert to authenticated
with check (public.has_tenant_permission(tenant_id, 'crm.contacts.write'));

drop policy if exists "contacts_update" on public.contacts;
create policy "contacts_update" on public.contacts
for update to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.contacts.write'))
with check (public.has_tenant_permission(tenant_id, 'crm.contacts.write'));
