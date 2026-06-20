-- Nombre del reportante estructurado. Hoy solo vive en el texto de la descripción
-- del caso; lo sacamos a columna para poder crear un "cliente exprés" con un
-- nombre legible cuando el técnico marca el trabajo como facturable (no hay
-- vínculo solicitud↔cliente hasta ese momento). Aditiva + idempotente + nullable.
alter table public.cases
  add column if not exists reporter_name text;

comment on column public.cases.reporter_name is
  'Nombre del reportante (reporte público). Usado para crear el cliente exprés al facturar.';
