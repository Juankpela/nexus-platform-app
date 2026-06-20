-- NEXUS — Historial de resultados POR TIPO DE DAÑO (Pilares 2 y 3).
--
-- "¿Cuántos 'No enfría' ha resuelto este técnico, y con qué éxito?" — la materia
-- prima para que la recomendación explique la decisión con experiencia REAL
-- (no scores inventados) y para que el motor pondere quién resuelve mejor CADA
-- tipo de problema. Reusa work_order_executions + cases (issue_type_id). Sin
-- tablas nuevas. Mismo patrón SECURITY DEFINER + search_path pinneado + grants.
create or replace function public.technician_issue_type_outcomes(
  p_tenant_id uuid,
  p_issue_type_id uuid
)
returns table (
  technician_id uuid,
  completed_count bigint,
  resolved_count bigint,
  success_rate numeric,
  last_completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    execution.technician_id,
    count(*) filter (where execution.status = 'completed') as completed_count,
    count(*) filter (
      where execution.status in ('completed', 'unable_to_complete')
    ) as resolved_count,
    case
      when count(*) filter (
        where execution.status in ('completed', 'unable_to_complete')
      ) > 0
      then round(
        count(*) filter (where execution.status = 'completed')::numeric
        / count(*) filter (
          where execution.status in ('completed', 'unable_to_complete')
        ),
        4
      )
      else null
    end as success_rate,
    max(execution.completed_at) filter (
      where execution.status = 'completed'
    ) as last_completed_at
  from public.work_order_executions execution
  join public.cases kase
    on kase.work_order_id = execution.work_order_id
   and kase.tenant_id = execution.tenant_id
  where execution.tenant_id = p_tenant_id
    and kase.issue_type_id = p_issue_type_id
    and execution.technician_id is not null
  group by execution.technician_id;
$$;

revoke all on function public.technician_issue_type_outcomes(uuid, uuid) from public;
grant execute on function public.technician_issue_type_outcomes(uuid, uuid)
  to authenticated, service_role;
