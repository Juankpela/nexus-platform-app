-- Group 12 — Scheduling Engine, PR2: Work Order alert dedup state
--
-- A deduplication CURSOR for the overdue scanner — NOT an alert engine, NOT a
-- log. Exactly one row exists per work order *while it is currently degraded*;
-- absence of a row means healthy / not-currently-alerted. It answers a single
-- question for the periodic scanner: "did I already emit a durable signal for
-- this WO, and at what severity tier?" so a daily cron does not re-emit every run.
--
-- Separation of concerns (see ADR-pending R5 / scheduling roadmap):
--   * audit_events           = durable, append-only TRACE ("what happened, when").
--   * work_order_alert_state = mutable coordination CURSOR (dedup), 0..1 row/WO.
--   The scanner READS this cursor to DECIDE whether to APPEND to audit. audit
--   never feeds scanner decisions.
--
-- Ownership: written ONLY by the scanner (service role, bypasses RLS). No other
-- use-case (reassign / reschedule / status change / SLA edit) touches it
-- synchronously — they let the next scan re-evaluate. Additive + idempotent.

create table if not exists public.work_order_alert_state (
  tenant_id              uuid        not null references public.tenants(id) on delete cascade,
  work_order_id          uuid        not null,
  last_alerted_severity  text        not null check (last_alerted_severity in ('warning', 'critical')),
  last_alerted_at        timestamptz not null,              -- last DURABLE emission (transition/escalation)
  created_at             timestamptz not null default now(),-- first degradation detected (cheap aging)
  updated_at             timestamptz not null default now(),-- any write (incl. severity downgrade w/o emit)
  primary key (tenant_id, work_order_id),
  foreign key (work_order_id, tenant_id)
    references public.work_orders (id, tenant_id) on delete cascade
);

-- No secondary index in MVP: the scanner only ever upserts/deletes by the exact
-- (tenant_id, work_order_id) point key, which the PK covers. The dispatch alert
-- card is computed live and does NOT read this table. A (tenant_id, severity)
-- index is added only when an oversight reader needs it.

drop trigger if exists work_order_alert_state_set_updated_at on public.work_order_alert_state;
create trigger work_order_alert_state_set_updated_at
  before update on public.work_order_alert_state
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.work_order_alert_state enable row level security;

-- SELECT only: tenant-isolated read for a future oversight/debug surface, gated
-- by the same permission as the rest of scheduling. Nothing in MVP depends on it.
drop policy if exists "woas_select" on public.work_order_alert_state;
create policy "woas_select" on public.work_order_alert_state
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'service.scheduling.read'));

-- No INSERT/UPDATE/DELETE policy for authenticated: only the scanner (service
-- role) transitions this state. Mirrors the export_jobs worker model (ADR-024).
