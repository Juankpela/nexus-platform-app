-- FWX-1A — Execution Core reconciliation (ADR-022)
--
-- Additive, non-destructive refinement of the Execution aggregate shipped in
-- FWX-1 (20260609007_field_execution.sql). The FWX-1A spec called for an explicit
-- `unable_to_complete_at` timestamp; FWX-1 inferred failure from `completed_at IS
-- NULL` + `unable_reason`. We add the dedicated column for reporting fidelity
-- (time-to-failure, abandonment analytics) without renaming the table or touching
-- existing data.
--
-- NOTHING is dropped or renamed: the table stays `work_order_executions`, all
-- prior columns, RLS policies, permissions and the /worker area are untouched.

alter table public.work_order_executions
  add column if not exists unable_to_complete_at timestamptz;
