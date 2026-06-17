# ADR-033 — Nexus Autonomous Dispatch (Assisted Mode)

Estado: aceptado · Fecha: 2026-06-17

## Contexto

El lazo "reporte → técnico asignado con cita" es 100% manual hoy. Los motores
determinísticos ya existen y están probados:

- Elegibilidad: `modules/scheduling/domain/eligibility.ts` (`evaluateEligibility`,
  `sortEligible`) + resolver `supabase-eligibility-resolver.ts` (ADR-028).
- Programación: `modules/scheduling/domain/next-slot.ts` (`findNextSlot`).
- Asignación: `modules/scheduling/application/use-cases/assign-work-order.ts`
  (valida active/solape/ventana y persiste) (ADR-031).
- Orquestación de selección+slot ya existe para reagendamiento:
  `plan-reschedule.ts` (modo `suggested`).
- Auditoría con actor no-humano: `audit-event.ts` admite `actorType:"system"`,
  `actorId?: null`.
- Notificación in-app: `modules/notifications` (ADR-030).

## Decisión

Construir el circuito autónomo **reutilizando** esos motores, sin rediseñarlos.
La IA SOLO clasifica lenguaje natural → datos estructurados; **ninguna decisión
operativa proviene de IA**. Toda selección/programación es determinística y
auditable.

### Modo: ASSISTED
Nexus clasifica → crea WO → selecciona técnico → agenda → asigna → notifica al
técnico. Espera **aceptación del técnico** antes de confirmar al cliente. Un
supervisor puede corregir. No se implementan Conservative ni Autonomous completo.

### Pending Technician Acceptance
Es el estado de ejecución `pending` que YA existe (`execution.ts`): al asignar se
crea el assignment (ejecución `pending`) y se reserva el slot, pero **el cliente
NO se confirma**. La confirmación al cliente se dispara en la transición existente
`pending → accepted` (`acceptAssignmentAction`). Cero estados nuevos.

### Dispatch Confidence (determinístico)
Función pura sobre 6 señales → `PROCEED | HOLD | ESCALATE`:
1. confianza de clasificación (≥ umbral del tenant)
2. técnico elegible encontrado
3. capacidad del #1 disponible
4. slot encontrado
5. cumplimiento SLA (slot.fin ≤ slaDueAt)
6. calidad del reporte (descripción + foto/ubicación)

- ESCALATE → bandeja humana (sin elegible / sin slot / riesgo SLA).
- HOLD → propone, humano confirma (baja confianza o reporte pobre).
- PROCEED → asigna y notifica.

### Explicabilidad
Subproducto de los motores: `EligibilityReasons` por técnico (elegido y
descartados) + orden `sortEligible` + "primer hueco" de `findNextSlot`. Se
persiste en `audit.metadata` del evento `autonomous_dispatch.assigned`
(`actorType:"system"`, nombre visible "Nexus Autonomous Dispatch").

### Timeout de aceptación
Escáner idempotente per-tenant (mismo patrón que `scan-overdue-work-orders.ts`):
si el assignment sigue `pending` pasado `acceptanceTimeoutMinutes`, se reintenta
reasignando al siguiente técnico (excluyendo al que no respondió) reutilizando el
mismo selector; si no hay alternativa → ESCALATE a bandeja humana.

### Canales
- Cliente: **Email obligatorio** (reusa Resend, patrón de `invoice-actions`/
  `quote-actions`). WhatsApp Business = contrato futuro, no bloquea el MVP.
- Técnico: **In-app obligatorio** (reusa `notifications`). Email/WhatsApp después.

## Consecuencias

No se toca: eligibility / next-slot / assign-work-order / dispatch board / field
execution / skill / availability / capacity. Piezas nuevas: clasificador (IA,
seam), selector puro, función de confianza, orquestador (clon de plan-reschedule),
lector de candidatos, hooks de notificación, escáner de timeout. Sin tablas
nuevas: la clasificación y las razones viven en `audit.metadata`.
