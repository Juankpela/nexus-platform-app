-- Token público no adivinable para el seguimiento del cliente.
-- El folio (REP-...) es secuencial y por tanto enumerable: no sirve como única
-- llave de una página pública. Este token (uuid) viaja en el link que el cliente
-- recibe por correo y permite ver la "línea de vida" de su solicitud sin login.
alter table public.cases
  add column if not exists tracking_token uuid not null default gen_random_uuid();

create unique index if not exists cases_tracking_token_idx
  on public.cases (tracking_token);

comment on column public.cases.tracking_token is
  'Token público no adivinable para la página de seguimiento del cliente (/seguimiento/[token]).';
