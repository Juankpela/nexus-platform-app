# ADR-015 — Scheduling Core (Work Order Assignments)

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** Sprint 3
- **Relates:** ADR-014 (Technicians), Work Orders (Group 11)

## Context

Field Service necesita conectar Work Orders con Technicians en la dimensión de
**tiempo**: quién hace qué, cuándo y por cuánto. Hasta ahora, `work_orders` tenía
`assigned_technician_id` + `scheduled_start/end` como atributos planos, lo que no
soporta historial de reasignaciones, múltiples asignaciones, ni validación de
disponibilidad del técnico.

## Decision

Crear un **agregado independiente** `WorkOrderAssignment` en un módulo nuevo
`modules/scheduling`, siguiendo la arquitectura hexagonal.

### Por qué Assignment es un agregado independiente
- Una asignación tiene su propio ciclo de vida y estado (`scheduled → in_progress →
  completed/cancelled`) distinto del de la Work Order.
- Permite que un técnico tenga **muchas** asignaciones y que una orden se
  **reasigne** en el tiempo sin perder trazabilidad.
- Evita inflar `work_orders` con lógica de calendario; separa el "qué" (orden) del
  "cuándo/quién" (asignación). Es el patrón de Salesforce FSM (ServiceAppointment).

### Por qué se valida overlap en el dominio
- La regla "un técnico no puede tener dos asignaciones superpuestas" es una **regla
  de negocio**, no un detalle de infraestructura. Vive como función pura
  `rangesOverlap()` en `domain/` (testeable sin DB) y como verificación previa
  `findOverlapping()` en el use-case.
- Se usa intervalo **semiabierto** `[start, end)`: 09:00–11:00 y 11:00–12:00 NO
  solapan (bordes contiguos válidos).
- La consulta de solape solo considera estados que bloquean tiempo
  (`scheduled`, `in_progress`); completadas/canceladas liberan el slot.

### Aislamiento multi-tenant
- Todas las validaciones reciben `tenantId` del contexto; los lookups de WO y
  técnico (`getById`) filtran por tenant, así que una referencia cross-tenant
  simplemente "no existe" → error `NOT_FOUND`. Imposible asignar entre tenants.
- FKs compuestas `(work_order_id, tenant_id)` y `(technician_id, tenant_id)`
  refuerzan la integridad de tenant en el motor.

### Desacoplamiento entre módulos
- Scheduling no depende de los repositorios completos de service: define **reader
  ports** mínimos (`TechnicianReader`, `WorkOrderReader`). La composición adapta
  los repos existentes (que estructuralmente los satisfacen). Así el dominio de
  scheduling no conoce detalles de Cases/Assets/Work Orders.

## Preparación para sprints futuros (sin rediseño)

- **Calendar:** `scheduled_start/end` + `status` + índice por `(tenant, start)`
  alimentan directamente una vista de calendario/timeline (drag & drop reescribe
  vía `reassignWorkOrder`).
- **Dispatch:** `status='scheduled'` → `dispatched/in_progress` se modela como
  transición de asignación; el "despacho" es un cambio de estado + notificación.
- **Notifications:** los eventos de auditoría (`assignment.created/reassigned/
  deleted`) son los disparadores naturales cuando exista el bus de eventos
  (ADR-001/003).
- **Route Optimization:** múltiples asignaciones por técnico/día ya son consultables;
  añadir geolocalización a Technicians/Assets habilita el ruteo sin tocar este modelo.
- **Scheduling Agent / AI Forecasting:** `findOverlapping` y `getStats`
  (utilization) son las primitivas que un agente usará para proponer slots; la IA
  consumirá las mismas reglas de dominio.

## Consequences

**Positivas**
- Validación de disponibilidad real (no doble-booking).
- Historial de (re)asignaciones; soft business rules (técnico activo).
- Base limpia para Calendar/Dispatch/Routing/AI.
- 9 use-case tests nuevos; CI verde (tsc + lint + test).

**Negativas / deuda aceptada**
- Convive con `work_orders.assigned_technician_id/scheduled_*` (legado). Un sprint
  futuro deberá decidir si esos campos se derivan de la asignación "primaria" o se
  deprecan. No se migra ahora para no romper datos/UX existentes.
- `getStats.utilizationRate` es completadas/total (proxy); la utilización real por
  capacidad horaria llegará con el módulo de capacidad/turnos.

## Database

```sql
type assignment_status = ('scheduled','in_progress','completed','cancelled')

table work_order_assignments (
  id, tenant_id,
  work_order_id, technician_id,
  scheduled_start, scheduled_end, estimated_duration_minutes,
  status, created_at, updated_at,
  unique (id, tenant_id),
  check (scheduled_end > scheduled_start),
  fk (work_order_id, tenant_id) -> work_orders,
  fk (technician_id, tenant_id) -> technicians
)
-- indexes: tenant; (tenant,technician); (tenant,work_order); (tenant,start);
--          (tenant,status); overlap (tenant,technician,status,start,end)
-- RLS: select/insert/update/delete gated by has_tenant_permission(service.scheduling.*)
```

## Auditoría
`assignment.created`, `assignment.reassigned`, `assignment.deleted`.

## Permisos
- `service.scheduling.read` — tenant_admin, supervisor, sales_representative, technician
- `service.scheduling.write` — tenant_admin, supervisor
