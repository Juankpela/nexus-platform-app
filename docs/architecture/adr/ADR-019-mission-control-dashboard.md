# ADR-019 — Mission Control Dashboard

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** UX-1
- **Scope:** Solo experiencia. Sin dominio, tablas, repositorios ni reglas de negocio.

## Context

El dashboard anterior **mostraba información** (KPIs + accesos por área) pero no
respondía las tres preguntas que un operador/ejecutivo se hace al entrar:
*¿hay problemas?, ¿qué requiere atención?, ¿cómo va el negocio y la operación?*
Era un tablero de estado, no un centro de mando.

## Decision

Convertir `/dashboard` en un **Mission Control** (estilo Salesforce Home /
ServiceNow Workspace / HubSpot / Monday) con jerarquía **urgente-primero**.

### Jerarquía de información (lo urgente primero)
1. **Welcome header** — saludo por hora + fecha + tenant + Quick Actions.
2. **Attention Center** — "Requiere atención" (SLA incumplidos, casos críticos,
   técnicos sobrecargados, órdenes sin programar), ordenado por severidad.
3. **KPIs ejecutivos** — pipeline, oportunidades, casos, órdenes, técnicos, utilización.
4. **Field Service / CRM / Service snapshots** — clicables a su dashboard de área.

El Attention Center va **antes** que los KPIs: el centro de mando prioriza la
acción sobre el reporte.

### Reutilización total (cero queries nuevas)
Todas las métricas vienen de composiciones existentes:
`getTenantDashboardStats`, `getTenantRevenueMetrics`, `getTenantCaseStats`,
`getTenantWorkOrderStats`, `getTenantDispatchStats`, `listTenantOpportunities`.
La lógica de priorización vive en un helper **puro y testeado**
(`mission-control.ts`: `greetingFor`, `buildAttentionItems`).

### Design system reutilizable
`MissionSection`, `MissionMetricCard`, `MissionAlertCard` (+ `MissionAllClear`),
`MissionQuickAction`. Tarjetas compactas, escaneables, sin tablas largas.

### Degradación por permisos
Cada sección y métrica se renderiza solo si el usuario tiene el permiso del área;
las que no, muestran "—" o se ocultan. Un vendedor ve CRM; un despachador ve
Field Service; un admin lo ve todo.

## Por qué reemplaza al dashboard tradicional

- Responde en <5s: rojo/ámbar arriba = atención; verde "todo en orden" = tranquilidad.
- Convierte una "colección de módulos" en una **plataforma de operaciones**.
- El Attention Center es accionable: cada tarjeta enlaza al módulo donde se resuelve.

## Preparación para el futuro (sin rediseñar la pantalla)

- **Notifications:** el Attention Center es el lugar natural para los avisos; hoy
  deriva de stats, mañana consumirá el centro de notificaciones con la misma UI.
- **Event Bus:** cuando los eventos de dominio (`assignment.created`,
  `case.escalated`…) fluyan por un bus, el Attention Center pasará de "pull"
  (calcular de stats) a "push" (suscribirse) sin cambiar el layout.
- **AI Agents:** una sección "Sugerencias del copiloto" se inserta como otra
  `MissionSection` entre Attention y KPIs; el agente observa los mismos stats que
  ya alimentan esta pantalla y propone acciones (reasignar, escalar).

## Consequences

**Positivas**
- Percepción enterprise inmediata; priorización por severidad.
- Componentes reutilizables para futuros dashboards/widgets.
- Helper puro testeado (greeting + attention) — 6 tests; CI verde.

**Negativas / deuda aceptada**
- "Work Orders atrasadas" se aproxima con "órdenes sin programar" (estado `new`),
  porque overdue real (scheduled_end < now) no está en los stats actuales; se
  documentó como placeholder hasta exponer esa métrica.
- KPIs sin tendencia (▲▼) todavía — siguiente iteración de UX.
- Saludo/fecha en UTC hasta que exista timezone por tenant.
