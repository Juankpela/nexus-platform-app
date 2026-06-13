-- Group 12 — Scheduling Engine, PR3A: Workforce skills (capability modeling)
--
-- Master data only: a tenant-configurable skill catalog and the technician↔skill
-- relation with a level. NO eligibility / matching / scoring / automation here —
-- that is PR4. The ordinal skill_level enum exists so PR4 can express
-- "nivel ≥ requerido" without a later migration.
--
-- Hangs off technicians.id (ADR-026: scheduling/workforce identity is the
-- technician aggregate, never auth.users). Tenant-isolated, RBAC-gated (reuses
-- service.technicians.*), additive + idempotent.

-- ── Enum ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'skill_level') then
    create type public.skill_level as enum ('junior', 'mid', 'senior', 'expert');
  end if;
end
$$;

-- ── Skill catalog ────────────────────────────────────────────────────────────
create table if not exists public.skills (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  name        text        not null check (char_length(name) between 1 and 80),
  archived_at timestamptz,                       -- soft-archive: never hard-delete a referenced skill
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id)                          -- tenant-safe composite FK target
);

-- Unique name per tenant among active (non-archived) skills; an archived name can be reused.
create unique index if not exists skills_tenant_name_uidx
  on public.skills (tenant_id, lower(name))
  where archived_at is null;
create index if not exists skills_tenant_idx
  on public.skills (tenant_id)
  where archived_at is null;

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

-- ── Technician ↔ skill (with level) ──────────────────────────────────────────
create table if not exists public.technician_skills (
  tenant_id     uuid              not null references public.tenants(id) on delete cascade,
  technician_id uuid              not null,
  skill_id      uuid              not null,
  level         public.skill_level not null default 'mid',
  created_at    timestamptz       not null default now(),
  updated_at    timestamptz       not null default now(),
  primary key (tenant_id, technician_id, skill_id),         -- one level per (tech, skill)
  foreign key (technician_id, tenant_id)
    references public.technicians (id, tenant_id) on delete cascade,
  foreign key (skill_id, tenant_id)
    references public.skills (id, tenant_id) on delete restrict  -- can't drop a skill in use
);

create index if not exists technician_skills_skill_idx
  on public.technician_skills (tenant_id, skill_id);

drop trigger if exists technician_skills_set_updated_at on public.technician_skills;
create trigger technician_skills_set_updated_at
  before update on public.technician_skills
  for each row execute function public.set_updated_at();

-- ── RLS (reuses service.technicians.* — skills are workforce master data) ─────
alter table public.skills enable row level security;

drop policy if exists "skills_select" on public.skills;
create policy "skills_select" on public.skills
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "skills_insert" on public.skills;
create policy "skills_insert" on public.skills
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "skills_update" on public.skills;
create policy "skills_update" on public.skills
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.technicians.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));
-- No DELETE policy: skills are archived (an update), never hard-deleted.

alter table public.technician_skills enable row level security;

drop policy if exists "technician_skills_select" on public.technician_skills;
create policy "technician_skills_select" on public.technician_skills
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.read'));

drop policy if exists "technician_skills_insert" on public.technician_skills;
create policy "technician_skills_insert" on public.technician_skills
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "technician_skills_update" on public.technician_skills;
create policy "technician_skills_update" on public.technician_skills
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'service.technicians.write'))
  with check (public.has_tenant_permission(tenant_id, 'service.technicians.write'));

drop policy if exists "technician_skills_delete" on public.technician_skills;
create policy "technician_skills_delete" on public.technician_skills
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.technicians.write'));
