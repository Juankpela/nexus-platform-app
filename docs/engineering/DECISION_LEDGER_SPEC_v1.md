# Decision Ledger — Especificación v1 (para congelar)

> **Propósito.** Registrar cada **decisión de supervisión** como evidencia, de forma
> append-only, **reutilizando `audit_events`** (sin tabla nueva, sin cambio de
> esquema). Es la memoria operacional (C5) y el motor de evidencia de Gate-1: sin
> esto, la Estación muestra decisiones pero no demuestra nada. Fecha: 2026-06-30.
>
> **Pregunta-filtro (North Star) aplicada a cada campo:** *¿aumenta la capacidad de
> demostrar que NEXUS mejora decisiones operacionales?* Si no, el campo no está aquí.

## 1 · Qué se captura y cuándo

En el momento en que el supervisor **actúa** o **descarta** un compromiso en la Estación
(Hero o ActionBar → CaptureChip). Una decisión = un evento. Append-only; nunca se edita.

## 2 · Contrato CONGELADO — mapeo a `audit_events`

| Campo `audit_events` | Valor |
|---|---|
| `event_type` | `"supervision.decision"` |
| `actor_type` | `"user"` |
| `actor_id` | id del supervisor |
| `tenant_id` | tenant |
| `subject_type` | `"work_order"` |
| `subject_id` | id de la orden (el compromiso) |
| `action` | `"act"` \| `"dismiss"` |
| `metadata` | payload de decisión (abajo) |

**`metadata` (jsonb) — esquema congelado, `schemaVersion: 1`:**
```jsonc
{
  "schemaVersion": 1,
  "decisionKind": "act" | "dismiss",            // dismiss ⟺ action === "descartar"
  "action": "reasignar" | "expeditar" | "renegociar" | "escalar" | "descartar",  // lo que el SUPERVISOR hizo
  "reason": string,                 // "¿por qué?" (capa 6, ya existe)
  "priorIntent": string | null,     // contrafactual "¿qué ibas a hacer?" (Gate-1)

  // Snapshot del compromiso AL decidir (evidencia; evita re-derivar después):
  "surfacedIntervention": "ASSIGN_TECHNICIAN" | "RESCHEDULE" | "FOLLOW_UP_CUSTOMER"
                        | "ESCALATE_PARTS" | "REVIEW" | null,   // lo que NEXUS CLASIFICÓ como requerido
  "exposedValue": number | null,            // del Read Model (null = sin factura → sin valor real)
  "pointOfNoReturnStatus": "KNOWN" | "UNKNOWN",
  "msToPointOfNoReturn": number | null,
  "slaStatus": "on_track" | "at_risk" | "breached" | "met" | null,
  "estado": "en_riesgo_accionable" | "perdido" | "sano" | "sin_datos"
}
```

> **Corrección de fidelidad (2026-06-30):** la spec separa ahora **`action`** (lo que el
> supervisor decidió hacer) de **`surfacedIntervention`** (lo que NEXUS clasificó como
> requerido). Registrar solo la clasificación de NEXUS perdería el dato más importante:
> qué hizo el humano. La tríada `surfacedIntervention` (qué sugirió NEXUS) · `action`
> (qué hizo el humano) · `priorIntent` (qué habría hecho sin NEXUS) es la evidencia
> completa del cambio de decisión.

## 3 · Qué habilita (y por qué cada campo gana su lugar)

- **`decisionKind` + `intervention` + `reason`** → volumen y mezcla de intervenciones; precisión (un `dismiss` con razón = dato de falso positivo).
- **`priorIntent`** → **la medición de Gate-1**: ¿la decisión que NEXUS hizo visible *cambió* lo que el supervisor iba a hacer? Es el mecanismo de la hipótesis (no el veredicto).
- **`snapshot` (valor/tiempo/estado)** → permite, más adelante (paso 3, fuera de v1), enlazar la decisión con el resultado del compromiso y preguntar si la intervención **preservó valor** — sin re-derivar el pasado. `exposedValue: null` se registra honesto.

## 4 · Implementación (exactamente este contrato)

- Un use-case puro `buildSupervisionDecisionEvent(input, now)` → `AuditEvent` (mapeo determinístico).
- Composición `recordSupervisionDecision(...)` → `audit().append(event)` (puerto existente).
- Lectura para medir: `listRecentByEventType(tenantId, "supervision.decision", n)` (puerto existente).
- Tests: mapeo, `act` vs `dismiss`, snapshot con valor `null`, `priorIntent` ausente.

## 5 · Fronteras (lo que v1 NO hace)

- **No** crea tabla ni cambia esquema (reutiliza `audit_events`).
- **No** decide ni recomienda nada (el Read Model ya clasifica; esto solo **registra** la decisión humana).
- **No** hace outcome linkage todavía (paso 3, después de medir con el primer Validation Partner).
- **No** agrega analítica/dashboard.

## 6 · Decisión de congelación — RESUELTA (founder, 2026-06-30)

**Opción A: `priorIntent` SE INCLUYE en v1.** Gate-1 (cambio de decisión) queda medible
desde el primer Validation Partner. Implica una **adición funcional** a la CaptureChip
(capa 6, ya diseñada en el blueprint): elicitar "¿qué ibas a hacer?" además del "¿por qué?".
La *estética* congelada no se toca; solo se completa el comportamiento de captura.

Spec CONGELADA. La implementación sigue exactamente este contrato.
