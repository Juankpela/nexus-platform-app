-- Group 12 — Scheduling Engine, PR3B: Technician availability & capacity (ADR-027)
--
-- Constraint modeling only — NO eligibility/scoring/automation, NO timezone
-- resolution (that is PR4). Availability is stored TIMEZONE-NAIVE (wall-clock
-- minutes from local midnight); the tenant timezone is applied at evaluation.
-- Capacity is mostly emergent from the windows; only the explicit caps live on
-- technicians. The hardcoded 480 in dispatch is NOT rewired here (see ADR-027).
--
-- weekday: 0=domingo … 6=sábado (JS Date.getDay convention).

-- ── Weekly recurring availability windows ────────────────────────────────────
create table if not exists public.technician_availability (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  technician_id uuid        not null,
  weekday       smallint    not null check (weekday between 0 and 6),
  start_minute  smallint    not null check (start_minute between 0 and 1439),
  end_minute    smallint    not null check (end_minute between 1 and 1440),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_minute > start_minute),                 -- no overnight wrap in MVP
  unique (id, tenant_id),
  foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete cascade
);

create index if not exists technician_availability_idx
  on public.technician_availability (tenant_id, technician_id, weekday);

drop trigger if exists technician_availability_set_updated_at on public.technician_availability;
create trigger technician_availability_set_updated_at
  before update on public.technician_availability
  for each row execute function public.set_updated_at();

-- ── Availability exceptions (always BLOCK, override the weekly windows) ───────
create table if not exists public.technician_availability_exceptions (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  technician_id uuid        not null,
  date_from     date        not null,
  date_to       date        not null,
  start_minute  smallint,                            -- null = full day(s)
  end_minute    smallint,
  kind          text        not null check (kind in ('vacation','sick','permit','holiday','manual_block')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (date_to >= date_from),
  check ((start_minute is null) = (end_minute is null)),
  check (
    start_minute is null
    or (start_minute between 0 and 1439 and end_minute between 1 and 1440 and end_minute > start_minute)
  ),
  unique (id, tenant_id),
  foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete cascade
);

create index if not exists technician_availability_exc_idx
  on public.technician_availability_exceptions (tenant_id, technician_id, date_from, date_to);

drop trigger if exists tae_set_updated_at on public.technician_availability_exceptions;
create trigger tae_set_updated_at
  before update on public.technician_availability_exceptions
  for each row execute function public.set_updated_at();

-- ── Capacity caps (emergent time from windows; only explicit caps stored) ─────
alter table public.technicians
  add column if not exists max_work_orders_per_day smallint
    check (max_work_orders_per_day is null or max_work_orders_per_day > 0),
  add column if not exists max_minutes_per_day smallint
    check (max_minutes_per_day is null or (max_minutes_per_day between 1 and 1440));

-- ── RLS (reuses service.technicians.* — workforce master data) ───────────────
alter table public.technician_availability enable row level security;

drop policy if exists "ta_select" on public.technician_availability;
create policy "ta_select" on public.technician_availability
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "ta_insert" on public.technician_availability;
create policy "ta_insert" on public.technician_availability
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "ta_delete" on public.technician_availability;
create policy "ta_delete" on public.technician_availability
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

alter table public.technician_availability_exceptions enable row level security;

drop policy if exists "tae_select" on public.technician_availability_exceptions;
create policy "tae_select" on public.technician_availability_exceptions
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "tae_insert" on public.technician_availability_exceptions;
create policy "tae_insert" on public.technician_availability_exceptions
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "tae_delete" on public.technician_availability_exceptions;
create policy "tae_delete" on public.technician_availability_exceptions
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.write'));
