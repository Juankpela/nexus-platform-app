-- Hito D — canal de confirmación al cliente. Email opcional del reportante para
-- cerrar el lazo en reportes web (que no tienen contacto CRM). Aditivo e
-- idempotente; nullable. La confirmación resuelve: reporter_email ?? contacto.email.
alter table public.cases
  add column if not exists reporter_email text;

comment on column public.cases.reporter_email is
  'Email opcional del reportante (intake público) para confirmar la visita (Hito D).';
