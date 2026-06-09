-- Group 11 — Service Cloud (Asset Management)
--
-- Assets are the central entity of the Field Service vertical:
--   Product (catalog model) -> Asset (physical unit) -> Case -> Work Order
--   -> Technician -> Scheduling
--
-- An Asset is a serialized physical unit installed at a customer company,
-- optionally an instance of a catalog Product, optionally a component of a
-- parent Asset (e.g. an anilox belongs to a printing press).
-- Tenant-isolated, RBAC-gated, audited at the application layer. Idempotent.
--
-- Field Service readiness:
--   * unique (id, tenant_id) so cases/work_orders reference (asset_id, tenant_id).
--   * parent_asset_id supports machine -> component hierarchy.
--   * criticality feeds Case priority; health_score + next_service_due_at feed
--     future Maintenance Plans WITHOUT a schema change.

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'asset_type') then
    create type public.asset_type as enum (
      'machinery', 'equipment', 'component', 'tool', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_category') then
    create type public.asset_category as enum (
      'printing', 'lamination', 'finishing', 'prepress',
      'tooling', 'auxiliary', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_status') then
    create type public.asset_status as enum (
      'active', 'in_maintenance', 'down', 'retired'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_criticality') then
    create type public.asset_criticality as enum (
      'low', 'medium', 'high', 'critical'
    );
  end if;
end
$$;

-- ── Atomic asset numbering ───────────────────────────────────────────────────
create table if not exists public.asset_sequences (
  tenant_id uuid    not null references public.tenants(id) on delete cascade,
  year      integer not null,
  last_seq  integer not null default 0,
  primary key (tenant_id, year)
);

create or replace function public.next_asset_number(p_tenant_id uuid)
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
  insert into public.asset_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = asset_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('AST-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

-- ── Assets ───────────────────────────────────────────────────────────────────
create table if not exists public.assets (
  id                  uuid                      primary key default gen_random_uuid(),
  tenant_id           uuid                      not null references public.tenants(id) on delete cascade,
  asset_number        text                      not null,
  name                text                      not null check (char_length(name) between 1 and 200),
  asset_type          public.asset_type         not null default 'machinery',
  asset_category      public.asset_category     not null default 'other',
  status              public.asset_status       not null default 'active',
  criticality         public.asset_criticality  not null default 'medium',
  health_score        integer                   check (health_score between 0 and 100),
  product_id          uuid,
  company_id          uuid,
  parent_asset_id     uuid,
  serial_number       text,
  manufacturer        text,
  model               text,
  location            text,
  installed_at        date,
  warranty_until      date,
  last_service_at     date,
  next_service_due_at date,
  purchase_cost       numeric(16, 2) check (purchase_cost is null or purchase_cost >= 0),
  notes               text,
  created_by          uuid                      references auth.users(id) on delete set null,
  created_at          timestamptz               not null default now(),
  updated_at          timestamptz               not null default now(),
  unique (tenant_id, asset_number),
  unique (id, tenant_id),
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete set null,
  foreign key (product_id, tenant_id)
    references public.products (id, tenant_id) on delete set null,
  foreign key (parent_asset_id, tenant_id)
    references public.assets (id, tenant_id) on delete set null
);

create index if not exists assets_tenant_status_idx
  on public.assets (tenant_id, status);
create index if not exists assets_tenant_category_idx
  on public.assets (tenant_id, asset_category);
create index if not exists assets_tenant_company_idx
  on public.assets (tenant_id, company_id);
create index if not exists assets_tenant_parent_idx
  on public.assets (tenant_id, parent_asset_id);
create index if not exists assets_tenant_service_due_idx
  on public.assets (tenant_id, next_service_due_at);

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- ── Case <-> Asset association (a case can originate from an asset) ───────────
alter table public.cases add column if not exists asset_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cases_asset_id_tenant_id_fkey'
  ) then
    alter table public.cases
      add constraint cases_asset_id_tenant_id_fkey
      foreign key (asset_id, tenant_id)
      references public.assets (id, tenant_id) on delete set null;
  end if;
end
$$;

create index if not exists cases_asset_idx
  on public.cases (tenant_id, asset_id);

-- ── Activity <-> asset association (asset service history) ────────────────────
alter table public.activities add column if not exists asset_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_asset_id_tenant_id_fkey'
  ) then
    alter table public.activities
      add constraint activities_asset_id_tenant_id_fkey
      foreign key (asset_id, tenant_id)
      references public.assets (id, tenant_id) on delete cascade;
  end if;
end
$$;

create index if not exists activities_asset_idx
  on public.activities (tenant_id, asset_id, created_at desc);

-- Extend the target-present check to include asset_id.
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
    );
end
$$;

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('service.assets.read',  'View service assets'),
  ('service.assets.write', 'Create, edit, and manage service assets')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('service.assets.read', 'service.assets.write')
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'service.assets.read'
where r.key in ('sales_representative', 'technician')
on conflict do nothing;

-- ── RLS — assets ─────────────────────────────────────────────────────────────
alter table public.assets enable row level security;

drop policy if exists "assets_select" on public.assets;
create policy "assets_select" on public.assets
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.assets.read'));

drop policy if exists "assets_insert" on public.assets;
create policy "assets_insert" on public.assets
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.assets.write'));

drop policy if exists "assets_update" on public.assets;
create policy "assets_update" on public.assets
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.assets.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.assets.write'));

-- ── RLS — asset_sequences ────────────────────────────────────────────────────
alter table public.asset_sequences enable row level security;

drop policy if exists "asset_sequences_all" on public.asset_sequences;
create policy "asset_sequences_all" on public.asset_sequences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.assets.write'));
