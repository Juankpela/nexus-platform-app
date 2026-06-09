-- Sprint 4 — Dispatch Board
--
-- Read-only operational console for dispatchers. No new tables: it aggregates
-- existing technicians + work_order_assignments. Per ADR-005, the heavy lifting
-- (SUM/COUNT/GROUP BY) happens in SQL, not in app memory.
--
-- Tenant isolation: the function is SECURITY INVOKER, so RLS on technicians and
-- work_order_assignments applies with the caller's identity; it also filters by
-- p_tenant_id. A caller needs service.technicians.read + service.scheduling.read
-- (already required by those tables' RLS) plus service.dispatch.read at the app layer.

-- ── Permission ───────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('service.dispatch.read', 'View the dispatch board')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'service.dispatch.read'
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

-- ── Aggregated workload per technician for a day window ───────────────────────
-- Returns ALL active (non-deleted) technicians, LEFT JOINed with their
-- time-blocking assignments (scheduled/in_progress) starting within [p_from, p_to).
create or replace function public.dispatch_technician_workload(
  p_tenant_id uuid,
  p_from      timestamptz,
  p_to        timestamptz
)
returns table (
  technician_id     uuid,
  first_name        text,
  last_name         text,
  status            public.technician_status,
  assignment_count  bigint,
  scheduled_minutes bigint
)
language sql
stable
as $$
  select
    t.id,
    t.first_name,
    t.last_name,
    t.status,
    count(a.id)                                       as assignment_count,
    coalesce(sum(a.estimated_duration_minutes), 0)    as scheduled_minutes
  from public.technicians t
  left join public.work_order_assignments a
    on  a.technician_id = t.id
    and a.tenant_id     = t.tenant_id
    and a.status in ('scheduled', 'in_progress')
    and a.scheduled_start >= p_from
    and a.scheduled_start <  p_to
  where t.tenant_id = p_tenant_id
    and t.deleted_at is null
  group by t.id, t.first_name, t.last_name, t.status
  order by t.last_name, t.first_name;
$$;

grant execute on function public.dispatch_technician_workload(uuid, timestamptz, timestamptz)
  to authenticated;
