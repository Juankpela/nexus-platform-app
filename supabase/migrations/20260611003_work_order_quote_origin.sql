-- E5 — Work Order desde Quote · Revenue Operations
--
-- Activates the Quote branch of the Work Order's polymorphic origin
-- (PRODUCT-VISION-FREEZE §4): a Work Order may originate from a Case (already) OR a
-- Quote (here). This is the seam that unites Sales → Service → Revenue: an accepted
-- Quote's service lines become a billable Work Order whose invoice carries the
-- pre-agreed prices.
--
-- Decision (2026-06-11): only SERVICE lines flow to the Work Order. PRODUCT lines of
-- a mixed quote wait for Sales Order (E6). No new table — quote_id is a column on
-- work_orders, consistent with case_id.

alter table public.work_orders
  add column if not exists quote_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'work_orders_quote_id_tenant_id_fkey'
  ) then
    alter table public.work_orders
      add constraint work_orders_quote_id_tenant_id_fkey
      foreign key (quote_id, tenant_id)
      references public.quotes (id, tenant_id) on delete set null;
  end if;
end
$$;

create index if not exists work_orders_quote_idx
  on public.work_orders (tenant_id, quote_id);
