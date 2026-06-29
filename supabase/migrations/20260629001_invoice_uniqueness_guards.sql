-- P0-2 — Candado anti-doble-factura a nivel de base de datos
--
-- Problema: la prevención de "una sola factura activa por Work Order / por Quote"
-- vivía SOLO en la aplicación (findActiveByWorkOrder / findActiveByQuote, un
-- read-then-write). Bajo concurrencia (p.ej. el técnico marca facturable mientras
-- el coordinador genera la factura desde el detalle de la WO) ambas rutas pasan el
-- chequeo y crean DOS facturas para el mismo origen → el cliente recibe dos
-- facturas fiscales por un mismo servicio.
--
-- Fix: índice único PARCIAL que el motor garantiza atómicamente. Excluye 'void'
-- para permitir refacturar tras anular, y exige el id de origen no nulo (un origen
-- por factura ya lo garantiza invoices_origin_chk).
--
-- Reversible: `drop index` lo revierte sin pérdida de datos.

-- ── Guard de pre-condición: abortar con mensaje claro si ya hubiera duplicados ──
-- (si existieran, crear el índice fallaría con un error críptico; preferimos un
--  mensaje accionable que diga exactamente qué resolver antes de aplicar).
do $$
declare
  v_wo_dupes    integer;
  v_quote_dupes integer;
begin
  select count(*) into v_wo_dupes from (
    select tenant_id, work_order_id
    from public.invoices
    where work_order_id is not null and status <> 'void'
    group by tenant_id, work_order_id
    having count(*) > 1
  ) d;

  select count(*) into v_quote_dupes from (
    select tenant_id, quote_id
    from public.invoices
    where quote_id is not null and status <> 'void'
    group by tenant_id, quote_id
    having count(*) > 1
  ) d;

  if v_wo_dupes > 0 or v_quote_dupes > 0 then
    raise exception
      'P0-2: existen facturas activas duplicadas (% por work_order, % por quote). '
      'Anula (void) las duplicadas antes de aplicar el candado de unicidad.',
      v_wo_dupes, v_quote_dupes;
  end if;
end
$$;

-- ── Una sola factura activa por Work Order ─────────────────────────────────────
create unique index if not exists invoices_one_active_per_work_order
  on public.invoices (tenant_id, work_order_id)
  where work_order_id is not null and status <> 'void';

-- ── Una sola factura activa por Quote ──────────────────────────────────────────
create unique index if not exists invoices_one_active_per_quote
  on public.invoices (tenant_id, quote_id)
  where quote_id is not null and status <> 'void';
