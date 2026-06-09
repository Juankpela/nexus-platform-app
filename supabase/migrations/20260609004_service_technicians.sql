-- Sprint 2 — Field Service (Technicians)
--
-- Technicians are the workforce of the Field Service vertical. Base for:
--   Work Order Assignment -> Scheduling -> Dispatch -> Route Optimization
--
-- A technician is a tenant-scoped workforce record (distinct from an auth user;
-- a future migration may link technician.user_id -> auth.users for mobile login).
-- Soft delete only (deleted_at). Tenant-isolated, RBAC-gated, audited. Idempotent.
--
-- Field Service readiness (no refactor later):
--   * unique (id, tenant_id) so skills/certifications/territories/work_orders
--     reference (technician_id, tenant_id) with a tenant-safe composite FK.
--   * soft delete keeps history intact for assigned work orders.

-- ── Enum ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'technician_status') then
    create type public.technician_status as enum ('active', 'inactive', 'on_leave');
  end if;
end
$$;

-- ── Technicians ──────────────────────────────────────────────────────────────
create table if not exists public.technicians (
  id          uuid                      primary key default gen_random_uuid(),
  tenant_id   uuid                      not null references public.tenants(id) on delete cascade,
  first_name  text                      not null check (char_length(first_name) between 1 and 100),
  last_name   text                      not null check (char_length(last_name) between 1 and 100),
  email       text                      not null check (char_length(email) between 3 and 200),
  phone       text,
  employee_id text,
  status      public.technician_status  not null default 'active',
  created_at  timestamptz               not null default now(),
  updated_at  timestamptz               not null default now(),
  deleted_at  timestamptz,
  unique (id, tenant_id)
);

-- Uniqueness scoped to tenant AND to non-deleted rows (soft delete friendly):
-- a deactivated technician's email/employee_id can be reused.
create unique index if not exists technicians_tenant_email_uidx
  on public.technicians (tenant_id, lower(email))
  where deleted_at is null;
create unique index if not exists technicians_tenant_employee_uidx
  on public.technicians (tenant_id, employee_id)
  where deleted_at is null and employee_id is not null;

create index if not exists technicians_tenant_status_idx
  on public.technicians (tenant_id, status)
  where deleted_at is null;
create index if not exists technicians_tenant_name_idx
  on public.technicians (tenant_id, last_name, first_name)
  where deleted_at is null;

drop trigger if exists technicians_set_updated_at on public.technicians;
create trigger technicians_set_updated_at
  before update on public.technicians
  for each row execute function public.set_updated_at();

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('service.technicians.read',  'View field service technicians'),
  ('service.technicians.write', 'Create, edit, and deactivate technicians')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in ('service.technicians.read', 'service.technicians.write')
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'service.technicians.read'
where r.key in ('sales_representative', 'technician')
on conflict do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.technicians enable row level security;

drop policy if exists "technicians_select" on public.technicians;
create policy "technicians_select" on public.technicians
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "technicians_insert" on public.technicians;
create policy "technicians_insert" on public.technicians
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "technicians_update" on public.technicians;
create policy "technicians_update" on public.technicians
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.technicians.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));
