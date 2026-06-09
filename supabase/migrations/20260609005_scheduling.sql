-- Sprint 3 — Scheduling Core
--
-- Connects the Field Service chain at the time dimension:
--   Work Order -> Assignment -> Technician
--
-- A WorkOrderAssignment is an independent aggregate: it owns the scheduling
-- relationship (who, when, how long, status) without bloating work_orders.
-- This keeps the door open for a technician to have many assignments and for a
-- work order to be (re)assigned over time, and is the seed for Calendar,
-- Dispatch, Route Optimization and the future Scheduling Agent.
--
-- Tenant-isolated, RBAC-gated, audited. Idempotent.

-- ── Enum ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'assignment_status') then
    create type public.assignment_status as enum (
      'scheduled', 'in_progress', 'completed', 'cancelled'
    );
  end if;
end
$$;

-- ── Work Order Assignments ───────────────────────────────────────────────────
create table if not exists public.work_order_assignments (
  id                         uuid                      primary key default gen_random_uuid(),
  tenant_id                  uuid                      not null references public.tenants(id) on delete cascade,
  work_order_id              uuid                      not null,
  technician_id              uuid                      not null,
  scheduled_start            timestamptz               not null,
  scheduled_end              timestamptz               not null,
  estimated_duration_minutes integer                   not null check (estimated_duration_minutes > 0),
  status                     public.assignment_status  not null default 'scheduled',
  created_at                 timestamptz               not null default now(),
  updated_at                 timestamptz               not null default now(),
  unique (id, tenant_id),
  check (scheduled_end > scheduled_start),
  foreign key (work_order_id, tenant_id)
    references public.work_orders (id, tenant_id) on delete cascade,
  foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete restrict
);

create index if not exists woa_tenant_idx
  on public.work_order_assignments (tenant_id);
create index if not exists woa_tenant_technician_idx
  on public.work_order_assignments (tenant_id, technician_id);
create index if not exists woa_tenant_work_order_idx
  on public.work_order_assignments (tenant_id, work_order_id);
create index if not exists woa_tenant_start_idx
  on public.work_order_assignments (tenant_id, scheduled_start);
create index if not exists woa_tenant_status_idx
  on public.work_order_assignments (tenant_id, status);
-- Overlap-detection support: per technician, active assignments by time window.
create index if not exists woa_overlap_idx
  on public.work_order_assignments (tenant_id, technician_id, status, scheduled_start, scheduled_end);

drop trigger if exists work_order_assignments_set_updated_at on public.work_order_assignments;
create trigger work_order_assignments_set_updated_at
  before update on public.work_order_assignments
  for each row execute function public.set_updated_at();

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('service.scheduling.read',  'View work order assignments and schedule'),
  ('service.scheduling.write', 'Assign, reassign, and unassign work orders')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in ('service.scheduling.read', 'service.scheduling.write')
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'service.scheduling.read'
where r.key in ('sales_representative', 'technician')
on conflict do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.work_order_assignments enable row level security;

drop policy if exists "woa_select" on public.work_order_assignments;
create policy "woa_select" on public.work_order_assignments
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.scheduling.read'));

drop policy if exists "woa_insert" on public.work_order_assignments;
create policy "woa_insert" on public.work_order_assignments
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.scheduling.write'));

drop policy if exists "woa_update" on public.work_order_assignments;
create policy "woa_update" on public.work_order_assignments
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.scheduling.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.scheduling.write'));

drop policy if exists "woa_delete" on public.work_order_assignments;
create policy "woa_delete" on public.work_order_assignments
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.scheduling.write'));
