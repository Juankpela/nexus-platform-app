-- NEXUS — Issue Catalog estructurado (Pilar 1, decisión del founder 2026-06-20).
--
-- Los "tipos de daño" dejan de ser un array text[] dentro de skills y pasan a ser
-- una ENTIDAD propia, multi-tenant, colgada de la skill. Esto habilita: orden,
-- descripción, activar/desactivar, FK desde cases, historial por tipo de daño y
-- (luego) catálogo de servicios por tipo. Plataforma agnóstica a la industria:
-- cada tenant construye su propio catálogo sin seeds ni intervención técnica.
--
-- Aditiva + idempotente + compatible hacia atrás:
--   * NO se elimina skills.incident_types (queda como legacy/denormalizado).
--   * NO se elimina cases.incident_type (etiqueta legible legacy).
--   * Backfill desde skills.incident_types[] para no perder catálogos existentes.
-- Mismo patrón de skills: tenant-isolated, RLS por service.technicians.*,
-- composite FK tenant-safe, trigger set_updated_at.

-- ── Tabla ────────────────────────────────────────────────────────────────────
create table if not exists public.service_issue_types (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  skill_id      uuid        not null,
  name          text        not null check (char_length(name) between 1 and 120),
  description   text,
  active        boolean     not null default true,
  display_order integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, tenant_id),                                   -- tenant-safe FK target
  -- Cada issue type pertenece a UNA skill del MISMO tenant (cascade al archivar
  -- no aplica: skills usa soft-archive; el borrado real de una skill sí cascada).
  foreign key (skill_id, tenant_id)
    references public.skills (id, tenant_id) on delete cascade
);

-- Nombre único por skill entre los activos; un nombre inactivo puede re-crearse.
create unique index if not exists service_issue_types_skill_name_uidx
  on public.service_issue_types (tenant_id, skill_id, lower(name))
  where active;

-- Lookup del reporte guiado: tipos activos de una skill en orden de despliegue.
create index if not exists service_issue_types_skill_idx
  on public.service_issue_types (tenant_id, skill_id, display_order)
  where active;

drop trigger if exists service_issue_types_set_updated_at on public.service_issue_types;
create trigger service_issue_types_set_updated_at
  before update on public.service_issue_types
  for each row execute function public.set_updated_at();

-- ── RLS (reusa service.technicians.* — es master data operacional) ────────────
alter table public.service_issue_types enable row level security;

drop policy if exists "service_issue_types_select" on public.service_issue_types;
create policy "service_issue_types_select" on public.service_issue_types
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "service_issue_types_insert" on public.service_issue_types;
create policy "service_issue_types_insert" on public.service_issue_types
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "service_issue_types_update" on public.service_issue_types;
create policy "service_issue_types_update" on public.service_issue_types
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.technicians.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));
-- Sin DELETE: se desactiva (active=false), nunca se borra un tipo referenciado.

-- ── cases.issue_type_id (fuente de verdad estructurada, junto a reported_skill_id) ─
alter table public.cases
  add column if not exists issue_type_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cases_issue_type_id_fkey'
  ) then
    alter table public.cases
      add constraint cases_issue_type_id_fkey
      foreign key (issue_type_id, tenant_id)
      references public.service_issue_types (id, tenant_id) on delete set null;
  end if;
end
$$;

create index if not exists cases_issue_type_idx
  on public.cases (issue_type_id)
  where issue_type_id is not null;

comment on column public.cases.issue_type_id is
  'Tipo de daño estructurado elegido en el reporte (FK a service_issue_types). Fuente de verdad junto a reported_skill_id; cases.incident_type queda como etiqueta legacy.';

-- ── Backfill: no perder los catálogos que ya existen en skills.incident_types ──
-- Cada elemento del array se vuelve una fila, preservando el orden del array.
insert into public.service_issue_types (tenant_id, skill_id, name, display_order)
select s.tenant_id, s.id, trim(elem.name), elem.ord
from public.skills s
cross join lateral unnest(s.incident_types) with ordinality as elem(name, ord)
where s.incident_types is not null
  and array_length(s.incident_types, 1) is not null
  and length(trim(elem.name)) > 0
on conflict do nothing;

-- Re-vincular casos existentes que ya tenían incident_type como texto: si el texto
-- coincide (case-insensitive) con un issue type de su skill reportada, enlazarlo.
update public.cases c
set issue_type_id = sit.id
from public.service_issue_types sit
where c.issue_type_id is null
  and c.reported_skill_id is not null
  and c.incident_type is not null
  and sit.tenant_id = c.tenant_id
  and sit.skill_id = c.reported_skill_id
  and lower(sit.name) = lower(trim(c.incident_type));
