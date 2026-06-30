# Read Model de la Estación — Vacíos de Datos y Trazabilidad (v1)

> El Read Model (`modules/supervision`) sustituye el mock de la Estación por datos
> reales **sin tocar la UI congelada**. Es determinístico (mismo estado + mismo
> `now` ⇒ misma salida) y puro (núcleo sin React/IO; `now` inyectado). Donde un dato
> no existe, propaga incertidumbre (`"—"` / `"desconocido"` / nota en evidencia) y lo
> registra aquí. **Nunca inventa.** Fecha: 2026-06-30.

## Pipeline

`composición (fetch real)` → `judge()` → `prioritize()` → `buildHealth()` → `to-view-model` → contratos congelados.
Fuentes reales reutilizadas: `listTenantWorkOrders`, `getActiveAssignmentsByWorkOrder`, `listTenantInvoices`, `getTenantDispatchStats`, `computeSlaStatus`.

## Trazabilidad (contrato → dato real)

| Campo del contrato | Proviene de | Estado |
|---|---|---|
| `id`, `commitment`, `headline`, `evidenceLine`, `evidence.observed/concluded` | `WorkOrder` (number, company, subject, status) + `WorkOrderAssignment` (técnico, fechas) | ✅ real |
| `timeToPointOfNoReturn` | `slaDueAt − estimatedDurationMinutes` (asignación) | ✅ real si asignada · ⚠️ `"desconocido"` si no |
| ventana accionable / `tone` / `belowThresholdCount` | `computeSlaStatus(slaDueAt, priority, now)` (lógica existente) | ✅ real |
| `reasonWord`, `recommendedAction` (= `requiredIntervention`) | constraint observable (sin asignar / overshoot de plan) | ✅ real (clasifica, no recomienda) |
| `evidence.feasibility` | `DispatchStats.availableTechnicians / activeTechnicians` | ✅ real |
| `HealthSnapshot.capacity` | `DispatchStats` | ✅ real |
| `evidence.uncertainty` | materializa los vacíos de abajo | ✅ (lugar correcto) |
| `valueExposed`, `evidence.ifNothing` (monto) | `Invoice.totalAmount` vía `workOrderId` (solo emitidas) | ❌ GAP → `"—"` salvo orden ya facturada |
| `HealthSnapshot.exposedInWindow` | suma de `valueExposed` | ❌ GAP → `"—"` (no parcial engañoso) |
| `HealthSnapshot.protectedToday` / `lostToday` | — | ❌ GAP → `"—"` |
| `HealthSnapshot.trend` | serie temporal del valor expuesto | ❌ GAP → `"flat"` |

## Vacíos (qué falta y por qué) — qué instrumentar para cerrarlos

1. **Valor económico por compromiso** (`valueExposed` y las 3 cifras de dinero de Health).
   *Por qué:* `WorkOrder`/`Case` no tienen monto; el único dinero real es `Invoice.totalAmount`, que solo existe cuando la orden **ya se facturó** — casi nunca para compromisos *en ventana*.
   *Para cerrarlo:* registrar un valor comprometido/estimado por orden (monto de cotización/contrato) en el momento de crearla.
2. **Punto de no retorno verdadero** (`timeToPointOfNoReturn`).
   *Por qué:* requiere `estimatedDurationMinutes`, que solo existe vía **asignación activa**. Orden sin asignación ⇒ no computable ⇒ `"desconocido"` (no se sustituye por el plazo, no se aproxima).
   *Para cerrarlo:* capturar una duración estimada al crear/programar la orden.
3. **Tendencia del valor expuesto** (`trend`).
   *Por qué:* no se almacena una serie temporal del expuesto ⇒ `"flat"`.
   *Para cerrarlo:* snapshot periódico del expuesto en ventana.
4. **Valor protegido/perdido hoy** (`protectedToday`, `lostToday`).
   *Por qué:* no existe un ledger de resultados de acción con su valor.
5. **Compromisos sin `slaDueAt`** son invisibles a la supervisión (sin plazo no hay ventana). Es correcto, pero se nota aquí.

## Consecuencia de diseño (no es un bug)

Sin valor por ítem, el ranking del blueprint (*valor × urgencia*) opera **urgencia-primero** (valor solo cuando se conoce). La Estación mostrará `"—"` en casi todo el dinero hasta que se instrumente (1). Esto es exactamente "lo que falta para demostrar valor" hecho visible.

## Recomendaciones de contrato (SOLO cuando se descongele la UI)

El dominio ya modela estos conceptos correctamente; el contrato congelado los aproxima vía strings. Al descongelar:

1. **Renombrar `recommendedAction` → `requiredIntervention`** (+ tipo `InterventionType = ASSIGN_TECHNICIAN | RESCHEDULE | FOLLOW_UP_CUSTOMER | ESCALATE_PARTS | REVIEW`). El Read Model **clasifica la intervención que el estado exige**, no recomienda una acción concreta.
2. **Añadir `pointOfNoReturnStatus: "KNOWN" | "UNKNOWN"`** explícito al contrato. Hoy `UNKNOWN` se codifica como el string `"desconocido"` + nota en `evidence.uncertainty`.

`FOLLOW_UP_CUSTOMER` y `ESCALATE_PARTS` existen en el vocabulario del dominio pero **no se emiten** aún: requieren una señal estructurada (estado "esperando cliente" / "esperando repuesto") que hoy no es fiable desde la orden.
