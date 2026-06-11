-- Revenue Operations Alignment — Invoice origin: replace Sales Order with Quote
--
-- FROZEN DECISION (2026-06-11): Sales Order is removed from Nexus entirely. An
-- Invoice originates ONLY from a Work Order (service sold / service request) or a
-- Quote (product sale). Never from Case, Opportunity or Lead.
--
-- This migration makes `sales_order` disappear from the model:
--   * adds `quote_id` (+ composite FK to quotes) to invoices,
--   * drops the reserved `sales_order_id` column,
--   * recreates the `invoice_origin_type` enum as ('work_order','quote'),
--   * replaces the origin CHECK accordingly.
-- Safe because `sales_order` was never implemented (no rows use it).
--
-- Idempotent: keyed on the presence of the legacy `sales_order_id` column.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'sales_order_id'
  ) then
    -- Drop the old origin CHECK (references sales_order_id).
    alter table public.invoices drop constraint if exists invoices_origin_chk;

    -- Add the Quote origin column + composite FK.
    alter table public.invoices add column if not exists quote_id uuid;
    if not exists (
      select 1 from pg_constraint where conname = 'invoices_quote_id_tenant_id_fkey'
    ) then
      alter table public.invoices
        add constraint invoices_quote_id_tenant_id_fkey
        foreign key (quote_id, tenant_id)
        references public.quotes (id, tenant_id) on delete set null;
    end if;

    -- Remove the reserved Sales Order column.
    alter table public.invoices drop column sales_order_id;

    -- Recreate the enum without 'sales_order'.
    alter type public.invoice_origin_type rename to invoice_origin_type_old;
    create type public.invoice_origin_type as enum ('work_order', 'quote');
    alter table public.invoices
      alter column origin_type type public.invoice_origin_type
      using origin_type::text::public.invoice_origin_type;
    drop type public.invoice_origin_type_old;

    -- New origin CHECK: exactly one origin id, matching origin_type.
    alter table public.invoices
      add constraint invoices_origin_chk check (
        (origin_type = 'work_order' and work_order_id is not null and quote_id is null) or
        (origin_type = 'quote'      and quote_id is not null and work_order_id is null)
      );

    create index if not exists invoices_quote_idx
      on public.invoices (tenant_id, quote_id);
  end if;
end
$$;
