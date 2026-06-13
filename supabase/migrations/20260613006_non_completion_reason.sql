-- Group 12 — Scheduling Engine, PR5A: structured non-completion reason (ADR-029)
--
-- Evolves the free-text unable_reason into a structured enum captured when a
-- technician reports `unable_to_complete`. It is the input to the disposition
-- policy (reason → disposition → next_action) that authorizes any future
-- auto-action. unable_reason stays as an optional free-text note.
--
-- Execution fact, owned by field-execution. Nullable (legacy executions / not
-- yet reported). Additive + idempotent. No new permissions/RLS — inherits the
-- existing work_order_executions policies.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'non_completion_reason') then
    create type public.non_completion_reason as enum (
      'customer_absent',
      'missing_skill',
      'missing_part',
      'access_denied',
      'weather',
      'customer_cancelled',
      'other'
    );
  end if;
end
$$;

alter table public.work_order_executions
  add column if not exists non_completion_reason public.non_completion_reason;
