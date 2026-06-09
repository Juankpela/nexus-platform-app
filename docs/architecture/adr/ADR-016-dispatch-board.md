# ADR-016 — Dispatch Board

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** Sprint 4
- **Relates:** ADR-014 (Technicians), ADR-015 (Scheduling Core), ADR-005 (read models)

## Context

Los despachadores necesitan una **consola operativa** que responda, para un día
dado: ¿qué técnicos están ocupados/libres/sobrecargados?, ¿cuántas horas tiene
asignadas cada uno?, ¿qué Work Orders están programadas hoy? Scheduling Core ya
crea las asignaciones; falta una vista agregada de **carga** sobre ellas.

## Decision

Crear un módulo **read-only** `modules/dispatch`, separado de `scheduling`,
siguiendo la arquitectura hexagonal. No introduce tablas nuevas: agrega
`technicians` + `work_order_assignments`.

### Por qué Dispatch es un módulo separado de Scheduling
- **Responsabilidades distintas.** Scheduling es el lado de **escritura**
  (assign/reassign/unassign + reglas de negocio como overlap). Dispatch es el lado
  de **lectura/operación**: agrega y clasifica carga. Es una separación
  command/query (CQRS ligero): mezclarlos acoplaría el modelo de escritura con
  proyecciones de lectura.
- **Modelos diferentes.** Scheduling razona sobre `WorkOrderAssignment` (un
  agregado); Dispatch razona sobre `TechnicianWorkload` (una proyección derivada).
- **Evolución independiente.** Dispatch evolucionará hacia capacity planning,
  calendar y dispatch en tiempo real sin tocar las reglas de Scheduling.

### Agregación en SQL (ADR-005)
La carga por técnico se calcula con un RPC `dispatch_technician_workload`
(`SUM(estimated_duration_minutes)`, `COUNT(*)`, `GROUP BY` técnico, `LEFT JOIN`
para incluir técnicos sin asignaciones). **No se traen filas a memoria para sumar.**
Es `SECURITY INVOKER`, así que RLS aplica con la identidad del usuario → tenant
isolation garantizada.

### Clasificación pura en el dominio (Reglas 1–5)
`buildTechnicianWorkload()` es una función pura testeable:
- Regla 1: capacidad diaria = 480 min.
- Regla 2: util < 70% → available.
- Regla 3: 70% ≤ util ≤ 100% → busy.
- Regla 4: util > 100% → overloaded.
- Regla 5: technician.status ≠ active → unavailable.
Orden del board: overloaded → busy → available → unavailable.

## Preparación para sprints futuros (sin rediseño)

- **Calendar:** el board ya agrupa asignaciones por técnico y día; una vista de
  calendario reutiliza `getDispatchBoard` cambiando la ventana de tiempo
  (día → semana) y renderizando en una grilla temporal.
- **Route Optimization:** `TechnicianWorkload` + `availableMinutes` es la función
  objetivo a optimizar; añadir geolocalización a Technicians/Assets habilita el
  ruteo usando estas mismas primitivas de carga.
- **Scheduling Agent:** un agente consumirá `getDispatchBoard`/`getDispatchStats`
  para detectar sobrecarga y proponer reasignaciones (vía Scheduling Core, que ya
  valida overlap). Dispatch es el "estado del mundo" que la IA observa.
- **Capacity Planning:** `DAILY_CAPACITY_MINUTES` es hoy una constante; el modelo
  permite sustituirla por capacidad real (turnos/calendarios) sin cambiar la
  clasificación ni el board.

## Consequences

**Positivas**
- Visibilidad operativa inmediata (ocupación/disponibilidad) con cálculo en SQL.
- CQRS ligero: lecturas no contaminan el modelo de escritura de Scheduling.
- 11 tests nuevos (workload boundaries, clasificación, stats); CI verde.

**Negativas / deuda aceptada**
- Ventanas de día en **UTC** (no por zona horaria del tenant). Se parametrizará
  cuando exista configuración de timezone por tenant.
- Capacidad fija de 480 min hasta que exista el módulo de capacidad/turnos.

## Permisos
- `service.dispatch.read` — tenant_admin, supervisor.
- El RPC y las tablas subyacentes exigen además `service.scheduling.read` y
  `service.technicians.read` vía RLS (ambos los tienen esos roles).
