-- Group 12 — Scheduling Engine, PR1: Work Order SLA deadline
--
-- A Work Order carries a commitment to finish by a point in time (the SLA
-- deadline). Today scheduled_start/scheduled_end describe *when work is planned*;
-- sla_due_at describes *when it must be done by*. They are different concepts:
-- a job can be scheduled inside its window yet still breach SLA if it slips.
--
-- This column is the single bloqueante for detecting overdue / at-risk work
-- orders. PR1 only stores it (manual entry); the deterministic scanner and
-- auto-reschedule land in later PRs and read this column.
--
-- Nullable on purpose: legacy WOs and non-SLA work have no deadline. The
-- classifier treats a null deadline as "no SLA" (never breaches).

alter table public.work_orders
  add column if not exists sla_due_at timestamptz;

-- Partial index sized for the overdue/at-risk scanner: it only ever queries
-- OPEN work orders that actually carry a deadline, so we keep the index small
-- and the (future) periodic scan cheap at thousands of WOs per tenant.
create index if not exists work_orders_tenant_sla_due_idx
  on public.work_orders (tenant_id, sla_due_at)
  where sla_due_at is not null
    and status not in ('completed', 'cancelled');

-- No new permissions or RLS: sla_due_at is a column of work_orders and inherits
-- its existing service.work_orders.read / .write policies unchanged.
