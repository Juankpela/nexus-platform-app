-- Historial de resultados por técnico (PR-B). REUSA work_order_executions (no
-- crea tablas): es el registro autoritativo de cada ejecución de campo. Devuelve,
-- por técnico del tenant, su récord de cumplimiento — la materia prima para que el
-- motor desempate por desempeño (outcome > tiempo) y para mostrar credibilidad.
--
-- Mismo patrón que tenant_users_with_permission: function SECURITY DEFINER con
-- search_path pinneado y grants explícitos. Aditiva + idempotente.
create or replace function public.technician_outcomes(p_tenant_id uuid)
returns table (
  technician_id uuid,
  completed_count bigint,
  unable_count bigint,
  resolved_count bigint,
  -- completados / resueltos (0..1). null si el técnico aún no resolvió nada.
  success_rate numeric,
  -- minutos promedio en sitio (started_at → completed_at) en trabajos completados.
  avg_work_minutes numeric,
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
    count(*) filter (where execution.status = 'unable_to_complete') as unable_count,
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
    avg(
      extract(epoch from (execution.completed_at - execution.started_at)) / 60.0
    ) filter (
      where execution.status = 'completed'
        and execution.started_at is not null
        and execution.completed_at is not null
    ) as avg_work_minutes,
    max(execution.completed_at) filter (
      where execution.status = 'completed'
    ) as last_completed_at
  from public.work_order_executions execution
  where execution.tenant_id = p_tenant_id
    and execution.technician_id is not null
  group by execution.technician_id;
$$;

revoke all on function public.technician_outcomes(uuid) from public;
grant execute on function public.technician_outcomes(uuid)
  to authenticated, service_role;
