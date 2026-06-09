-- Group 10 — Service Cloud (Cases)
--
-- Cases: customer service tickets linked to a company + contact within a tenant.
-- Foundation for the future Service + Field Service vertical:
--   Case -> Work Order -> Technician -> Scheduling
-- Tenant-isolated, RBAC-gated via has_tenant_permission, audited at the
-- application layer. Additive + idempotent.
--
-- Design notes for Field Service readiness:
--   * owner_id references auth.users — a technician is just a user with the
--     'technician' role, so no schema change is needed to assign work later.
--   * work_order_id is a nullable placeholder WITHOUT a foreign key (the
--     work_orders table does not exist yet). The FK is added additively in the
--     Work Orders migration.
--   * unique (id, tenant_id) lets future tables reference (case_id, tenant_id)
--     with a tenant-safe composite FK.
--   * sla_due_at is stored as an absolute timestamp so SLA pause logic
--     (Waiting Customer) can be layered on later without a model change.

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type public.case_status as enum (
      'new',
      'working',
      'waiting_customer',
      'escalated',
      'resolved',
      'closed'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'case_priority') then
    create type public.case_priority as enum ('low', 'medium', 'high', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'case_origin') then
    create type public.case_origin as enum (
      'phone', 'email', 'whatsapp', 'web', 'manual'
    );
  end if;
end
$$;

-- ── Atomic case numbering (concurrency-safe, per tenant per year) ─────────────
create table if not exists public.case_sequences (
  tenant_id uuid    not null references public.tenants(id) on delete cascade,
  year      integer not null,
  last_seq  integer not null default 0,
  primary key (tenant_id, year)
);

create or replace function public.next_case_number(p_tenant_id uuid)
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
  insert into public.case_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = case_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('CASE-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

-- ── Cases ────────────────────────────────────────────────────────────────────
create table if not exists public.cases (
  id            uuid                  primary key default gen_random_uuid(),
  tenant_id     uuid                  not null references public.tenants(id) on delete cascade,
  case_number   text                  not null,
  subject       text                  not null check (char_length(subject) between 1 and 200),
  description   text,
  status        public.case_status    not null default 'new',
  priority      public.case_priority  not null default 'medium',
  origin        public.case_origin    not null default 'manual',
  company_id    uuid,
  contact_id    uuid,
  owner_id      uuid                  references auth.users(id) on delete set null,
  -- Field Service placeholder: FK added in the Work Orders migration.
  work_order_id uuid,
  sla_due_at    timestamptz,
  resolved_at   timestamptz,
  closed_at     timestamptz,
  created_by    uuid                  references auth.users(id) on delete set null,
  created_at    timestamptz           not null default now(),
  updated_at    timestamptz           not null default now(),
  unique (tenant_id, case_number),
  unique (id, tenant_id),
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

comment on column public.cases.work_order_id is
  'Placeholder for the future Field Service Work Orders module. FK added additively later.';

create index if not exists cases_tenant_status_idx
  on public.cases (tenant_id, status);
create index if not exists cases_tenant_priority_idx
  on public.cases (tenant_id, priority);
create index if not exists cases_tenant_owner_idx
  on public.cases (tenant_id, owner_id);
create index if not exists cases_tenant_sla_idx
  on public.cases (tenant_id, sla_due_at);
create index if not exists cases_company_idx
  on public.cases (tenant_id, company_id);

drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- ── Activity <-> case association (timeline integration) ──────────────────────
alter table public.activities add column if not exists case_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_case_id_tenant_id_fkey'
  ) then
    alter table public.activities
      add constraint activities_case_id_tenant_id_fkey
      foreign key (case_id, tenant_id)
      references public.cases (id, tenant_id) on delete cascade;
  end if;
end
$$;

create index if not exists activities_case_idx
  on public.activities (tenant_id, case_id, created_at desc);

-- Relax the target-present check so an activity may reference ANY of:
-- company, contact, opportunity, or case (Field Service readiness).
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
    );
end
$$;

-- ── Permissions (service.* namespace — foundation for Field Service) ──────────
insert into public.permissions (key, description) values
  ('service.cases.read',  'View service cases'),
  ('service.cases.write', 'Create, edit, assign, and progress service cases')
on conflict (key) do nothing;

-- tenant_admin and supervisor: read + write
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('service.cases.read', 'service.cases.write')
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

-- sales_representative and technician: read-only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'service.cases.read'
where r.key in ('sales_representative', 'technician')
on conflict do nothing;

-- ── RLS — cases ──────────────────────────────────────────────────────────────
alter table public.cases enable row level security;

drop policy if exists "cases_select" on public.cases;
create policy "cases_select" on public.cases
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.cases.read'));

drop policy if exists "cases_insert" on public.cases;
create policy "cases_insert" on public.cases
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.cases.write'));

drop policy if exists "cases_update" on public.cases;
create policy "cases_update" on public.cases
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.cases.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.cases.write'));

-- ── RLS — case_sequences ─────────────────────────────────────────────────────
alter table public.case_sequences enable row level security;

drop policy if exists "case_sequences_all" on public.case_sequences;
create policy "case_sequences_all" on public.case_sequences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.cases.write'));
