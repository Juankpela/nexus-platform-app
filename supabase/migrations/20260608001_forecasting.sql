-- ─────────────────────────────────────────────────────────────────────────────
-- Forecasting & Revenue Analytics
-- Tables: forecast_snapshots, sales_quotas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.forecast_period_type as enum ('month', 'quarter', 'year');
exception when duplicate_object then null; end $$;

-- ── forecast_snapshots ────────────────────────────────────────────────────────
create table if not exists public.forecast_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  snapshot_date        date not null default current_date,
  period_type          public.forecast_period_type not null,
  period_label         text not null,            -- e.g. '2026-Q2', '2026-06'
  expected_revenue     numeric(16, 2) not null default 0,
  weighted_revenue     numeric(16, 2) not null default 0,
  closed_won_revenue   numeric(16, 2) not null default 0,
  closed_lost_revenue  numeric(16, 2) not null default 0,
  open_count           integer not null default 0,
  won_count            integer not null default 0,
  lost_count           integer not null default 0,
  win_rate             numeric(5, 2) not null default 0,
  avg_deal_size        numeric(16, 2),
  pipeline_coverage    numeric(6, 2),            -- weighted / quota * 100
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (id, tenant_id)
);

create index if not exists forecast_snapshots_tenant_date_idx
  on public.forecast_snapshots (tenant_id, snapshot_date desc);

-- ── sales_quotas ──────────────────────────────────────────────────────────────
create table if not exists public.sales_quotas (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  owner_id      uuid references auth.users(id) on delete cascade,  -- null = team quota
  period_type   public.forecast_period_type not null,
  period_label  text not null,
  quota_amount  numeric(16, 2) not null check (quota_amount >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, owner_id, period_type, period_label)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.forecast_snapshots enable row level security;
alter table public.sales_quotas       enable row level security;

drop policy if exists "forecast_snapshots_read"  on public.forecast_snapshots;
drop policy if exists "forecast_snapshots_write" on public.forecast_snapshots;
drop policy if exists "sales_quotas_read"        on public.sales_quotas;
drop policy if exists "sales_quotas_write"       on public.sales_quotas;

create policy "forecast_snapshots_read" on public.forecast_snapshots
  for select using (public.has_tenant_permission(tenant_id, 'forecasting.snapshots.read'));

create policy "forecast_snapshots_write" on public.forecast_snapshots
  for insert with check (public.has_tenant_permission(tenant_id, 'forecasting.snapshots.write'));

create policy "sales_quotas_read" on public.sales_quotas
  for select using (public.has_tenant_permission(tenant_id, 'forecasting.read'));

create policy "sales_quotas_write" on public.sales_quotas
  for all using (public.has_tenant_permission(tenant_id, 'forecasting.write'));

-- ── Permissions ───────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('forecasting.read',             'View forecasting dashboard and analytics'),
  ('forecasting.write',            'Manage sales quotas'),
  ('forecasting.snapshots.read',   'View forecast snapshots'),
  ('forecasting.snapshots.write',  'Create forecast snapshots')
on conflict (key) do nothing;

-- tenant_admin → all forecasting permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key = 'tenant_admin'
  and p.key like 'forecasting.%'
on conflict do nothing;

-- supervisor → read + snapshots read/write
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'forecasting.read',
  'forecasting.snapshots.read',
  'forecasting.snapshots.write'
)
where r.key = 'supervisor'
on conflict do nothing;

-- sales_representative → read only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'forecasting.read'
where r.key = 'sales_representative'
on conflict do nothing;
