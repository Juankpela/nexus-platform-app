-- Issue Catalog (PR-A): el tipo de daño elegido en el reporte guiado se guarda
-- ESTRUCTURADO en el caso (fuente de verdad junto a reported_skill_id), no como
-- texto incrustado en description. El texto libre pasa a ser contexto adicional.
-- El vocabulario controlado vive en skills.incident_types (catálogo por skill).
alter table public.cases
  add column if not exists incident_type text;

create index if not exists cases_skill_incident_idx
  on public.cases (reported_skill_id, incident_type);

comment on column public.cases.incident_type is
  'Tipo de daño elegido en el reporte guiado (del catálogo skills.incident_types). Fuente de verdad estructurada, no texto libre.';
