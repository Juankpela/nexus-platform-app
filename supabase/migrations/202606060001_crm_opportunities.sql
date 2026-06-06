-- Group 7 — CRM Opportunity Management.
--
-- Opportunities always reference a company and a contact within a tenant.
-- Tenant-isolated, RBAC-gated via has_tenant_permission, audited at the
-- application layer. No DELETE (status lifecycle, incl. won/lost). Activities
-- gain an optional opportunity association for timeline integration.
-- Additive + idempotent.

-- Enums ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'opportunity_business_type') then
    create type public.opportunity_business_type as enum (
      'flexography', 'inks', 'consumables', 'consulting', 'machinery'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'opportunity_status') then
    create type public.opportunity_status as enum (
      'new', 'discovery', 'proposal', 'negotiation', 'won', 'lost'
    );
  end if;
end
$$;

-- Table ---------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null,
  contact_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  business_type public.opportunity_business_type not null,
  estimated_value numeric(14, 2),
  probability smallint not null default 0 check (probability between 0 and 100),
  status public.opportunity_status not null default 'new',
  expected_close_date date,
  owner_id uuid references auth.users(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete restrict,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete restrict
);

create index if not exists opportunities_tenant_idx
  on public.opportunities (tenant_id, status, name);
create index if not exists opportunities_company_idx
  on public.opportunities (tenant_id, company_id);
create index if not exists opportunities_contact_idx
  on public.opportunities (tenant_id, contact_id);
create index if not exists opportunities_owner_idx
  on public.opportunities (tenant_id, owner_id);

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute function public.set_updated_at();

-- Activity <-> opportunity association (timeline integration) ----------------
alter table public.activities add column if not exists opportunity_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_opportunity_id_tenant_id_fkey'
  ) then
    alter table public.activities
      add constraint activities_opportunity_id_tenant_id_fkey
      foreign key (opportunity_id, tenant_id)
      references public.opportunities (id, tenant_id) on delete cascade;
  end if;
end
$$;

create index if not exists activities_opportunity_idx
  on public.activities (tenant_id, opportunity_id, created_at desc);

-- Permissions ---------------------------------------------------------------
insert into public.permissions (key, description) values
  ('crm.opportunities.read', 'View CRM opportunities'),
  ('crm.opportunities.write', 'Create, edit, and progress CRM opportunities')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.key in ('crm.opportunities.read', 'crm.opportunities.write')
where role.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'crm.opportunities.read'
where role.key = 'supervisor'
on conflict do nothing;

-- Row level security --------------------------------------------------------
alter table public.opportunities enable row level security;

drop policy if exists "opportunities_select" on public.opportunities;
create policy "opportunities_select" on public.opportunities
for select to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.opportunities.read'));

drop policy if exists "opportunities_insert" on public.opportunities;
create policy "opportunities_insert" on public.opportunities
for insert to authenticated
with check (public.has_tenant_permission(tenant_id, 'crm.opportunities.write'));

drop policy if exists "opportunities_update" on public.opportunities;
create policy "opportunities_update" on public.opportunities
for update to authenticated
using (public.has_tenant_permission(tenant_id, 'crm.opportunities.write'))
with check (public.has_tenant_permission(tenant_id, 'crm.opportunities.write'));
