-- Hito B — Tenant Skill Aliases (recall del despacho autónomo, ADR-033).
-- Vocabulario PROPIO del tenant por skill. Aditivo e idempotente. No hay
-- catálogo global: los aliases pertenecen a la fila skills del tenant, ya
-- aislada por RLS (tenant_id). Sin tabla nueva.
alter table public.skills
  add column if not exists aliases text[] not null default '{}';

comment on column public.skills.aliases is
  'Vocabulario del tenant para reconocer esta skill en texto libre (Hito B). Propiedad del tenant; nunca global.';
