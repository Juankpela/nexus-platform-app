-- E2 — Work Order Facturable · Revenue Operations
--
-- FROZEN DECISION (2026-06-11): billability belongs to Work Order. No new entity,
-- no separate table — these are columns ON work_orders.
--   * billable: commercial attribute (independent of execution status). A WO from a
--     Case under warranty/contract stays false; a Case without coverage may be true;
--     a WO from a Quote is billable by default (set when E5 lands).
--   * billing_approved_at / billing_approved_by: the E2-H3 approval checkpoint. A
--     billable, completed WO must be approved (by a billing role) before an invoice
--     can be generated from it.
--
-- Permission model: setting `billable` is a Service action (service.work_orders.write,
-- the coordinator). Approving for billing reuses the back-office billing permission
-- (billing.invoices.write). The work_orders UPDATE policy is widened to allow either,
-- mirroring the coarse-RLS / fine-presentation gate used by invoices in E1.

-- ── Columns ──────────────────────────────────────────────────────────────────
alter table public.work_orders
  add column if not exists billable boolean not null default false;

alter table public.work_orders
  add column if not exists billing_approved_at timestamptz;

alter table public.work_orders
  add column if not exists billing_approved_by uuid references auth.users(id) on delete set null;

create index if not exists work_orders_billable_idx
  on public.work_orders (tenant_id, billable, status);

-- ── Widen UPDATE policy to allow the billing role to approve ──────────────────
-- (Setting `billable` uses service.work_orders.write; approving uses
-- billing.invoices.write. The precise per-field gate is enforced in presentation.)
drop policy if exists "work_orders_update" on public.work_orders;
create policy "work_orders_update" on public.work_orders
  for update to authenticated
  using  (
    public.has_tenant_permission(tenant_id, 'service.work_orders.write') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.write')
  )
  with check (
    public.has_tenant_permission(tenant_id, 'service.work_orders.write') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.write')
  );
