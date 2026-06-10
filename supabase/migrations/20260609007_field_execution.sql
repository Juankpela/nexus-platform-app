-- FWX-1 — Field Execution Domain (ADR-020)
--
-- Introduces the Execution aggregate: the field reality of a visit, owned by the
-- technician. One execution per assignment. Connects to Scheduling/Work Orders
-- only by reference; state transitions emit domain events (recorded in the audit
-- trail as emission points — no event bus yet).
--
-- Security (per FWX-1 + authz audit):
--   * New granular permissions service.field.read / service.field.execute.
--   * REMOVES service.work_orders.write from the technician role (least privilege:
--     "execute, don't administer").
--   * technicians.user_id links a workforce record to an auth user, enabling
--     record-level scope (a technician only sees their own assignments/executions).

-- ── technicians.user_id (auth link for record-level scope) ───────────────────
alter table public.technicians
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- A given auth user maps to at most one (live) technician per tenant.
create unique index if not exists technicians_tenant_user_uidx
  on public.technicians (tenant_id, user_id)
  where user_id is not null and deleted_at is null;

-- ── Execution status enum ────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'execution_status') then
    create type public.execution_status as enum (
      'pending', 'accepted', 'on_site', 'working',
      'completed', 'unable_to_complete'
    );
  end if;
end
$$;

-- ── Work Order Executions (the Execution aggregate) ──────────────────────────
create table if not exists public.work_order_executions (
  id               uuid                    primary key default gen_random_uuid(),
  tenant_id        uuid                    not null references public.tenants(id) on delete cascade,
  assignment_id    uuid                    not null,
  work_order_id    uuid                    not null,
  technician_id    uuid                    not null,
  status           public.execution_status not null default 'pending',
  accepted_at      timestamptz,
  arrived_at       timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  resolution_notes text,
  unable_reason    text,
  created_at       timestamptz             not null default now(),
  updated_at       timestamptz             not null default now(),
  unique (id, tenant_id),
  unique (assignment_id),
  foreign key (assignment_id, tenant_id)
    references public.work_order_assignments (id, tenant_id) on delete cascade,
  foreign key (work_order_id, tenant_id)
    references public.work_orders (id, tenant_id) on delete cascade,
  foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete restrict
);

create index if not exists woe_tenant_tech_idx
  on public.work_order_executions (tenant_id, technician_id, status);
create index if not exists woe_tenant_wo_idx
  on public.work_order_executions (tenant_id, work_order_id);

drop trigger if exists work_order_executions_set_updated_at on public.work_order_executions;
create trigger work_order_executions_set_updated_at
  before update on public.work_order_executions
  for each row execute function public.set_updated_at();

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('service.field.read',    'View own field assignments and executions'),
  ('service.field.execute', 'Advance own field execution (accept→complete)')
on conflict (key) do nothing;

-- technician: read + execute (the field worker)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('service.field.read', 'service.field.execute')
where r.key = 'technician'
on conflict do nothing;

-- tenant_admin + supervisor: read + execute (oversight / preview / act on behalf)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('service.field.read', 'service.field.execute')
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

-- LEAST PRIVILEGE: technician no longer administers work orders.
delete from public.role_permissions
using public.roles r, public.permissions p
where public.role_permissions.role_id = r.id
  and public.role_permissions.permission_id = p.id
  and r.key = 'technician'
  and p.key = 'service.work_orders.write';

-- ── RLS — work_order_executions ──────────────────────────────────────────────
alter table public.work_order_executions enable row level security;

-- Read: the assigned technician (record-scoped) OR an oversight role.
drop policy if exists "woe_select_self" on public.work_order_executions;
create policy "woe_select_self" on public.work_order_executions
  for select to authenticated
  using (
    public.has_tenant_permission(tenant_id, 'service.field.read')
    and technician_id in (
      select t.id from public.technicians t
      where t.tenant_id = work_order_executions.tenant_id
        and t.user_id = auth.uid()
        and t.deleted_at is null
    )
  );

drop policy if exists "woe_select_oversight" on public.work_order_executions;
create policy "woe_select_oversight" on public.work_order_executions
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.work_orders.read'));

-- Write: only the assigned technician with execute permission.
drop policy if exists "woe_insert_self" on public.work_order_executions;
create policy "woe_insert_self" on public.work_order_executions
  for insert to authenticated
  with check (
    public.has_tenant_permission(tenant_id, 'service.field.execute')
    and technician_id in (
      select t.id from public.technicians t
      where t.tenant_id = work_order_executions.tenant_id
        and t.user_id = auth.uid()
        and t.deleted_at is null
    )
  );

drop policy if exists "woe_update_self" on public.work_order_executions;
create policy "woe_update_self" on public.work_order_executions
  for update to authenticated
  using (
    public.has_tenant_permission(tenant_id, 'service.field.execute')
    and technician_id in (
      select t.id from public.technicians t
      where t.tenant_id = work_order_executions.tenant_id
        and t.user_id = auth.uid()
        and t.deleted_at is null
    )
  )
  with check (
    public.has_tenant_permission(tenant_id, 'service.field.execute')
    and technician_id in (
      select t.id from public.technicians t
      where t.tenant_id = work_order_executions.tenant_id
        and t.user_id = auth.uid()
        and t.deleted_at is null
    )
  );
