-- Group 12 — Scheduling Engine, PR3C: Workforce zones (geographic coverage)
--
-- Master data only: a tenant-configurable zone catalog and the technician↔zone
-- coverage relation. "Ubicación" / cobertura geográfica para el futuro matching
-- por zona (PR4) y routing (futuro). NO geometry (lat/long/polígonos) todavía —
-- zonas son etiquetas nombradas; la geo real llega cuando exista routing.
--
-- Hangs off technicians.id (ADR-026). Tenant-isolated, reuses service.technicians.*,
-- additive + idempotent. Mirrors the skills model (catalog + assignment) sin nivel.

create table if not exists public.service_zones (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  name        text        not null check (char_length(name) between 1 and 80),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id)
);

create unique index if not exists service_zones_tenant_name_uidx
  on public.service_zones (tenant_id, lower(name))
  where archived_at is null;
create index if not exists service_zones_tenant_idx
  on public.service_zones (tenant_id)
  where archived_at is null;

drop trigger if exists service_zones_set_updated_at on public.service_zones;
create trigger service_zones_set_updated_at
  before update on public.service_zones
  for each row execute function public.set_updated_at();

create table if not exists public.technician_zones (
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  technician_id uuid        not null,
  zone_id       uuid        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (tenant_id, technician_id, zone_id),
  foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete cascade,
  foreign key (zone_id, tenant_id)
    references public.service_zones (id, tenant_id) on delete restrict
);

create index if not exists technician_zones_zone_idx
  on public.technician_zones (tenant_id, zone_id);

drop trigger if exists technician_zones_set_updated_at on public.technician_zones;
create trigger technician_zones_set_updated_at
  before update on public.technician_zones
  for each row execute function public.set_updated_at();

-- ── RLS (reuses service.technicians.* — zones are workforce master data) ──────
alter table public.service_zones enable row level security;

drop policy if exists "service_zones_select" on public.service_zones;
create policy "service_zones_select" on public.service_zones
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "service_zones_insert" on public.service_zones;
create policy "service_zones_insert" on public.service_zones
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "service_zones_update" on public.service_zones;
create policy "service_zones_update" on public.service_zones
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.technicians.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

alter table public.technician_zones enable row level security;

drop policy if exists "technician_zones_select" on public.technician_zones;
create policy "technician_zones_select" on public.technician_zones
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "technician_zones_insert" on public.technician_zones;
create policy "technician_zones_insert" on public.technician_zones
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "technician_zones_delete" on public.technician_zones;
create policy "technician_zones_delete" on public.technician_zones
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.write'));
