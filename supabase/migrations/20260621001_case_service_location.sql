-- ETA Operacional — Fase 2: ubicación del servicio de PRIMERA CLASE en cases.
--
-- Hasta ahora la ubicación reportada vivía como texto libre dentro de
-- `cases.description` ("Dónde: ..."), a veces con una URL de Maps. Eso obligaba a
-- parsear con regex y dejaba sin destino fiable a la mayoría de los casos.
--
-- A partir del intake público con GPS OBLIGATORIO, cada case nuevo guarda
-- coordenadas estructuradas, listas para Google Directions (origen técnico →
-- destino cliente) sin parsear texto. Columnas ADITIVAS y NULLABLE: los casos
-- históricos quedan en NULL (sin backfill); el motor de ETA sólo opera cuando hay
-- coordenadas. NO es una tabla nueva — coherente con la regla del roadmap.

alter table public.cases
  add column if not exists service_lat     double precision,
  add column if not exists service_lng     double precision,
  add column if not exists service_address text,
  add column if not exists location_source text;

comment on column public.cases.service_lat is
  'Latitud del sitio del servicio (destino para el ETA). NULL en casos previos al GPS obligatorio.';
comment on column public.cases.service_lng is
  'Longitud del sitio del servicio (destino para el ETA).';
comment on column public.cases.service_address is
  'Dirección/área legible escrita por quien reporta (referencia humana; complementa las coords).';
comment on column public.cases.location_source is
  'Procedencia de las coordenadas: gps | geocoded | manual.';

-- Validaciones de rango y de dominio (guardadas para idempotencia).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cases_service_lat_range'
  ) then
    alter table public.cases
      add constraint cases_service_lat_range
      check (service_lat is null or (service_lat between -90 and 90));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cases_service_lng_range'
  ) then
    alter table public.cases
      add constraint cases_service_lng_range
      check (service_lng is null or (service_lng between -180 and 180));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cases_location_source_valid'
  ) then
    alter table public.cases
      add constraint cases_location_source_valid
      check (location_source is null or location_source in ('gps', 'geocoded', 'manual'));
  end if;
end
$$;

-- Índice parcial: sólo casos con coordenadas (los que el motor de ETA puede usar).
create index if not exists cases_service_geo_idx
  on public.cases (tenant_id)
  where service_lat is not null and service_lng is not null;
