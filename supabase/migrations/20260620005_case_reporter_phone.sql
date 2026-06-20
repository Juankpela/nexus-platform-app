-- Teléfono del reportante estructurado, para entrega por WhatsApp (Nivel 1:
-- enlaces wa.me). Hoy el teléfono solo vive en el texto de la descripción del
-- caso; lo sacamos a una columna para poder construir el enlace de aviso al
-- cliente sin parsear texto. Aditiva + idempotente + nullable (compatibilidad).
alter table public.cases
  add column if not exists reporter_phone text;

comment on column public.cases.reporter_phone is
  'WhatsApp/teléfono del reportante (reporte público). Usado para el aviso al cliente por WhatsApp.';
