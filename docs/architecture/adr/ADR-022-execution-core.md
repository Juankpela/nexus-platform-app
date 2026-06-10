# ADR-022 — Execution Core (FWX-1A reconciliation)

- **Status:** Accepted · Implemented
- **Date:** 2026-06-10
- **Sprint:** FWX-1A
- **Relates to:** [ADR-020 Field Execution Domain](ADR-020-field-execution-domain.md),
  [ADR-021 FWX-1 MVP](ADR-021-fwx-1-mvp.md)

## Context

El sprint **FWX-1A — Execution Core** especificó un núcleo de dominio Execution
"desde cero": tabla `executions`, use-cases discretos, sin UI `/worker`, y un
`ADR-021 Execution Core`. La auditoría previa (FASE 0) encontró que **ese núcleo ya
estaba implementado y desplegado en producción** como parte de FWX-1
(commit `fb4c804`, migración `20260609007_field_execution.sql`):

- Agregado Execution con los 6 estados y transiciones guardadas (`canTransition`).
- Permisos `service.field.read` / `service.field.execute`.
- `service.work_orders.write` **removido** del rol `technician` (least privilege).
- `technicians.user_id` + RLS record-scope (self + oversight).
- Repositorio tipado, eventos de dominio (contrato), tests verdes.
- Además, el área `/worker` (UI móvil) ya en producción.

Reconstruir según el spec literal habría implicado cambios **destructivos** sobre
una base viva (renombrar la tabla, revertir `/worker`, fragmentar un use-case que
funciona). El usuario eligió la **Opción 2 — Refinamientos no destructivos**.

## Decision

Conservar la implementación desplegada y **reconciliarla** con el spec mediante
añadidos aditivos únicamente:

1. **Columna `unable_to_complete_at`** (migración aditiva `20260610001`): el spec
   pedía un timestamp explícito de fallo; FWX-1 lo infería de `completed_at IS NULL`
   + `unable_reason`. Se añade la columna para fidelidad de reporting
   (time-to-failure / abandono) sin tocar datos existentes.
2. **Wrappers nominales** sobre `advanceExecution` (intención revelada en el nombre),
   que delegan en la **única transición guardada** ya validada:

   | Wrapper | Target | Semántica |
   |---|---|---|
   | `acceptExecution` | `accepted` | el técnico acepta la asignación |
   | `startExecution` | `on_site` | inicia la visita (llega a sitio) |
   | `resumeExecution` | `working` | comienza / reanuda el trabajo |
   | `completeExecution` | `completed` | cierre exitoso |
   | `unableToCompleteExecution` | `unable_to_complete` | cierre fallido |
   | `pauseExecution` | — | **reservado**: lanza `EXECUTION_PAUSE_UNSUPPORTED` |

3. **`advanceExecution` permanece como implementación principal.** Los wrappers son
   azúcar de llamada; toda la regla de transición, emisión de evento y timestamps
   vive en un solo lugar (sin duplicar lógica ni puntos de emisión).

### Diferencias spec original ↔ implementación final

| Aspecto | Spec FWX-1A | Implementación final | Razón |
|---|---|---|---|
| Tabla | `executions` | `work_order_executions` (conservada) | renombrar es destructivo sobre DB viva; el nombre es más explícito en un esquema con varias entidades de work order |
| `unable_to_complete_at` | columna dedicada | **añadida** (aditiva) | acepta el spec sin riesgo |
| Use-cases | 5–7 discretos | `advanceExecution` + 6 wrappers nominales | una sola transición guardada evita drift entre 5 copias de la misma regla; los wrappers dan los verbos pedidos |
| `pauseExecution` / `resumeExecution` | implícitos en la lista | `pause` reservado (error), `resume`→`working` | el ciclo validado **no tiene estado `paused`**; inventarlo contradiría el dominio probado |
| `/worker` | "no construir aún" | conservado (ya en prod) | revertir UI desplegada es destructivo y sin valor |
| ADR | "ADR-021 Execution Core" | **ADR-022** | `ADR-021` ya documenta FWX-1; renumerar rompería trazabilidad |

### Justificación arquitectónica

- **Una transición, un guard.** `advanceExecution` concentra `canTransition`, los
  timestamps y el punto de emisión del evento de dominio. Los wrappers nominales dan
  legibilidad (`acceptExecution(...)` vs `advance(..., "accepted")`) sin multiplicar
  la regla — si las transiciones cambian, se cambian en un solo sitio.
- **No inventar estados.** `pause`/`resume` no existen en la máquina validada
  (ADR-020). Antes que añadir un estado `paused` no probado y abrir caminos de
  transición nuevos, `pauseExecution` falla explícito y se documenta como FWX-1B.
  El contrato queda completo (el verbo existe) y honesto (no muta nada).
- **Aditivo > destructivo.** Toda la reconciliación es `add column if not exists` y
  funciones nuevas. Cero `drop`, cero `rename`, cero revert. Riesgo sobre producción
  ≈ nulo.

### Por qué se conservan `/worker` y `work_order_executions`

- **`/worker`** ya está desplegado, probado y es la validación end-to-end real del
  dominio (aceptar→llegar→trabajar→completar). El spec lo excluía para *no arriesgar*
  el sprint; revertirlo ahora introduciría exactamente el riesgo que buscaba evitar.
- **`work_order_executions`** está referenciado por FKs compuestas, políticas RLS,
  el tipo generado de la DB y el repositorio. Renombrar exige una migración
  destructiva + regeneración de tipos + reescritura de RLS sobre datos vivos, a
  cambio de cosmética. El nombre además desambigua frente a otras entidades de
  work order.

### Por qué FWX-1A excluye Offline / Fotos / GPS / Firma

Igual que ADR-021: el riesgo de FWX no está en la cámara ni el service worker, sino
en el **modelo de estados y los límites de permiso**. Validado el ciclo y el
record-scope, offline (IndexedDB + outbox), evidencia (fotos/firma) y geo se montan
**encima** de un agregado ya probado, sin retrabajo conceptual.

## Cómo prepara FWX-1B

- `unable_to_complete_at` cierra la simetría de timestamps → base directa de
  "tiempo en sitio / hasta fallo" para reporting.
- `pauseExecution` ya define el verbo reservado: FWX-1B sólo añade el estado
  `paused` + sus transiciones (`working↔paused`) en un punto único (`advanceExecution`
  + el mapa de transiciones) y reemplaza el `reject` por la delegación.
- Los wrappers nominales son el contrato estable que la UI worker y, más adelante,
  la capa offline consumirán sin acoplarse al `target` crudo.

## Consequences

**Positivas**
- Spec FWX-1A satisfecho sin tocar producción: typecheck/lint/tests/build verdes.
- Verbos de dominio explícitos sobre una sola transición guardada.
- Timestamp de fallo disponible para analítica.

**Negativas / deuda aceptada**
- Divergencia nominal permanente: tabla `work_order_executions` (no `executions`).
- `paused` aún no es un estado real (reservado para FWX-1B).
- `assignment_status` conserva `in_progress`/`completed` (deuda heredada de ADR-020,
  espejo derivado a deprecar).
