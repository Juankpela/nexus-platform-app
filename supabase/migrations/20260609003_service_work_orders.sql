-- Group 11 — Service Cloud (Work Orders / Field Service Core)
--
-- A Work Order is a real technical intervention on an asset, derived from a
-- case. Completes the Field Service chain:
--   Product -> Asset -> Case -> Work Order -> Technician -> Scheduling
--
-- Tenant-isolated, RBAC-gated, audited at the application layer. Idempotent.
--
-- Future-module readiness (no refactor needed later):
--   * assigned_technician_id -> auth.users (a technician is a user with the
--     'technician' role); Scheduling/Route-planning read scheduled_* windows.
--   * unique (id, tenant_id) so future parts_consumption / mobile sync tables
--     reference (work_order_id, tenant_id) with a tenant-safe composite FK.

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'work_order_status') then
    create type public.work_order_status as enum (
      'new', 'scheduled', 'dispatched', 'in_progress',
      'on_hold', 'completed', 'cancelled'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'work_order_priority') then
    create type public.work_order_priority as enum (
      'low', 'medium', 'high', 'critical'
    );
  end if;
end
$$;

-- ── Atomic work-order numbering ──────────────────────────────────────────────
create table if not exists public.work_order_sequences (
  tenant_id uuid    not null references public.tenants(id) on delete cascade,
  year      integer not null,
  last_seq  integer not null default 0,
  primary key (tenant_id, year)
);

create or replace function public.next_work_order_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_seq  integer;
begin
  v_year := extract(year from now())::integer;
  insert into public.work_order_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = work_order_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('WO-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

-- ── Work Orders ──────────────────────────────────────────────────────────────
create table if not exists public.work_orders (
  id                    uuid                       primary key default gen_random_uuid(),
  tenant_id             uuid                       not null references public.tenants(id) on delete cascade,
  work_order_number     text                       not null,
  company_id            uuid,
  case_id               uuid,
  asset_id              uuid,
  assigned_technician_id uuid                      references auth.users(id) on delete set null,
  subject               text                       not null check (char_length(subject) between 1 and 200),
  description           text,
  priority              public.work_order_priority not null default 'medium',
  status                public.work_order_status   not null default 'new',
  scheduled_start       timestamptz,
  scheduled_end         timestamptz,
  actual_start          timestamptz,
  actual_end            timestamptz,
  labor_hours           numeric(8, 2) check (labor_hours is null or labor_hours >= 0),
  resolution_summary    text,
  completion_notes      text,
  created_by            uuid                       references auth.users(id) on delete set null,
  created_at            timestamptz                not null default now(),
  updated_at            timestamptz                not null default now(),
  unique (tenant_id, work_order_number),
  unique (id, tenant_id),
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete set null,
  foreign key (case_id, tenant_id)
    references public.cases (id, tenant_id) on delete set null,
  foreign key (asset_id, tenant_id)
    references public.assets (id, tenant_id) on delete set null
);

create index if not exists work_orders_tenant_status_idx
  on public.work_orders (tenant_id, status);
create index if not exists work_orders_tenant_priority_idx
  on public.work_orders (tenant_id, priority);
create index if not exists work_orders_tenant_tech_idx
  on public.work_orders (tenant_id, assigned_technician_id);
create index if not exists work_orders_tenant_company_idx
  on public.work_orders (tenant_id, company_id);
create index if not exists work_orders_case_idx
  on public.work_orders (tenant_id, case_id);
create index if not exists work_orders_asset_idx
  on public.work_orders (tenant_id, asset_id, created_at desc);
create index if not exists work_orders_scheduled_idx
  on public.work_orders (tenant_id, scheduled_start);

drop trigger if exists work_orders_set_updated_at on public.work_orders;
create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

-- ── Activity <-> work-order association (intervention timeline) ───────────────
alter table public.activities add column if not exists work_order_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_work_order_id_tenant_id_fkey'
  ) then
    alter table public.activities
      add constraint activities_work_order_id_tenant_id_fkey
      foreign key (work_order_id, tenant_id)
      references public.work_orders (id, tenant_id) on delete cascade;
  end if;
end
$$;

create index if not exists activities_work_order_idx
  on public.activities (tenant_id, work_order_id, created_at desc);

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'activities_target_present'
  ) then
    alter table public.activities drop constraint activities_target_present;
  end if;
  alter table public.activities
    add constraint activities_target_present
    check (
      company_id is not null
      or contact_id is not null
      or opportunity_id is not null
      or case_id is not null
      or asset_id is not null
      or work_order_id is not null
    );
end
$$;

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('service.work_orders.read',  'View work orders'),
  ('service.work_orders.write', 'Create, edit, assign, and progress work orders')
on conflict (key) do nothing;

-- tenant_admin, supervisor and technician get full access (technicians execute work)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in ('service.work_orders.read', 'service.work_orders.write')
where r.key in ('tenant_admin', 'supervisor', 'technician')
on conflict do nothing;

-- sales_representative gets read-only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'service.work_orders.read'
where r.key = 'sales_representative'
on conflict do nothing;

-- ── RLS — work_orders ────────────────────────────────────────────────────────
alter table public.work_orders enable row level security;

drop policy if exists "work_orders_select" on public.work_orders;
create policy "work_orders_select" on public.work_orders
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.work_orders.read'));

drop policy if exists "work_orders_insert" on public.work_orders;
create policy "work_orders_insert" on public.work_orders
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.work_orders.write'));

drop policy if exists "work_orders_update" on public.work_orders;
create policy "work_orders_update" on public.work_orders
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.work_orders.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.work_orders.write'));

-- ── RLS — work_order_sequences ───────────────────────────────────────────────
alter table public.work_order_sequences enable row level security;

drop policy if exists "work_order_sequences_all" on public.work_order_sequences;
create policy "work_order_sequences_all" on public.work_order_sequences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.work_orders.write'));
