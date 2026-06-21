-- Reporte público guiado (categoría + tipo de daño) para coordinación determinista.
-- Reutiliza el catálogo de skills (mismo patrón que skills.aliases). Sin tablas nuevas.

-- Catálogo de "tipos de daño" frecuentes por skill (Paso 2 del reporte).
alter table public.skills
  add column if not exists incident_types text[] not null default '{}';

comment on column public.skills.incident_types is
  'Catálogo de tipos de daño frecuentes de la skill (Paso 2 del reporte público guiado).';

-- Categoría AUTORITATIVA elegida por el reportante (Paso 1). Vuelve determinista la
-- coordinación: el motor usa esta skill directo y el clasificador solo audita
-- discrepancias. Nullable: los casos previos siguen por clasificación de texto.
alter table public.cases
  add column if not exists reported_skill_id uuid;

create index if not exists cases_reported_skill_id_idx
  on public.cases (reported_skill_id);

comment on column public.cases.reported_skill_id is
  'Skill (categoría) elegida en el reporte público — categoría autoritativa para coordinación.';
