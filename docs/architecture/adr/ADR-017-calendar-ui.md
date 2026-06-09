# ADR-017 — Calendar UI

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** Sprint 5
- **Relates:** ADR-015 (Scheduling Core), ADR-016 (Dispatch Board)

## Context

Operaciones necesita ver las asignaciones **en el tiempo** (día, semana, por
técnico), como Salesforce FSM / ServiceNow / Zinier. La información ya existe en
`WorkOrderAssignment` (Scheduling) y las métricas en Dispatch. No hace falta un
dominio nuevo: hace falta **visualizarlo**.

## Decision

Calendar es una **capa de presentación**, no un dominio. Implementado como
`modules/calendar` que contiene **solo helpers puros de agrupación/filtrado** +
la página. **Sin tablas, sin repositorios, sin lógica de negocio nueva.**

### Por qué Calendar consume Scheduling
- La fuente de verdad de "qué/cuándo/quién" es `WorkOrderAssignment`. Calendar
  obtiene los datos vía `listTenantAssignments` (composición de Scheduling) con
  filtros de técnico/estado/ventana de fecha — **una sola consulta**, ya
  optimizada (`count: estimated`, sin N+1). No se duplica ninguna query.
- Cualquier mutación (mover/cambiar) se delega a los use-cases de Scheduling
  (`reassignWorkOrder`, que ya valida overlap). El click en una asignación navega
  a `/schedule/[assignmentId]` — **no se duplican pantallas**.

### Por qué Calendar consume Dispatch
- El panel superior de métricas (asignaciones hoy/semana, técnicos disponibles,
  utilización promedio) **reutiliza** `getTenantDispatchStats`. Calendar no
  recalcula carga ni capacidad; consume la proyección que Dispatch ya expone.

### Separación de responsabilidades
- **Scheduling** = escritura + reglas (overlap).
- **Dispatch** = proyección de carga (read model agregado en SQL).
- **Calendar** = visualización temporal (agrupación pura en memoria sobre un
  conjunto acotado por ventana de fecha).
Esta es la pieza de "view" del patrón CQRS ligero ya establecido.

### Agrupación pura y testeable
`calendar-grouping.ts` expone funciones puras (`groupByHour`, `groupByWeekday`,
`groupByTechnician`, `filterAssignments`, `startOfWeekUtc`) — sin dependencias,
testeadas con 6 casos. Bucketing en **UTC** para ser determinista y coherente con
las ventanas de Dispatch (timezone por tenant es mejora futura).

## Cómo habilita los próximos sprints

- **Notifications:** la vista hace evidentes los huecos/sobrecargas; cuando exista
  el event bus, las mismas asignaciones que se ven aquí dispararán avisos
  (`assignment.created/reassigned`) al técnico/cliente.
- **Route Optimization:** la vista por técnico/día es la representación visual de
  la secuencia de paradas; añadir orden/geo a las asignaciones se renderiza aquí
  sin cambiar el modelo, y el optimizador reordena vía Scheduling.
- **Scheduling Agent:** Calendar es la UI donde un agente propondrá cambios; el
  agente lee el mismo `listTenantAssignments` + Dispatch stats (estado del mundo)
  y aplica reasignaciones validadas por Scheduling. La UI ya está lista para
  mostrar "sugerencias".
- **AI Forecasting:** la densidad temporal (asignaciones por día/semana, slots
  libres) es input directo para predecir demanda y capacidad; Calendar visualiza
  lo que el forecast proyectará.

## Consequences

**Positivas**
- Cero duplicación: una query de Scheduling + stats de Dispatch.
- Experiencia FSM (Day/Week/Technician) sin deuda de dominio.
- 6 tests de agrupación/filtrado puros; CI verde.

**Negativas / deuda aceptada**
- Bucketing en UTC (no por timezone del tenant) — v1.
- Sin drag & drop (mover = ir al detalle y reasignar) — fuera de alcance v1.
- Ventana acotada a día/semana con fetch de hasta 500 asignaciones; vistas más
  largas requerirían paginación temporal (no necesaria a esta escala).

## Permisos
- Reutiliza `service.scheduling.read` (ver asignaciones).
- Métricas de Dispatch solo si el usuario tiene `service.dispatch.read`
  (si no, esas tarjetas muestran "—").
