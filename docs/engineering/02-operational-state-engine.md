# Componente 2 — Operational State Engine (OSE) · Especificación de Ingeniería

> **Naturaleza.** Spec de ingeniería implementable, NO arquitectura. Convierte el diseño cognitivo CONGELADO del OSE (`OPERATIONAL-STATE-ENGINE.md`) en software sobre el stack real (Supabase/PostgreSQL + TypeScript + Next.js, hexagonal). **No introduce ni un concepto, acto, tipo ni invariante nuevo.** Todo se traza al canon **por nombre** de puerto (`P-IN`/`P-OUT`/`P-CLK`), invariante (`OSE INV-1`…`OSE INV-9`, `INV-8a/8b`, "Regla de cierre", "I-0"), las **seis ramas** (`§4.4`), los gates `G0`–`G3` (`§4.0`–`§4.2`), la **condición de fin F1–F6** (`§4.4`) y el **Apéndice de falsación** (14 estados, `§6`). El OSE en disco SÍ tiene secciones numeradas (`§1`–`§6`, pasos `A1`–`A4`, Flujo A/B); se citan por su número verificado. Las citas al MOV/Motor usan número de sección verificado o nombre del concepto.
>
> **Documento primario:** `OPERATIONAL-STATE-ENGINE.md`. **Componente sobre el que se apoya:** `engineering/01-mov-data-model.md` (C1, CERRADO). El OSE **reusa** los puertos de C1 y la RPC `mov_integrar`; **no redefine el modelo de datos del MOV.**
>
> **Ubicación hexagonal:** `modules/ose/{domain, application/{ports,use-cases}, infrastructure}`. `tenantId: UUID` es el primer parámetro de toda firma (convención del repo); `UUID = string` (no branded).
>
> **NOTA DE HONESTIDAD — corrección de los refutadores incorporada.** Tres correcciones de fondo respecto al borrador y a sus citas:
> 1. **El OSE NO escribe todo por una sola RPC.** La afirmación "única escritura = `mov_integrar`" es **falsa** y se elimina. El cuerpo verificado de `mov_integrar` (C1 §10.2) solo realiza `integrar(p_familia, p_entidad, p_premises, p_aristas)`: **no** transita `expectativa.resultado` ni **recomputa** el lado observado de una `brecha`. Por tanto la escritura del OSE pasa por **varios** puertos de C1 (`MovRepository.integrar` para entidades A/B/E; `BeliefRepository.appendObservation` / `setExpectationOutcome` / `writeDisjunctiveBelief`; `NormativeRepository.updateGapObservedSide`; `DynamicsRepository.writePerturbation`). La "Regla de cierre" del OSE (abstención, MOV nunca observable incoherente) es **por operación**; su garantía a través de una cascada multi-escritura de G3 NO está acotada por el canon → **AQ-OSE-ATOMICIDAD-MULTIESCRITURA**.
> 2. **No se inventan métodos de C1.** `findByWorldFact`, `findIncompatibleActive`, `reissueOrClose` **no existen** en `belief-repository.ts` de C1 (que define exactamente 5 métodos). Se eliminan del pseudocódigo; las operaciones que requerían (detección de re-anclaje rama 6, detección de incompatibilidad rama conflicto `OSE INV-7`, reemitir/cerrar expectativa `§4.1 A4 paso 3`) se reexpresan con los métodos reales de C1, y el residual se registra como **AQ-OSE-PUERTOS-C1-FALTANTES** (no se amplía un componente CERRADO).
> 3. **`appendObservation` devuelve `void` y no recibe `tenantId`** (firma real de C1). El OSE **sella el UUID de la observación antes de escribir** (lo conoce `stampObservation`) y NUNCA consume un retorno inexistente.

---

## 1. Propósito

El OSE es el **primer componente implementable del Motor Cognitivo**: la materialización en software del **Ritmo de Comprensión** (la cadena `cada cambio → PERCIBIR → COMPRENDER`, OSE §1.1) más el **barrido de Vencimiento**. Su razón de existir es triple, copiada del diseño (OSE §1.5):

1. **Mantener vivo y verdadero el MOV.** Todo acto aguas abajo "lee de un MOV mantenido"; "la decisión es una consulta a un MOV vivo, no su origen" (OSE §1.5). El OSE produce esa sustancia: actualiza el estado de **sustancia (familia A)**, **creencias (familia B)** y el **lado observado de la `brecha` (D)** absorbiendo cada cambio del mundo (OSE §1.2).
2. **Ejercer los cuatro gates `G0`–`G3` y solo esos** (OSE §1.1): `G0` disparo (por señal **o** vencimiento), `G1` anclaje (real y vigente), `G2` sorpresa (contra el modelo vigente), `G3` integración (escribe al MOV propagando coherencia por el Eslabón Débil).
3. **Emitir una `perturbacion` (familia E) cuando la sorpresa cruza el umbral de relevancia** (OSE §1.2): su salida máxima, *"esto cambió y sorprende"*.

El OSE **corre constante y en silencio** y **duerme por defecto** (OSE §1.1, §2 cierre): sin combustible externo (`P-IN` o `P-CLK`) no hace nada — **no se enciende a sí mismo** (negación estructural, OSE §1.3). En el stack es un **conjunto de casos de uso de orquestación pura** (`modules/ose/application/use-cases`) que consumen los puertos de C1 más un reloj/correlación inyectados, exactamente como `scanTenantOverdue` orquesta `OverdueScanRepository` + `AuditRepository` con `nowMs`/`requestId` inyectados (`modules/scheduling/application/use-cases/scan-overdue-work-orders.ts`).

---

## 2. Responsabilidades

Una sola responsabilidad indivisible — **mantener vivo el MOV y emitir `perturbacion` ante sorpresa supra-umbral** (OSE §1.2) — descompuesta en obligaciones ancladas a un gate o invariante:

- **RO-1 — Admitir y anclar señal cruda (`G0` por señal + `G1`; `P-IN`).** Convertir un evento crudo en una `observacion` sellada (ambos sellos, `OSE INV-1`), anclada a su referente A **sin recorrer causalidad** (OSE §2 P-IN), con veredicto `ADMITIDA` / `INADMISIBLE` / `INCLASIFICABLE`. La `observacion` es el **único modo de que entre un `HECHO`** (`OSE INV-2`).
- **RO-2 — Medir sorpresa contra el modelo vigente (`G2`; `OSE INV-5`).** Una sola cantidad como **relación de orden**: con `expectativa` vigente, desviación vs `{prediccion, tolerancia, horizonte}`; sin ella, contra el **estado vigente** (aparición/llegada no modelada = sorpresa; re-observación redundante = sorpresa nula). **Nunca inventa una `expectativa` retroactiva** (`OSE INV-5`; Apéndice #6).
- **RO-3 — Integrar manteniendo coherencia (`G3`; OSE §4.1 A4).** Orden interno fijo: (1) actualizar SUSTANCIA A del objeto observado, **y solo ese**; (2) **recomputar el lado observado** de la `brecha` D existente (`updateGapObservedSide`, NUNCA crear/priorizar/explicar; `OSE INV-9`); (3) reemitir/cerrar la `expectativa` B afectada — incluido **armar como `expectativa` con horizonte** un agotamiento previsible de `flujo_recurso` (OSE §4.1 A4 paso 3) —; (4) sellar derivados con el Eslabón Débil. **No** escribe `trayectoria` (C).
- **RO-4 — Emitir `perturbacion` o callar (decisión de `G3`; `P-OUT`).** `sorpresa > umbral` → escribir una `perturbacion` sellada `{ clase, afectadas, magnitud, propagacion }` (`DynamicsRepository.writePerturbation`) + traza en `audit_events`, y **dejarla sin esperar respuesta** (relatividad de rol, OSE §2 P-OUT). `sorpresa ≤ umbral` → **absorción**: confirma la expectativa, refresca su Sello Temporal, vuelve al reposo; el re-anclaje de la misma realidad NO mueve la frescura (`OSE INV-4`).
- **RO-5 — Barrer vencimientos por avance del instante de mundo (`G0` por vencimiento; `P-CLK`; `OSE INV-8b`).** Por cada `expectativa` con **ventana finita y horizonte sellado** cuyo borde fue **cruzado** por el avance del **instante de mundo** y sigue sin cumplir: registrar la **ausencia como hecho negativo** (`HECHO`, procedencia = el propio barrido) y procesarla por `G2`→`G3`. Cada vencimiento **se transita una sola vez** (`vencimiento_procesado`); un borde no cruzado **no se reevalúa**.
- **RO-6 — Respetar la frontera A/B/E y la Regla de cierre.** El OSE solo escribe familias **A/B/E** (`OSE INV-6`); `mov_integrar` rechaza C/D del OSE (`MOV_OSE_NO_ESCRIBE_C_D`, errcode 42501). Si una mutación no satisface todos los invariantes aplicables, el OSE **se abstiene** (OSE §3 "Regla de cierre").
- **RO-7 — Tratar las seis ramas exactamente (OSE §4.4).** (1) confirma; (2) sorprende; (3) vence; (4) **fuente en conflicto** → `creencia disyuntiva` (`writeDisjunctiveBelief`, sin elegir ni promediar, `OSE INV-7`); (5) **tipo no catalogado** → `observacion inclasificable` + apertura ontológica (`OSE INV-8a`, sin forzar tipo ni crear el #18); (6) **reproceso/re-anclaje** distinguido por los dos relojes (re-anclaje redundante no infla; corrección declarada **supersede** vía `deprecate`; conflicto se representa).

**Estado de control propio: mínimo y trazable.** El OSE no inventa estado nuevo en el MOV. Su único estado de control es el **cursor de vencimiento procesado** (columna `mov_creencia.vencimiento_procesado` de C1) y la **correlación de lote** (`requestId` inyectado, como `ScanDeps.requestId`). No hay temporizador interno (`P-CLK` es combustible externo, `OSE INV-8b`).

---

## 3. Límites — la frontera dura (qué el OSE NO hace)

El OSE produce un MOV vivo y `perturbacion`es y **se detiene ahí** (OSE §1.3, §6). La tabla de frontera del diseño se traduce a una frontera de implementación verificable:

| Excluido del OSE | Acto dueño (OSE §1.3) | Materialización del límite en el stack |
|---|---|---|
| Rankear qué brecha merece foco; asignar salience/presupuesto | **ATENDER** | La `perturbacion` se persiste **sin** `prioridad/score/urgencia/ranking`: el `CHECK mov_perturbacion_no_juicio` de C1 (§7, §8.3) lo rechaza en SQL. |
| Determinar el porqué; clasificar síntoma/causa; recorrer el grafo causal hacia atrás | **DIAGNOSTICAR** | El OSE **nunca llama** `CausalGraphRepository.traverseUpstream`. La `propagacion` de `P-OUT` se computa con `SubstanceRepository.traverseLinks` sobre `vinculo`/dependencia, **no** con el grafo causal. |
| Generar `intervencion`es; elegir/abstenerse/escalar (juicio) | **JUZGAR** | El OSE **nunca** escribe `intervencion` (E3) ni `compromiso` como salida; su tope es `perturbacion`. |
| Proyectar la decisión a un rol, en su lenguaje/horizonte | **ARTICULAR** | `P-OUT` no tiene destinatario-rol: `writePerturbation` no recibe ni guarda rol. El MOV es relativo a rol solo al ser **leído** por los actos aguas abajo. |
| Comparar predicho-vs-real de una **decisión** y **calibrar** confianza causal | **RECONCILIAR** | Ver §3.1. |

**Negación estructural (implementación, OSE §1.3).** El único disparo es `perceiveSignal` (`P-IN`) o `sweepExpirations` (`P-CLK`). No hay job que repase temas cerrados sin un hecho nuevo. Un tema cerrado solo se reabre porque entra una observación que lo contradice o vence una expectativa (Apéndice #14).

**Lo que NO es responsabilidad del OSE aunque lo roce:**
- **No persiste el modelo de datos del MOV** (eso es C1). Lo **consume**.
- **No valida `attrs`, no mide la física de almacenamiento, no decide el decaimiento de frescura** (AQ de C1: AQ-VALIDACION-ATTRS, AQ-DECAIMIENTO). El OSE persiste la frescura sellada topada por el Eslabón Débil y **nunca la sube** silenciosamente (`OSE INV-3`).
- **No crea la entidad `brecha`** por primera vez (AQ-OSE-AUTORIA-BRECHA, hereda C1 AQ-AUTORIA-BRECHA). Solo **recomputa su lado observado** sobre una brecha existente (`OSE INV-9`, OSE §4.1 A4 paso 2).

### 3.1 El corte preciso con RECONCILIAR (`OSE INV-9`)

Es el límite más fino. La regla canónica (OSE §1.4, INV-9), traducida a prohibición de código:

> **El OSE corrige el modelo del MUNDO por percepción** (estado A, creencias B, lado observado de `brecha` D, `expectativa` B). **RECONCILIAR corrige el modelo CAUSAL por outcome** (`relacion_causal`, `trayectoria`, priores de ATENDER, `episodio`s). El OSE **detecta y registra el VENCIMIENTO** de cualquier `expectativa` —incluida una sembrada por una decisión— y emite su `perturbacion`; pero **leer ese vencimiento como veredicto de decisión**, escribir el `episodio` y recalibrar confianzas causales es trabajo de RECONCILIAR.

**Prohibiciones de código verificables:**
- **Nunca llama** `DynamicsRepository.writeEpisode` (C1 lo marca "SOLO RECONCILIAR, nunca el OSE", §4.3 línea 209). Por eso `OseDeps.dynamics` es `Pick<DynamicsRepository, "writePerturbation">`: `writeEpisode` queda **fuera** del tipo.
- **Nunca escribe** `relacion_causal`/`trayectoria` (familia C). Si el OSE mide sorpresa contra una proyección de `trayectoria`, **solo la lee, jamás la ajusta** (OSE §2 P-OUT "trayectoria solo como lectura"; `OSE INV-9`). **Decisión de minimalismo (corrección de refutador):** dado que C1 (decisión congelada) "ni siquiera la ajusta" y que el OSE mide sorpresa primordialmente contra `expectativa` (B3) y estado A vigente, **esta spec NO inyecta `CausalGraphRepository` en `OseDeps`**; la lectura de proyección de trayectoria, cuando exista, se difiere a quien siembre la `expectativa` con su `base_de_expectativa`. Si se demostrara que el OSE necesita leer `trayectoria` directamente, se añadiría `Pick<CausalGraphRepository, "getTrajectory">` (solo lectura) — registrado como **AQ-OSE-LECTURA-TRAYECTORIA**.
- **Nunca pasa** `familia ∈ {C_explicacion, D_normativa}` a `mov_integrar` (lo rechaza con `MOV_OSE_NO_ESCRIBE_C_D`, errcode 42501).

---

## 4. Interfaces públicas — los tres puertos

El OSE expone **exactamente tres puertos** (`P-IN`, `P-CLK`, `P-OUT`); **no** existe un "puerto de lectura" ni un "puerto de escritura" del OSE: la escritura es **efecto interno de `G3`** y la lectura del MOV pertenece a los actos aguas abajo (OSE §2). **Invariante de frontera I-0** (OSE §2): toda escritura del OSE recae sobre el MOV (familias A/B/E) o sobre `P-OUT`.

**`P-OUT` NO es una interface TypeScript adicional (corrección de refutador).** El canon dice que la escritura de la `perturbacion` es el **efecto interno de `G3`** sobre `DynamicsRepository.writePerturbation` de C1 (OSE §2: "la escritura es el efecto interno de COMPRENDER"). Por tanto **no se crea un `PerturbationSink`**: `P-OUT` es la **dirección de salida** cuya única materialización es `dynamics.writePerturbation` (ya inyectado en `OseDeps`) más la traza en `audit_events`. En hexagonal, los tres puertos se materializan como **dos casos de uso de entrada** (`perceiveSignal` para `P-IN`+`G0`/`G1`; `sweepExpirations` para `P-CLK`) y **un efecto de salida** sobre `dynamics.writePerturbation`. Ambos casos de uso comparten el sub-flujo interno `integrateAndMaybeEmit` (`G2`+`G3`).

### 4.1 Dependencias inyectadas — puertos del MOV que el OSE CONSUME (de C1, verificados en disco)

El OSE no crea puertos de datos nuevos: reusa los de C1 (`modules/mov/application/ports/`), inyectados como `OseDeps` (patrón `ScanDeps`).

```typescript
// modules/ose/application/use-cases/deps.ts
import type {
  MovRepository,        // C1 mov-repository.ts: integrar(): Promise<UUID>, getById, listByType, listByAnchor, deprecate
  BeliefRepository,     // C1 belief-repository.ts: appendObservation, findActiveExpectation,
                        //   listPendingExpectations, setExpectationOutcome, writeDisjunctiveBelief  (EXACTAMENTE estos 5)
  SubstanceRepository,  // C1 substance-repository.ts: getObject, traverseLinks
  NormativeRepository,  // C1 normative-repository.ts: listActiveObjectives, listActiveConstraints, listGaps, updateGapObservedSide
  DynamicsRepository,   // C1 dynamics-repository.ts: writePerturbation, writeEpisode, listEpisodesBySignature
} from "@/modules/mov/application/ports"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository" // append() — procedencia + traza P-OUT
import type { RelevanceThresholdPort } from "@/modules/ose/application/ports/relevance-threshold-port"
import type { UUID } from "@/types/shared"

/**
 * Dependencias del OSE. SOLO lectura/escritura A/B/E del MOV (C1) + auditoría + reloj/correlación.
 * dynamics: Pick<…,"writePerturbation"> => writeEpisode queda FUERA (OSE INV-9).
 * normative: Pick<…,"listGaps"|"updateGapObservedSide"> => NUNCA crea/prioriza brecha (OSE INV-9).
 * NO incluye CausalGraphRepository (ver §3.1, AQ-OSE-LECTURA-TRAYECTORIA). Frontera I-0.
 */
export type OseDeps = {
  readonly mov: MovRepository
  readonly belief: BeliefRepository
  readonly substance: SubstanceRepository
  readonly normative: Pick<NormativeRepository, "listGaps" | "updateGapObservedSide">
  readonly dynamics: Pick<DynamicsRepository, "writePerturbation">
  readonly audit: AuditRepository
  /** Umbral de relevancia como relación de orden (G2). SOLO LECTURA: el OSE NUNCA lo calibra (OSE INV-9 → RECONCILIAR). */
  readonly threshold: RelevanceThresholdPort
  /** Instante de CONOCIMIENTO de la corrida (determinismo), igual que ScanDeps.nowMs. Solo SELLA, nunca decide vencimiento. */
  readonly knowledgeNowMs: number
  /** Correlaciona toda emisión de un lote (igual que ScanDeps.requestId). */
  readonly requestId: UUID
}
```

### 4.2 Composición de los tres puertos (idéntica al diagrama OSE §2)

```
   MUNDO (evento crudo)                AVANCE DEL INSTANTE DE MUNDO
          │                                      │
   perceiveSignal (P-IN)                  sweepExpirations (P-CLK)
   PERCIBIR · G0/G1                       barrido · G0 por vencimiento
   → observacion (B, HECHO)               → hecho negativo (B, HECHO)
          │ (ADMITIDA / INCLASIFICABLE)          │ (vencida_sin_cumplir)
          └──────────────┬───────────────────────┘
                         ▼
            integrateAndMaybeEmit  (efecto interno)
            G2 sorpresa vs modelo vigente
            G3 integrar al MOV (mov.integrar A/B + updateGapObservedSide + setExpectationOutcome)
                         │ threshold.crossesThreshold ?
                         ▼  sí
            dynamics.writePerturbation (P-OUT) + audit.append
            E = { clase, afectadas, magnitud, propagacion }   el OSE NO espera respuesta
                                                              ──────────► ATENDER (FUERA del OSE)
```

La **escritura** (efecto de `G3`) y la **lectura** del MOV (de los actos aguas abajo) **no son puertos**. El OSE **duerme por defecto** y solo se mueve por `perceiveSignal` o `sweepExpirations`.

### 4.3 Contrato del umbral — UNA sola forma (corrección de la doble materialización)

Se unifica a **un solo puerto async de SOLO LECTURA**, coherente con `OseDeps` tenant-scoped y con que el origen del umbral es externo y calibrado por RECONCILIAR (AQ-OSE-UMBRAL). Se **elimina** la versión "función pura síncrona" del borrador.

```typescript
// modules/ose/application/ports/relevance-threshold-port.ts
import type { Surprise } from "@/modules/ose/domain/surprise"
import type { UUID } from "@/types/shared"

/** Lee la cuantificación del umbral. El OSE NUNCA la escribe (OSE INV-9: calibra RECONCILIAR).
 *  Provee una RELACIÓN DE ORDEN (suficiente/insuficiente) de forma fija; la cuantificación es contenido
 *  (MOTOR "Paso E"/"blindaje forma/contenido"). NO existe ningún puerto de umbral en C1: su origen/seed es AQ-OSE-UMBRAL. */
export interface RelevanceThresholdPort {
  /** true ⇔ la sorpresa medida SUPERA el umbral vigente para este contexto (OSE §2 P-OUT precondición). */
  crossesThreshold(tenantId: UUID, surprise: Surprise, context: ThresholdContext): Promise<boolean>
}

/** "cuánto está en juego" (MOTOR Paso E: proximidad a objetivos/restricciones/brechas).
 *  Es INSUMO DE ORDEN leído de D, NO un ranking de salience (eso sería ATENDER, OSE INV-6). */
export type ThresholdContext = { readonly afectadas: readonly UUID[]; readonly nearObjectives: boolean }
```

---

## 5. Contratos de entrada

### 5.1 Tipos de dominio del OSE (`modules/ose/domain`) — transporte de frontera, no entidades del MOV

```typescript
// modules/ose/domain/raw-signal.ts — lo que cruza P-IN; NO es todavía una observacion (OSE §2 P-IN "evento crudo SIN TIPAR")
import type { Granularidad, EstatusEpistemico } from "@/modules/mov/domain/sellos"
import type { UUID } from "@/types/shared"

/** Evento crudo candidato a observacion. Cruzar la frontera NO concede estatus (G0/G1).
 *  SIN tipoDeclarado (corrección de refutador): el evento es sin tipar; la INCLASIFICABILIDAD se decide
 *  porque el SUJETO anclado no corresponde a ningún tipo del catálogo, no por un tipo que declare el emisor
 *  (evitar "forzar el tipo" que OSE INV-8a prohíbe). */
export type RawSignal = {
  readonly contenido: Record<string, unknown>
  readonly sujetoRef: UUID | null              // referente A declarado cuando el emisor lo conoce; el anclaje NO recorre causalidad
  readonly procedencia: { sourceAuthority: string | null; fiabilidad: number | null; commonSourceKey: string | null }
  readonly instanteDeMundo: string             // cuándo ocurrió (ISO-8601)
  readonly granularidad: Granularidad
  readonly certezaTemporal: EstatusEpistemico   // el "cuándo" también es HECHO/INFERENCIA/HIPOTESIS (MOV §6.2)
  readonly instanteDeConocimiento: string | null // si falta, se toma knowledgeNowMs (OSE §2 P-IN)
}

// modules/ose/domain/admission.ts — acuse de P-IN
export type AdmissionVerdict = "ADMITIDA" | "INADMISIBLE" | "INCLASIFICABLE"
export type IngestAck = { readonly verdict: AdmissionVerdict; readonly observationId: UUID | null }

// modules/ose/domain/surprise.ts — UN SOLO tipo de sorpresa (unificado en todas las secciones, en español).
// magnitud = RELACIÓN DE ORDEN (OSE INV-5); confianza heredada por Eslabón Débil (OSE INV-3).
import type { EntidadMov } from "@/modules/mov/domain/entidad-mov"
export type Surprise = {
  readonly magnitud: number
  readonly confianza: number | null
  /** La expectativa contra la que se midió, si la había (B3); null = medida vs estado vigente del MOV. */
  readonly medidaContra: EntidadMov | null
}
```

### 5.2 `P-IN` — `perceiveSignal` (ingesta · `G0` por señal + `G1`)

*Materializa PERCIBIR (frontera de entrada) y los gates `G0-a` (OSE §4.0) y `G1` (OSE §4.1 A2). Refleja OSE §2 P-IN: tres veredictos, no devuelve interpretación.*

```typescript
// modules/ose/application/use-cases/perceive-signal.ts
import type { OseDeps } from "./deps"
import type { RawSignal } from "@/modules/ose/domain/raw-signal"
import type { IngestAck } from "@/modules/ose/domain/admission"

/**
 * P-IN. Ingiere UNA señal cruda, la ancla y la sella como `observacion` (única vía de HECHO, OSE INV-2)
 * y —si ADMITIDA o INCLASIFICABLE— la entrega a integrateAndMaybeEmit (G2→G3). Devuelve solo el acuse.
 *
 * Ramas (OSE §2 P-IN, mutuamente excluyentes):
 *  - ADMITIDA       → procedencia trazable + anclable → continúa a G2.
 *  - INADMISIBLE    → procedencia desconocida → NO se sella HECHO; se registra la incertidumbre en
 *                     audit_events; NO contamina el MOV (OSE INV-1 rama "no se puede sellar"; C1 MOV_NO_PROVENANCE).
 *  - INCLASIFICABLE → anclable pero el SUJETO no corresponde a ningún tipo del catálogo → observacion con
 *                     attrs.inclasificable=true (apertura ontológica, OSE INV-8a); sigue el flujo, puede sorprender.
 */
export async function perceiveSignal(deps: OseDeps, input: { tenantId: UUID; raw: RawSignal }): Promise<IngestAck>
```

**Precondición (garantiza el llamante).** El evento porta procedencia trazable; cruzar la frontera no concede estatus (OSE §2 P-IN). **Quién construye `RawSignal` desde tablas operacionales reales** (work_orders, invoices, WhatsApp) NO está prescrito → **AQ-OSE-BINDING-PERCIBIR** / **AQ-OSE-SUMINISTRO-PROVENANCE** (heredan C1 AQ-BINDING-OPERACIONAL, AQ-PROCEDENCIA-SCHEMA).

**Postcondiciones.** Si `ADMITIDA`/`INCLASIFICABLE`: una `observacion` inmutable (`estatus=HECHO`, ambos sellos completos, `OSE INV-1`/`INV-2`), anclada vía arista `ancla` (C1 `mov_relacion='ancla'`, OSE §2 P-IN "no recorre causalidad"), dos relojes separados (`OSE INV-4`). El **id de la observación lo sella el propio OSE** (`stampObservation`) antes de llamar `belief.appendObservation(obs): Promise<void>`; **no se consume retorno** (firma real de C1).

**Errores.** `OSE_NO_PROVENANCE`→`MOV_NO_PROVENANCE` (abstención, `OSE INV-1`), `MOV_FORBIDDEN` (sin permiso de tenant), `OSE_INVALID_WORLD_INSTANT`.

### 5.3 `P-CLK` — `sweepExpirations` (barrido de Vencimiento · `G0` por vencimiento)

*Materializa el segundo origen legítimo de `G0` (OSE §4.0 G0-b, §4.2). Combustible externo = avance del **instante de mundo**, no temporizador interno (`OSE INV-8b`). Patrón de implementación idéntico a `scanOverdueWorkOrders`: cron + service-role + escrituras condicionales exactamente-una-vez + per-tenant try/catch + `errorSamples`.*

```typescript
// modules/ose/application/use-cases/sweep-expirations.ts
import type { OseDeps } from "./deps"
import type { UUID } from "@/types/shared"

export type SweepInput = { readonly worldInstant: string; readonly page?: number; readonly pageSize?: number } // ISO-8601
export type SweepReport = {
  readonly expectativasVencidas: readonly UUID[]   // transitadas a 'vencida_sin_cumplir' esta llamada
  readonly perturbacionesEmitidas: readonly UUID[] // subconjunto cuya sorpresa cruzó umbral
  readonly errors: number
  readonly errorSamples: readonly string[]
}

/**
 * P-CLK. Barre `expectativa` con ventana finita y horizonte sellado cuyo BORDE fue CRUZADO por el avance del
 * INSTANTE DE MUNDO (worldInstant), vía belief.listPendingExpectations (índice mov_creencia_vencimiento_idx de C1).
 * Por cada vencida-sin-cumplir:
 *   B2  ausencia como hecho negativo: estatus=HECHO, procedencia=barrido del OSE, instante_de_mundo = fin del
 *       horizonte vencido, instante_de_conocimiento = knowledgeNowMs (los DOS relojes: el de mundo DECIDE el
 *       vencimiento; el de conocimiento solo SELLA; OSE §2 P-CLK / INV-4).
 *   B3  mide sorpresa de la ausencia contra ESA misma expectativa (G2, sin fórmula de composición; OSE §4.2 B3).
 *   B4  integra (G3, igual que A4) y, si sorpresa>umbral, emite por P-OUT; si no, cierre silencioso.
 *   y transita expectativa.resultado='vencida_sin_cumplir' UNA vez vía belief.setExpectationOutcome
 *       (vencimiento_procesado, OSE INV-8b). Borde no cruzado → no se reevalúa; ya procesado → no se re-transita.
 *
 * NO diagnostica por qué (DIAGNOSTICAR) ni lee el vencimiento como veredicto de decisión (RECONCILIAR, OSE INV-9).
 * El productor del worldInstant (cron/evento/tick) NO está prescrito → AQ-OSE-RELOJ-MUNDO. Aislamiento por-expectativa.
 */
export async function sweepExpirations(deps: OseDeps, input: SweepInput): Promise<SweepReport>
```

**Precondiciones (OSE §2 P-CLK).** Combustible externo (`PRE`: `worldInstant`); solo `expectativa` con horizonte sellado finito (`CHECK mov_b3_horizonte` de C1); cruce evaluado por la **relación de orden del eje sellado** en la propia expectativa (el OSE no presupone uniforme/calendárico/pausable).

**Errores.** `MOV_EXPECTATION_NOT_DUE` (borde no cruzado), `MOV_EXPECTATION_ALREADY_RESOLVED` (re-transición), `OSE_INVALID_WORLD_INSTANT`.

---

## 6. Contratos de salida — `P-OUT` (emisión de `perturbacion`, decisión de `G3`)

`P-OUT` es la **escritura de salida** que `integrateAndMaybeEmit`/`G3` realiza sobre `DynamicsRepository.writePerturbation` (C1) cuando `sorpresa > umbral`, más su traza en `audit_events`. Es el límite duro de competencia (OSE §1.2, §2 P-OUT).

```typescript
// modules/ose/domain/perturbation.ts — lo que se escribe (mapea a mov_dinamica E2 de C1, sin DDL nuevo)
import type { Surprise } from "./surprise"
import type { UUID } from "@/types/shared"
export type PerturbationOut = {
  readonly clase: string                 // qué tipo de cambio — SIN dominio prefijado (OSE §2 P-OUT) → AQ-OSE-CLASE-PERTURBACION
  readonly afectadas: readonly UUID[]     // entidades A tocadas directamente → aristas 'afecta' attrs.via='directa'
  readonly magnitud: Surprise             // relación de orden, confianza por Eslabón Débil (OSE INV-3)
  readonly propagacion: readonly UUID[]   // alcanzadas por COHERENCIA vía dependencias existentes → aristas 'afecta' attrs.via='propagacion'
  readonly aperturaOntologica: boolean    // nació de tipo no catalogado (OSE INV-8a)
}
```

**Precondiciones antes de emitir.** `threshold.crossesThreshold(...)` true (`OSE INV-5`); confianza de `magnitud` topada por `applyWeakLink` de C1 (`OSE INV-3`); premisa `confianzaNoEvaluada` ⇒ abstención (no se inventa mínimo).

**Postcondiciones.**
- **POST-OUT-1 — sellado completo (`OSE INV-1`).** La `perturbacion` (E2) porta ambos sellos; se persiste vía `dynamics.writePerturbation`.
- **POST-OUT-2 — NO-JUICIO (`OSE INV-6`, verificable).** NO porta causa/opción/prioridad/score/urgencia/ranking/recomendación. Exigible como `CHECK mov_perturbacion_no_juicio` de C1 (§7, §8.3); cualquier campo de prioridad es estado inalcanzable (Apéndice #7).
- **POST-OUT-3 — propagación = coherencia, no impacto (OSE §2 P-OUT).** `propagacion` = `substance.traverseLinks(...,['dependencia','contencion'],maxDepth)` sobre `vinculo`; **nunca** grafo causal hacia atrás ni estimación de urgencia/tratabilidad. La **profundidad/ciclos** del cierre transitivo NO están acotados por el canon → **AQ-OSE-PROPAGACION-PROFUNDIDAD** (hereda C1 AQ-CICLOS-GRAFO).
- **POST-OUT-4 — procedencia ≠ identidad (OSE §2 P-OUT).** La `observacion`/vencimiento que fundó la perturbación es su procedencia, no la misma entidad.
- **POST-OUT-5 — apertura ontológica (`OSE INV-8a`).** Si nació de territorio no modelado/tipo no catalogado, `aperturaOntologica=true`, sin afirmar qué es.
- **POST-OUT-6 — relatividad de rol (OSE §2 P-OUT).** Se deja la `perturbacion` y se retorna; no espera respuesta; no es un `compromiso`.
- **POST-OUT-7 — cardinalidad.** Por cada disparo con `sorpresa > umbral`, **exactamente una** `perturbacion` con muchas `afectadas[]` (condición de fin F3, OSE §4.4: "exactamente una perturbacion … por disparo"; `afectadas` = "referencias a las entidades A tocadas", OSE §2 P-OUT). Si tras releer el canon el agrupamiento de varias entidades sorprendidas en una sola perturbación no resultara literal, queda **AQ-OSE-CARDINALIDAD-PERTURBACION**.

**Ramas.** `sorpresa > umbral` → EMITE; `sorpresa ≤ umbral` → NO EMITE (absorción): confirma la `expectativa`, refresca Sello Temporal; confirmación de baja confianza no eleva confianza/frescura por encima del confirmador (`OSE INV-3`); re-confirmación que comparte procedencia+instante de mundo+contenido no mueve la frescura (`OSE INV-4`).

**Errores.** `MOV_PERTURBATION_HAS_PRIORITY` (CHECK C1), `MOV_ESLABON_DEBIL_VIOLADO` / `MOV_PREMISA_NO_EVALUADA` (de `mov_integrar`), `MOV_FORBIDDEN`.

**Traza.** Tras escribir, `audit.append({ eventType:"ose.perturbacion", actorType:"system", actorId:null, tenantId, subjectType:"mov_perturbacion", subjectId, action:"ose.perturbacion", requestId: deps.requestId, source:"ose-engine", metadata:{ clase, magnitud } })` — procedencia, no juicio (firma real de `AuditEvent`).

---

## 7. Invariantes (cada uno → guard de aplicación y/o constraint apoyada en C1)

| Invariante (OSE) | Constraint/RPC de C1 | Guard de aplicación del OSE | Error |
|---|---|---|---|
| **INV-1** sellado completo + procedencia | `mov_assert_sellos`; `MOV.I-0` | P-IN se **abstiene** sin procedencia (rama INADMISIBLE); no completa sellos después | `OSE_NO_PROVENANCE` / `MOV_SELLO_INCOMPLETO` |
| **INV-2** HECHO solo observación | `CHECK mov_creencia_hecho`, `mov_sustancia_hecho` | `appendObservation` única vía a HECHO; G3 deriva A como INFERENCIA | `MOV_HECHO_SOLO_OBSERVACION` |
| **INV-3** Eslabón Débil / no promoción silenciosa | RPC topa contra `min(premisas)`; `confianzaNoEvaluada`=incomparable; `mov_block_silent_promotion` | reusa `applyWeakLink` de C1 antes de integrar; topa `magnitud.confianza` en P-OUT | `MOV_ESLABON_DEBIL_VIOLADO` / `MOV_PREMISA_NO_EVALUADA` / `MOV_SILENT_PROMOTION` |
| **INV-4** dos relojes / re-anclaje | columnas separadas `NOT NULL`; `mov_creencia_reanclaje_idx` | re-anclaje (misma procedencia+instante de mundo+contenido) no infla confianza ni mueve frescura | `MOV_CLOCK_COLLAPSE` |
| **INV-5** sorpresa vs modelo vigente | `findActiveExpectation`; estado A por `getObject`/`listByAnchor` | `measureSurprise` (§9): sin expectativa, aparición SÍ sorprende; redundante=0; **prohibido inventar expectativa retroactiva** | (dominio; tests U-3, F-OSE-3) |
| **INV-6** no-juicio (salida máxima = perturbación) | `mov_perturbacion_no_juicio`; `MOV_OSE_NO_ESCRIBE_C_D` | no escribe C/D, no rankea, no diagnostica, no proyecta opciones | `MOV_PERTURBATION_HAS_PRIORITY` / `MOV_OSE_NO_ESCRIBE_C_D` |
| **INV-7** conflicto = creencia disyuntiva | `writeDisjunctiveBelief` + aristas `disyuncion` | G2 ante procedencias incompatibles **representa** (no elige/promedia/sobrescribe); emite sin sugerir cuál creer | `MOV_CONFLICT_AVERAGED` / `MOV_CONFLICT_SILENT_OVERWRITE` |
| **INV-8a** apertura ontológica | `observacion` con `attrs.inclasificable=true`; sellada igual | P-IN rama INCLASIFICABLE; no fuerza tipo, no crea #18; sigue el flujo y puede sorprender | (no rechazo; sí marca) |
| **INV-8b** barrido de Vencimiento | `mov_creencia_vencimiento_idx`; `vencimiento_procesado`; `setExpectationOutcome` 1 vez | P-CLK barre solo bordes cruzados por instante de mundo; no reevalúa no cruzados; sin impulsor interno | `MOV_EXPECTATION_NOT_DUE` / `MOV_EXPECTATION_ALREADY_RESOLVED` |
| **INV-9** corte con RECONCILIAR | `mov_integrar` rechaza C/D; `writeEpisode` SOLO RECONCILIAR | nunca escribe `episodio`, nunca ajusta `relacion_causal`/`trayectoria`, nunca lee vencimiento como veredicto | `MOV_OSE_NO_ESCRIBE_C_D` |
| **Regla de cierre** (abstención por operación) | `mov_integrar` `security definer`: cualquier RAISE revierte; MOV nunca observable incoherente — **por operación** | si una mutación no satisface invariantes, el OSE **se abstiene**; cascada multi-escritura → AQ-OSE-ATOMICIDAD-MULTIESCRITURA | (propiedad de estado) |
| **I-0** frontera de escritura A/B/E | GRANT/RLS + RPC rechazan C/D | no escribe C/D/`intervencion`/`episodio` ni proyección de rol | `MOV_OSE_NO_ESCRIBE_C_D` |

---

## 8. Modelo de datos (delta sobre C1)

> El OSE **NO define** el modelo de datos del MOV (C1, CERRADO). Aquí solo el **delta**: qué piezas de C1 reusa y cómo persiste su única salida (la `perturbacion`).

### 8.1 Qué reusa de C1 (verificado en disco) — y qué NO redefine

| Necesidad del OSE | Pieza de C1 (reuso, NO redefinición) | Cita |
|---|---|---|
| Escribir entidad A/B (resultado de G3) atómicamente | `MovRepository.integrar(): Promise<UUID>` | C1 §4.3, §10.2 |
| Introducir HECHO (observación / hecho negativo) | `BeliefRepository.appendObservation(obs): Promise<void>` (sella el id el OSE) | C1 §4.3, §5.2 |
| Hallar la `expectativa` vigente (G2) | `BeliefRepository.findActiveExpectation(tenant, subjectRef, atWorldInstant)` | C1 §4.3, §5; `OSE INV-5` |
| Listar expectativas con borde finito sin cumplir (P-CLK) | `BeliefRepository.listPendingExpectations` + `mov_creencia_vencimiento_idx` | C1 §4.3, §8.5; `OSE P-CLK` |
| Transitar `expectativa.resultado` UNA vez | `BeliefRepository.setExpectationOutcome` + `vencimiento_procesado` | C1 §4.3, §5.3, §8.3; `OSE INV-8b` |
| Representar conflicto sin resolver | `BeliefRepository.writeDisjunctiveBelief` + aristas `disyuncion` | C1 §4.3, §5.4; `OSE INV-7` |
| Estado vigente A (sorpresa sin expectativa) + propagación | `SubstanceRepository.getObject` / `traverseLinks` | C1 §4.3; `OSE INV-5`, `P-OUT` |
| Creencias ancladas / supersesión declarada | `MovRepository.listByAnchor` / `deprecate` | C1 §4.3; `OSE INV-4`, §4.3 |
| Recomputar SOLO el lado observado de una brecha existente | `NormativeRepository.updateGapObservedSide` | C1 §4.3; `OSE INV-9` |
| Persistir la `perturbacion` + sus afectadas | `DynamicsRepository.writePerturbation` | C1 §4.3, §8.3; `OSE P-OUT` |
| Topar confianza/frescura/estatus | `applyWeakLink` (`modules/mov/domain/weak-link.ts`) | C1 §10.1; `OSE INV-3` |
| Procedencia + traza | `AuditRepository.append` sobre `audit_events.metadata` | C1 §2, §8.2; `OSE INV-1` |

**No se redefine:** catálogo de 17 tipos, 5 tablas de familia, `<SELLOS_COMUNES>`, `mov_arista`, enums, RLS, ni `MOV.I-0..I-9`.

### 8.2 La `perturbacion` se persiste como fila `mov_dinamica` E2 (reuso puro — sin DDL nuevo)

```text
mov_dinamica (tipo='perturbacion', familia='E_dinamica')   -- C1 §8.3
  estatus             = 'INFERENCIA'   -- NO es HECHO (OSE INV-2; solo la observacion lo es)
  confianza, frescura = topadas por Eslabón Débil contra la observacion/ausencia que la fundó (OSE INV-3)
  attrs.clase         = qué cambio          -- SIN dominio prefijado (OSE §2 P-OUT) → AQ-OSE-CLASE-PERTURBACION
  attrs.magnitud      = sorpresa (relación de orden, confianza heredada) → AQ-OSE-MAGNITUD-ORDINAL
  attrs.caracter      = atributo canónico E2 (MOV §8; C1 §8.3)
  -- PROHIBIDO attrs.prioridad/score/urgencia/ranking → CHECK mov_perturbacion_no_juicio (C1 §7/§8.3; test F-OSE-2)

mov_arista (relacion='afecta')  origen=perturbacion → destino=cada A; attrs.via='directa' (afectadas) | 'propagacion'
```

> **Honestidad (regla 8).** Que `attrs.magnitud` sea escalar numérico (heredado del sello `numeric`) frente a la exigencia canónica de **relación de orden de forma fija** (`OSE §2 P-OUT`; MOTOR "blindaje forma/contenido") es decisión de representación física, NO ley canónica → **AQ-OSE-MAGNITUD-ORDINAL** (ligada a C1 AQ-CONFIANZA-ORDINAL: `ambiguedad_no_cuantificable` no es comparable con `reducible`).

### 8.3 Estado de control: sin delta de esquema

C1 ya definió `horizonte_vencimiento`, `resultado`, `vencimiento_procesado` y `mov_creencia_vencimiento_idx` "como combustible del barrido OSE P-CLK" (C1 §8.3, §8.5). El OSE las **lee** y **transita** vía los puertos de C1; **no añade columnas ni tablas**.

---

## 9. Flujo interno (G0–G3 + barrido de Vencimiento)

El OSE **duerme por defecto** y solo se mueve por `P-IN` o `P-CLK` (OSE §4.0; G0). Dos flujos comparten G2/G3.

```
        P-IN (señal cruda)                         P-CLK (avance instante de mundo)
              │                                              │
   ┌──────────▼──────────┐                       ┌───────────▼────────────┐
   │ PERCIBIR (G0-a, G1) │                        │ BARRIDO VENCIMIENTO     │
   │ anclar+sellar        │                       │ (G0-b)                  │
   │ → observacion (HECHO)│                       │ → hecho negativo (HECHO)│
   └──────────┬──────────┘                        └───────────┬────────────┘
              │ ADMITIDA/INCLASIFICABLE                         │ borde cruzado, sin cumplir
              └───────────────────┬────────────────────────────┘
                                  ▼
                   G2  medir SORPRESA vs modelo VIGENTE (INV-5)
                       con expectativa: desviación / sin ella: vs estado vigente
                                  ▼
                   G3  INTEGRAR (orden interno fijo, OSE §4.1 A4):
                       1 actualizar sustancia A (solo el objeto)  → mov.integrar(A)
                         (flujo_recurso: agotamiento previsible → reemitir expectativa con horizonte)
                       2 recomputar lado observado de brecha D    → normative.updateGapObservedSide
                       3 reemitir/cerrar expectativa B (NO ajusta trayectoria C)
                       4 sellos derivados + Eslabón Débil (applyWeakLink)
                                  │ threshold.crossesThreshold ?
                       ┌──────────┴───────────┐
                  sí  ▼                       ▼  no
        P-OUT: dynamics.writePerturbation   absorción: confirma,
        {clase,afectadas,magnitud,           refresca frescura (INV-3/INV-4)
         propagacion} + audit.append         cierre silencioso
                  │
                  └──► ATENDER (FUERA del OSE; no espera respuesta)
```

- **G1 (OSE §4.1 A2):** procedencia trazable + anclable → ADMITIDA; sin procedencia → INADMISIBLE (no contamina el MOV); anclable sin tipo de catálogo → INCLASIFICABLE (sigue). Evidencia insuficiente: se rebaja `confianza`, nunca se descarta.
- **G2 (OSE §4.1 A3 / §4.2 B3; INV-5):** contra el **estado vigente**. Aparición/llegada no modelada SÍ sorprende; re-observación redundante = sorpresa nula. **Prohibido** inventar expectativa retroactiva.
- **G3 (OSE §4.1 A4; INV-6):** escribe **solo A/B/E**; `mov_integrar` rechaza C/D. Recomputa **solo** el lado observado de la brecha (`OSE INV-9`); **no ajusta `trayectoria`** ni escribe `episodio`. `flujo_recurso`: si `proyeccion_agotamiento` anticipa cruzar un referente, reemite la `expectativa` con `horizonte_vencimiento = instante de mundo proyectado del cruce`, para que P-CLK la barra (OSE §4.1 A4 paso 3; Apéndice #13).
- **Barrido (OSE §4.2):** ausencia = HECHO negativo (instante de mundo = fin del horizonte; instante de conocimiento = ahora, solo para sellar, `OSE INV-4`). Entra a G2/G3 igual que una observación. Transita **una sola vez** (`OSE INV-8b`).

---

## 10. Pseudocódigo

> Estilo TypeScript de caso de uso. Se apoya **exactamente** en los puertos reales de C1 (no se inventa ninguno). Las operaciones que el borrador hacía con métodos inexistentes (`findByWorldFact`, `findIncompatibleActive`, `reissueOrClose`) se reexpresan con `listByAnchor` + `findActiveExpectation` + `deprecate` + `writeDisjunctiveBelief` + `setExpectationOutcome`; el residual real va a **AQ-OSE-PUERTOS-C1-FALTANTES**.

### 10.1 `perceiveSignal` (P-IN → G1 → G2 → G3)

```typescript
async function perceiveSignal(deps: OseDeps, input: { tenantId: UUID; raw: RawSignal }): Promise<IngestAck> {
  const { tenantId, raw } = input
  // ── PERCIBIR / G1 (OSE §4.1 A1–A2) ──────────────────────────────────────────
  if (!raw.procedencia.sourceAuthority) {                       // OSE INV-1 rama "no se puede sellar"
    await deps.audit.append({ eventType: "ose.inadmisible", actorType: "system", action: "ose.inadmisible",
      tenantId, requestId: deps.requestId, source: "ose-engine", metadata: { reason: "no_provenance" } })
    return { verdict: "INADMISIBLE", observationId: null }       // NO contamina el MOV
  }
  const anchor = raw.sujetoRef ? await deps.substance.getObject(tenantId, raw.sujetoRef) : null
  const inclasificable = anchor !== null && !esTipoDelCatalogo(anchor)   // OSE INV-8a (decide por el SUJETO anclado)

  // RAMA reproceso/re-anclaje (rama 6, OSE INV-4): identidad del hecho por su sello (clave canónica → AQ-OSE-IDENTIDAD-REANCLAJE).
  // Con los métodos REALES de C1: localizar candidatos por ancla y comparar sello/contenido en dominio.
  const ancladas = await deps.mov.listByAnchor(tenantId, raw.sujetoRef ?? anchorlessKey(raw), ["observacion"])
  const prior = ancladas.find(o => mismaRealidad(o, raw))       // misma procedencia + instante de mundo + contenido
  if (prior) return { verdict: inclasificable ? "INCLASIFICABLE" : "ADMITIDA", observationId: prior.id /* no-op: no infla (INV-3/INV-4) */ }

  // El OSE SELLA el id ANTES de escribir; appendObservation devuelve void (firma real de C1) → NO se consume retorno.
  const obs = stampObservation(tenantId, raw, { inclasificable, knowledgeNowMs: deps.knowledgeNowMs }) // estatus=HECHO; ambos sellos
  await deps.belief.appendObservation(obs)                       // única vía de HECHO (C1 §5.2)
  // crea la arista 'ancla' obs→A vía mov.integrar(familia 'B_creencia', aristas:[{relacion:'ancla',...}])

  // ── G2 + G3 (efecto interno, NO un puerto) ─────────────────────────────────
  await integrateAndMaybeEmit(deps, { tenantId, trigger: obs })
  return { verdict: inclasificable ? "INCLASIFICABLE" : "ADMITIDA", observationId: obs.id }
}
```

### 10.2 `integrateAndMaybeEmit` (G2 + G3, compartido por P-IN y P-CLK)

```typescript
async function integrateAndMaybeEmit(deps: OseDeps, ctx: { tenantId: UUID; trigger: EntidadMov; expiringExpectation?: EntidadMov }): Promise<void> {
  const { tenantId, trigger } = ctx

  // ── G2: SORPRESA vs modelo vigente (INV-5) ─────────────────────────────────
  const exp = ctx.expiringExpectation
    ?? await deps.belief.findActiveExpectation(tenantId, sujetoRefOf(trigger), trigger.tiempo.instanteDeMundo)
  // RAMA conflicto (INV-7): otra creencia vigente de OTRA procedencia, incompatible y admisible, hallada por ancla
  const vigentes = await deps.mov.listByAnchor(tenantId, sujetoRefOf(trigger), ["observacion", "inferencia"])
  const rival = vigentes.find(v => distintaProcedencia(v, trigger) && incompatible(v, trigger)) // predicado de incompatibilidad → AQ-OSE-CONFLICTO-DETECCION
  let surprise: Surprise
  if (rival) {
    await deps.belief.writeDisjunctiveBelief([asHipotesis(rival), asHipotesis(trigger)], repartirMasa(rival, trigger), /*persistente*/ false)
    surprise = measureSurprise(observableOf(trigger), null, estadoVigente(vigentes))   // vs modelo vigente, NO vs la fuente rival
  } else {
    surprise = measureSurprise(observableOf(trigger), exp ? expectacionOf(exp) : null, estadoVigente(vigentes))
  }

  // ── G3: integrar (escritura A/B/E; orden interno fijo OSE §4.1 A4) ──────────
  // 1. SUSTANCIA A (solo el objeto); HIPOTESIS/INFERENCIA, NUNCA HECHO derivado (INV-2). Eslabón Débil con applyWeakLink (INV-3).
  const aState = applyWeakLink(deriveSubstanceState(trigger), loadPremises([trigger.id]))
  if ("abstain" in aState) return                                // PREMISA_NO_EVALUADA → abstención (Regla de cierre)
  await deps.mov.integrar({ tenantId, familia: "A_sustancia", entidad: sealDerived(aState, "INFERENCIA", trigger) })

  //    flujo_recurso: agotamiento previsible → ARMAR expectativa con horizonte (paso 3; Apéndice #13)
  const proj = recomputeDepletion(trigger)
  if (proj?.crossesReferent) {
    await deps.mov.integrar({ tenantId, familia: "B_creencia",
      entidad: sealExpectation(proj, /*horizonte_vencimiento*/ proj.crossWorldInstant, trigger) }) // P-CLK la capturará
  }

  // 2. recomputar SOLO el lado observado de la brecha EXISTENTE (INV-9; NO crea/prioriza/explica)
  for (const gap of await deps.normative.listGaps(tenantId, { onlyOpen: true })) {
    if (refiereAlTrigger(gap, trigger)) {
      await deps.normative.updateGapObservedSide(tenantId, gap.id, recomputeMagnitud(gap, aState), recomputeTendencia(gap, aState), transitionSeal(deps))
    }
    // si NO existe brecha para una distancia observada: el OSE NO la crea (sería D, prohibido INV-6) → AQ-OSE-AUTORIA-BRECHA
  }

  // 3. reemitir/cerrar la expectativa afectada — NO ajusta trayectoria C (INV-9). Con métodos reales de C1:
  if (exp && !ctx.expiringExpectation) {
    // cerrar = transitar resultado (setExpectationOutcome); reemitir = nueva expectativa vía mov.integrar(B). NO existe reissueOrClose en C1.
    await deps.belief.setExpectationOutcome(tenantId, exp.id, outcomeFrom(surprise), transitionSeal(deps))
  }

  // 5. decisión de perturbación
  if (await deps.threshold.crossesThreshold(tenantId, surprise, { afectadas: directAffected(trigger), nearObjectives: cercaDeObjetivos(trigger) })) {
    const reached = await deps.substance.traverseLinks(tenantId, sujetoRefOf(trigger), ["dependencia", "contencion"], MAX_DEPTH) // AQ-OSE-PROPAGACION-PROFUNDIDAD
    const pert = sealPerturbation(tenantId, {
      clase: classifyChange(trigger),                 // SIN dominio prefijado (AQ-OSE-CLASE-PERTURBACION)
      afectadas: directAffected(trigger),
      magnitud: surprise,                              // relación de orden, confianza heredada (INV-3)
      propagacion: reached.map(e => e.destinoId),
      aperturaOntologica: esInclasificable(trigger),   // INV-8a
    }, /*procedencia*/ trigger, deps)
    await deps.dynamics.writePerturbation(pert, [...pert.attrs.afectadas, ...pert.attrs.propagacion]) // CHECK mov_perturbacion_no_juicio (INV-6)
    await deps.audit.append({ eventType: "ose.perturbacion", actorType: "system", action: "ose.perturbacion",
      tenantId, subjectType: "mov_perturbacion", subjectId: pert.id, requestId: deps.requestId, source: "ose-engine",
      metadata: { clase: pert.attrs.clase } })
    // P-OUT: dejar y volver. El OSE NO espera respuesta (relatividad de rol). FIN.
  }
  // RAMA confirma: sorpresa ≤ umbral → cierre silencioso; refresca frescura SOLO si no es re-anclaje (INV-3/INV-4). FIN.
}
```

### 10.3 `sweepExpirations` (P-CLK → G0-b → G2 → G3)

```typescript
async function sweepExpirations(deps: OseDeps, input: SweepInput): Promise<SweepReport> {
  const report: SweepReport = { expectativasVencidas: [], perturbacionesEmitidas: [], errors: 0, errorSamples: [] }
  let page = input.page ?? 0
  for (;;) {
    const pending = await deps.belief.listPendingExpectations(input.tenantId!, page++, input.pageSize ?? 200) // índice de C1
    if (pending.length === 0) break
    for (const exp of pending) {
      try {
        if (!borderCrossed(exp, input.worldInstant)) continue          // DENTRO DE VENTANA: sin señal (OSE §2 P-CLK)
        if (exp.attrs.vencimiento_procesado) continue                  // una sola vez (INV-8b)
        // B2: AUSENCIA = HECHO negativo (mundo = fin del horizonte; conocimiento = ahora SOLO para sellar; INV-4)
        const negativeFact = stampNegativeFact(exp, input.worldInstant, deps.knowledgeNowMs) // estatus=HECHO, procedencia=barrido OSE
        await deps.belief.appendObservation(negativeFact)
        await deps.belief.setExpectationOutcome(exp.tenantId, exp.id, "vencida_sin_cumplir", transitionSeal(deps)) // transita 1 vez (INV-2/INV-8b)
        // B3/B4: G2 sorpresa de la ausencia vs ESA misma expectativa, luego G3 (idéntico a A4) y quizá P-OUT
        await integrateAndMaybeEmit(deps, { tenantId: exp.tenantId, trigger: negativeFact, expiringExpectation: exp })
      } catch (e) {
        report.errors += 1
        if (report.errorSamples.length < 5) (report.errorSamples as string[]).push(`${exp.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  // FIN: sin bordes cruzados sin resolver (F5); el motor vuelve a DORMIR (F6).
  return report
}
```

### 10.4 `measureSurprise` (G2, función pura — `modules/ose/domain/surprise.ts`)

```typescript
// OSE INV-5: sorpresa = UNA cantidad como relación de orden, sin taxonomía, sin fórmula de composición.
// La FORMA concreta NO está prescrita por el canon → AQ-OSE-MEDICION-SORPRESA. Firma comprometida; cuerpo a implementar.
export function measureSurprise(
  observed: { valor: unknown; confianza: number | null; frescura: number },
  expectation: { prediccion: unknown; tolerancia: number; confianza: number | null; frescura: number } | null,
  vigentState: { existeEnModelo: boolean; valorVigente: unknown } | null,
): Surprise {
  if (expectation) {
    return { magnitud: desviacion(observed.valor, expectation.prediccion, expectation.tolerancia),
             confianza: minConf(observed, expectation), medidaContra: /* la expectativa */ null }
  }
  const aparicionNoModelada = !vigentState || !vigentState.existeEnModelo   // SÍ sorprende (INV-5; refuta Apéndice #12)
  if (aparicionNoModelada) return { magnitud: ORDEN_APARICION, confianza: observed.confianza, medidaContra: null }
  return { magnitud: esRedundante(observed.valor, vigentState!.valorVigente) ? 0 : ORDEN_CAMBIO,  // redundante = sorpresa nula
           confianza: observed.confianza, medidaContra: null }
}
```

> **Funciones de dominio aún sin firma prescrita por el canon** (necesarias para que U-/F-OSE corran HOY): `desviacion`, `minConf`, `esRedundante`, `borderCrossed`, `classifyChange`, `stampObservation`, `stampNegativeFact`, `sealPerturbation`, `mismaRealidad`, `incompatible`, `esTipoDelCatalogo`. La afirmación "ejecutable HOY" (§13) aplica **una vez implementadas estas funciones puras**; su forma concreta de `measureSurprise`/`classifyChange` queda en AQ-OSE-MEDICION-SORPRESA / AQ-OSE-CLASE-PERTURBACION; el predicado `incompatible` en AQ-OSE-CONFLICTO-DETECCION.

---

## 11. Pruebas unitarias

> **Disciplina de mocking (heredada de C1, verificada).** El repo NO tiene Postgres de test (`vitest.config.ts`: `environment:"node"`, `include:["**/*.test.ts"]`, alias `@`→raíz). El OSE es lógica de dominio/aplicación pura; toda persistencia entra por los puertos de C1, **mockeados con `vi.fn()`** (patrón de `modules/inventory/application/use-cases/apply-stock-movement.test.ts`: cast `as unknown as XRepository`, UUID deterministas, `.rejects.toMatchObject({ code })`, aserción de no-invocación). El SQL/CHECK ya está cubierto por C1; el OSE prueba que **invoca correctamente** los puertos con la carga sellada o que **se abstiene**.
>
> **Doble fiel a las firmas REALES de C1:** `mov.integrar` devuelve el **UUID de la ENTIDAD escrita por familia** (A/B/E), NO el id de la observación; `belief.appendObservation` devuelve `undefined` (void) — el id de la observación lo conoce el OSE por `stampObservation`. El doble NO incluye métodos fantasma (`findByWorldFact`/`findIncompatibleActive`/`reissueOrClose` no existen).

```ts
// modules/ose/application/use-cases/ose.test.ts — andamiaje común (N.0)
import { describe, expect, it, vi } from "vitest"
const TENANT = "11111111-1111-1111-1111-111111111111"
const OBJ = "22222222-2222-2222-2222-222222222222", EXP = "33333333-3333-3333-3333-333333333333"

function setup(opts: { activeExpectation?: EntidadMov | null; pendingExpectations?: EntidadMov[]
                       anchored?: EntidadMov[]; linkEdges?: AristaMov[]; crosses?: boolean }) {
  const integrar          = vi.fn(async () => "55555555-5555-5555-5555-555555555555")  // UUID de la ENTIDAD escrita (no la obs)
  const appendObservation = vi.fn().mockResolvedValue(undefined)                        // void (firma real C1)
  const setOutcome        = vi.fn().mockResolvedValue(undefined)
  const writeDisjunctive  = vi.fn().mockResolvedValue(undefined)
  const writePerturbation = vi.fn().mockResolvedValue(undefined)                        // P-OUT
  const writeEpisode      = vi.fn()                                                     // PROHIBIDO al OSE (INV-9): queda en 0
  const updateGap         = vi.fn().mockResolvedValue(undefined)
  const append            = vi.fn().mockResolvedValue(undefined)
  const mov = { integrar, getById: vi.fn(), listByType: vi.fn(),
                listByAnchor: vi.fn().mockResolvedValue(opts.anchored ?? []), deprecate: vi.fn() } as unknown as MovRepository
  const belief = { appendObservation, findActiveExpectation: vi.fn().mockResolvedValue(opts.activeExpectation ?? null),
                   listPendingExpectations: vi.fn().mockResolvedValue(opts.pendingExpectations ?? []),
                   setExpectationOutcome: setOutcome, writeDisjunctiveBelief: writeDisjunctive } as unknown as BeliefRepository
  const substance = { getObject: vi.fn().mockResolvedValue(null),
                      traverseLinks: vi.fn().mockResolvedValue(opts.linkEdges ?? []) } as unknown as SubstanceRepository
  const normative = { listGaps: vi.fn().mockResolvedValue([]), updateGapObservedSide: updateGap } as unknown as
                      Pick<NormativeRepository,"listGaps"|"updateGapObservedSide">
  const dynamics  = { writePerturbation } as unknown as Pick<DynamicsRepository,"writePerturbation">
  const audit     = { append } as unknown as AuditRepository
  const threshold = { crossesThreshold: vi.fn().mockResolvedValue(opts.crosses ?? false) } as RelevanceThresholdPort
  const deps = { mov, belief, substance, normative, dynamics, audit, threshold,
                 knowledgeNowMs: Date.parse("2026-06-29T00:00:00Z"), requestId: "44444444-4444-4444-4444-444444444444" }
  return { deps, integrar, appendObservation, setOutcome, writeDisjunctive, writePerturbation, writeEpisode, updateGap }
}
```

| # | Rama / Invariante | Arrange | Act | Assert |
|---|---|---|---|---|
| **U-1** | confirma (`§4.1 A4 §confirma`, NO EMITE, INV-5) | expectativa vigente; observación en tolerancia; `crosses:false` | `perceiveSignal` | `integrar` ≥1; `writePerturbation` 0 — "el silencio está ganado" |
| **U-2** | sorprende (EMITE, INV-5/INV-6) | expectativa vigente; obs fuera de tolerancia; `crosses:true` | `perceiveSignal` | `writePerturbation` 1 con `{clase,afectadas,magnitud,propagacion}`; `magnitud` como relación de orden |
| **U-3** | aparición sin expectativa SÍ emite (INV-5; refuta Apéndice #12) | `findActiveExpectation`→null; `anchored:[]`; `crosses:true` | `perceiveSignal` (señal novedad) | `findActiveExpectation` llamado; `writePerturbation` 1; medido vs estado vigente; NO se fabricó expectativa |
| **U-4** | re-observación redundante = sorpresa nula (INV-5/INV-3) | `anchored:[estado idéntico]`; sin expectativa | `perceiveSignal` (redundante) | `writePerturbation` 0; si `integrar`, no eleva confianza/frescura |
| **U-5** | vence + reloj de mundo (P-CLK, INV-8b/INV-4) | `pendingExpectations:[horizonte 2026-06-20, resultado 'sin_contrastar']`; `crosses:true` | `sweepExpirations({worldInstant:'2026-06-21'})` | `setOutcome(...,'vencida_sin_cumplir',...)` 1; hecho negativo: mundo=fin horizonte, conocimiento=`knowledgeNowMs`; `writePerturbation` 1 |
| **U-6** | vencimiento se transita UNA vez (INV-8b) | igual U-5; 2º avance sin nuevo cruce | dos `sweepExpirations` | `setOutcome` exactamente 1 en total |
| **U-7** | dentro de ventana → sin señal (P-CLK) | `pendingExpectations:[borde no cruzado]` | `sweepExpirations` antes del borde | `setOutcome` 0; `writePerturbation` 0 |
| **U-8** | conflicto → disyuntiva (INV-7) | `anchored:[obs P1]`; entra obs P2 incompatible | `perceiveSignal` (P2) | `writeDisjunctiveBelief` 1 con 2 ramas selladas; no elige/promedia; `writePerturbation` 1 sin sugerir cuál |
| **U-9** | tipo no catalogado → inclasificable + emite (INV-8a) | señal cuyo sujeto no es del catálogo; `crosses:true` | `perceiveSignal` | observación con `attrs.inclasificable=true`, `estatus=HECHO`; no forzada; `writePerturbation` 1 con `aperturaOntologica` |
| **U-10** | reproceso/re-anclaje no-op (§4.3, INV-4) | obs previa absorbida; entra misma procedencia+mundo+contenido | `perceiveSignal` | `writePerturbation` 0; frescura no se mueve; no suma evidencia |
| **U-11** | supersesión por corrección (§4.3) | misma procedencia+mundo + contenido distinto + corrección declarada | `perceiveSignal` | `deprecate` invocado; `writeDisjunctiveBelief` 0 |
| **U-12** | `flujo_recurso` arma expectativa con horizonte (§4.1 A4 paso 3; refuta Apéndice #13) | obs que actualiza proyección de agotamiento con cruce previsible | `perceiveSignal` | `integrar` reemite expectativa con `horizonte_vencimiento`=instante proyectado |
| **U-13** | Eslabón Débil en la magnitud (INV-3) | obs baja confianza confirma expectativa de mayor confianza | `perceiveSignal` | no eleva confianza/frescura; `magnitud` no declara más certeza que la premisa más débil |
| **U-14** | sello completo o abstención (INV-1, Regla de cierre) | señal sin procedencia | `perceiveSignal` | `verdict='INADMISIBLE'`; `integrar` 0; `appendObservation` 0; MOV intacto |
| **U-15** | propagación = solo dependencias existentes (P-OUT) | obs supra-umbral; `linkEdges:[2 por vinculo]`; `crosses:true` | `perceiveSignal` | `writePerturbation` recibe `propagacion` = esas 2; no estima impacto/urgencia ni recorre causal |

```ts
it("U-3: aparición sin expectativa SÍ emite — sorpresa por novedad vs estado vigente (INV-5)", async () => {
  const { deps, writePerturbation } = setup({ activeExpectation: null, anchored: [], crosses: true })
  await perceiveSignal(deps, { tenantId: TENANT, raw: señal({ sujetoRef: OBJ, esLlegadaNoModelada: true }) })
  expect(deps.belief.findActiveExpectation).toHaveBeenCalled()
  expect(writePerturbation).toHaveBeenCalledTimes(1)   // emite contra el modelo vigente, no exige expectativa
})

it("U-5: vence por instante de MUNDO + perturbación (P-CLK, INV-8b, INV-4)", async () => {
  const { deps, setOutcome, writePerturbation } = setup({
    pendingExpectations: [expectacion({ horizonte: "2026-06-20T00:00:00Z", resultado: "sin_contrastar" })], crosses: true })
  await sweepExpirations(deps, { tenantId: TENANT, worldInstant: "2026-06-21T00:00:00Z" })
  expect(setOutcome).toHaveBeenCalledTimes(1)
  expect(setOutcome).toHaveBeenCalledWith(TENANT, EXP, "vencida_sin_cumplir",
    expect.objectContaining({ instanteDeMundo: "2026-06-20T00:00:00Z", instanteDeConocimiento: expect.any(String) }))
  expect(writePerturbation).toHaveBeenCalledTimes(1)
})
```

---

## 12. Pruebas de falsación (deben FALLAR — el estado prohibido es inalcanzable)

Espejan el **Apéndice de falsación del OSE (§6, 14 estados)**. El test pasa si y solo si el OSE **rechaza, se abstiene o duerme** en vez de alcanzar el estado prohibido. Las de SQL/RPC dependen de **AQ-OSE-TEST-INFRA** (cubiertas por C1); las de dominio/aplicación corren HOY (una vez implementadas las funciones puras de §10.4).

| # | Estado prohibido (Apéndice §6) | Resultado exigido | Capa |
|---|---|---|---|
| **F-OSE-1** | OSE escribe `trayectoria`/`episodio` o lee vencimiento como veredicto (#11, INV-9) | `writeEpisode` 0; 0 escrituras C; solo `setExpectationOutcome` + (quizá) `writePerturbation` | dominio |
| **F-OSE-2** | `perturbacion` con prioridad/score/urgencia/ranking (#7, INV-6) | imposible por construcción (`PerturbationOut` no expone esos campos); si se inyecta, `MOV_PERTURBATION_HAS_PRIORITY` (CHECK C1) | dominio + CHECK |
| **F-OSE-3** | inventar expectativa retroactiva (#6, INV-5) | rechazado: sin expectativa mide vs estado vigente (U-3); `findActiveExpectation` puede dar null y el flujo sigue | dominio |
| **F-OSE-4** | vencimiento decidido por reloj de CONOCIMIENTO (#10, INV-4) | `setOutcome` 0 cuando el borde de MUNDO no fue cruzado aunque "ahora" sea posterior | dominio |
| **F-OSE-5** | vencimiento sin borde cruzado, o emitido dos veces (#10, INV-8b) | F-OSE-4 (sin cruce→0) + U-6 (2º barrido→0 re-disparos) | dominio |
| **F-OSE-6** | aparición/inclasificable que NO emite por carecer de expectativa (#12, INV-5) | U-3/U-9 exigen `writePerturbation` 1; un OSE que no emite aquí **falla** (centinela de regresión) | dominio |
| **F-OSE-7** | cruce previsible de `flujo_recurso` no armado como expectativa (#13, §4.1 A4 paso 3) | U-12 exige la expectativa con `horizonte_vencimiento`; su ausencia hace fallar | dominio |
| **F-OSE-8** | conflicto resuelto/promediado/sobrescrito (#8, INV-7) | `writeDisjunctiveBelief` exigido (U-8); promedio/sobrescritura → `MOV_CONFLICT_AVERAGED`/`MOV_CONFLICT_SILENT_OVERWRITE` | dominio + RPC |
| **F-OSE-9** | tipo no catalogado descartado o forzado (#9, INV-8a) | U-9 exige `attrs.inclasificable=true` y emisión; descarte/forzado → fallo | dominio + RPC |
| **F-OSE-10** | confianza/frescura supera premisa o sube por reenvío/tiempo (#3/#4, INV-3/INV-4) | U-13 (no eleva) + U-10 (re-anclaje no-op); en escritura `MOV_ESLABON_DEBIL_VIOLADO` | dominio + RPC |
| **F-OSE-11** | dos entradas mismo mundo+procedencia como evidencia acumulada (#5, INV-4) | U-10 (no-op; no mueve frescura ni infla confianza) | dominio |
| **F-OSE-12** | salida que no sea `perturbacion` (`relacion_causal`/brecha generada/`intervencion`) (#7, INV-6) | imposible: el OSE solo expone `integrar`(A/B/E)+`writePerturbation`; `integrar` C/D → `MOV_OSE_NO_ESCRIBE_C_D` | dominio + RPC |
| **F-OSE-13** | trabajar sin combustible externo (#14, G0) | sin `perceiveSignal` ni `sweepExpirations` → 0 lecturas/escrituras; duerme | dominio |
| **F-OSE-14** | sello incompleto o HECHO sin observación (#1/#2, INV-1/INV-2) | estado derivado en G3 es INFERENCIA; `MOV_HECHO_SOLO_OBSERVACION`/`MOV_SELLO_INCOMPLETO` | dominio + CHECK |

```ts
it("F-OSE-1: leer un VENCIMIENTO de decisión NO produce episodio ni ajusta trayectoria (INV-9, Apéndice #11)", async () => {
  const { deps, setOutcome, writeEpisode } = setup({ pendingExpectations: [expectacion({ horizonte: "2026-06-20T00:00:00Z" })] })
  // writeEpisode no está en OseDeps.dynamics (Pick<…,"writePerturbation">): inaccesible por construcción.
  await sweepExpirations(deps, { tenantId: TENANT, worldInstant: "2026-06-21T00:00:00Z" })
  expect(setOutcome).toHaveBeenCalledTimes(1)        // el OSE provee el DISPARO
  expect(writeEpisode).not.toHaveBeenCalled()        // el APRENDIZAJE es de RECONCILIAR, nunca del OSE
})

it("F-OSE-13: sin combustible externo el OSE DUERME (G0, Apéndice #14)", async () => {
  const { deps, integrar, writePerturbation, setOutcome } = setup({})
  // No se invoca perceiveSignal (P-IN) ni sweepExpirations (P-CLK): no hay impulsor interno.
  expect(integrar).not.toHaveBeenCalled(); expect(writePerturbation).not.toHaveBeenCalled(); expect(setOutcome).not.toHaveBeenCalled()
})
```

> **Lectura correcta de "deben fallar".** F-OSE-3/6/7/9/13 son tests que la implementación **debe hacer pasar** afirmando la negación del estado prohibido; "deben fallar" significa que si el OSE **alcanzara** el estado prohibido, el test falla (centinela de regresión). F-OSE-2/12 son **imposibles por construcción**: la superficie del OSE no expone la operación prohibida; la última línea de defensa son los CHECK/RPC de C1.

---

## 13. Criterios de aceptación

El OSE está **terminado** solo si TODOS son verdaderos. Cada criterio enlaza a pruebas y ancla canónica.

- **CA-OSE-1 (tres puertos, exactamente).** Superficie pública = `perceiveSignal` (P-IN), `sweepExpirations` (P-CLK) y el efecto de salida sobre `dynamics.writePerturbation` (P-OUT). **No** existe `PerturbationSink` ni puerto read/write del MOV propio del OSE. *(OSE §2.)*
- **CA-OSE-2 (confirma = silencio).** `sorpresa ≤ umbral` ⇒ `integrar`/transición y `writePerturbation` 0. U-1, U-4, U-13. *(OSE §4.1 §confirma, INV-3.)*
- **CA-OSE-3 (sorprende = perturbación sellada).** `sorpresa > umbral` ⇒ exactamente una `perturbacion` por disparo (POST-OUT-7), `{clase,afectadas,magnitud,propagacion}`, sin prioridad/score/ranking. U-2, U-15; F-OSE-2. *(OSE §2 P-OUT, INV-6.)*
- **CA-OSE-4 (sorpresa vs modelo vigente, sin expectativa retroactiva).** Aparición/llegada/inclasificable no modelada emite midiendo contra estado vigente; jamás fabrica expectativa. U-3, U-9; F-OSE-3, F-OSE-6. *(INV-5; Apéndice #6, #12.)*
- **CA-OSE-5 (vencimiento por instante de mundo).** Transita `vencida_sin_cumplir` solo si el borde de **mundo** fue cruzado; "ahora" solo sella. U-5, U-7; F-OSE-4. *(INV-8b/INV-4, P-CLK; Apéndice #10.)*
- **CA-OSE-6 (vencimiento idempotente).** Una sola vez; borde no cruzado no se reevalúa. U-6, U-7. *(INV-8b.)*
- **CA-OSE-7 (cruce previsible armado).** `flujo_recurso` con agotamiento previsible reemite expectativa con horizonte, capturable por P-CLK. U-12; F-OSE-7. *(OSE §4.1 A4 paso 3; Apéndice #13.)*
- **CA-OSE-8 (conflicto representado).** Procedencias incompatibles ⇒ `creencia disyuntiva`, sin elegir/promediar/sobrescribir. U-8; F-OSE-8. *(INV-7; Apéndice #8.)*
- **CA-OSE-9 (apertura ontológica).** Tipo no catalogado ⇒ `observacion inclasificable`, sellada, que emite; nunca descartada/forzada/tipo #18. U-9; F-OSE-9. *(INV-8a; Apéndice #9.)*
- **CA-OSE-10 (reproceso = no-op; corrección = supersesión).** Misma procedencia+mundo+contenido ⇒ no infla; contenido distinto+corrección ⇒ deprecia, no disyuntiva. U-10, U-11; F-OSE-10, F-OSE-11. *(§4.3; Apéndice #4, #5.)*
- **CA-OSE-11 (frontera de no-juicio intacta — F4).** `writeEpisode` 0; 0 escrituras C/D; ninguna inferencia causal, opción, recomendación ni `brecha` generada. F-OSE-1, F-OSE-12. *(INV-9, INV-6, I-0; Apéndice #11.)*
- **CA-OSE-12 (sellado o abstención — Regla de cierre).** Sin procedencia/reloj ⇒ se abstiene; MOV nunca incoherente **por operación** (la cascada multi-escritura queda en AQ-OSE-ATOMICIDAD-MULTIESCRITURA). U-14; F-OSE-14. *(INV-1; Apéndice #1, #2.)*
- **CA-OSE-13 (duerme sin combustible — F6).** Sin P-IN ni P-CLK, cero trabajo; al terminar, DORMIR. F-OSE-13. *(G0; Apéndice #14.)*
- **CA-OSE-14 (condición de fin verificable).** Por cada disparo: (F1) anclada/sellada; (F2) estado/brecha-observada/expectativas coherentes; (F3) una `perturbacion` si supra-umbral, ninguna si no; (F5) sin bordes cruzados sin resolver; (F6) DORMIR. Cubierto por U-1..U-15. *(OSE §4.4.)*
- **CA-OSE-15 (cero conceptos nuevos).** Ningún tipo/acto/invariante fuera del canon; reusa los puertos REALES de C1 y `mov_integrar`; no inventa métodos de C1; no redefine el modelo de datos. *(OSE §1.1; C1 R1–R3.)*

> **Dependencia de infraestructura.** CA-OSE-3 (CHECK no-juicio), CA-OSE-8/10/11/12 en su parte RPC/SQL y todo `rejects` de `mov_integrar` heredan **AQ-OSE-TEST-INFRA** de C1. Las de **dominio/aplicación** (U-1..U-15, F-OSE-1/3/4/5/6/7/9/11/13) corren HOY con el `vitest` actual mockeando los puertos de C1, una vez implementadas las funciones puras de §10.4.

---

## Tabla de trazabilidad (artefacto → fuente canónica por nombre)

| Artefacto de esta spec | Fuente canónica |
|---|---|
| OSE = Ritmo de Comprensión + Vencimiento | OSE §1.1 |
| `P-IN` = `perceiveSignal` (señal cruda, G0-a, G1) | OSE §2 P-IN; §4.1 A1–A2 |
| `P-CLK` = `sweepExpirations` (avance instante de mundo, G0-b) | OSE §2 P-CLK; §4.0 G0-b; §4.2 |
| `P-OUT` = efecto sobre `dynamics.writePerturbation` (NO interface nueva) | OSE §2 ("escritura = efecto interno de COMPRENDER") |
| `perturbacion` = {clase, afectadas, magnitud, propagacion} | OSE §2 P-OUT; MOV §8 E2 |
| propagación = dependencias `vinculo` (no impacto, no causal) | OSE §2 P-OUT; C1 `traverseLinks` §4.3 |
| Gates G0–G3 (y solo esos) | OSE §1.1, §4.0–§4.2 |
| Orden interno fijo de G3 (A4 pasos 1–5) | OSE §4.1 A4 |
| agotamiento previsible → expectativa con horizonte | OSE §4.1 A4 paso 3; Apéndice #13 |
| sorpresa vs modelo vigente / sin expectativa retroactiva | OSE INV-5; Apéndice #6, #12 |
| dos relojes; vencimiento por instante de mundo | OSE INV-4, INV-8b; §2 P-CLK |
| INV-1..INV-9, INV-8a/8b, "Regla de cierre", I-0 | OSE §2, §3 |
| seis ramas; condición de fin F1–F6 | OSE §4.4 |
| Apéndice de falsación (14 estados) | OSE §6 |
| `mov_integrar` (única escritura ATÓMICA de entidad A/B/E) | C1 §4.3, §10.2; `record_payment` |
| `appendObservation` (void; única vía de HECHO) | C1 §4.3, §5.2 |
| `findActiveExpectation` / `listPendingExpectations` / `setExpectationOutcome` | C1 §4.3, §5.3; `mov_creencia_vencimiento_idx` §8.5 |
| `writeDisjunctiveBelief` (conflicto, no resuelve) | C1 §4.3, §5.4; INV-7 |
| `updateGapObservedSide` (solo lado observado) | C1 §4.3, §8.3 nota; INV-9 |
| `writePerturbation`; `writeEpisode` SOLO RECONCILIAR | C1 §4.3 (línea 208–209); INV-9 |
| `traverseLinks` / `getObject` | C1 §4.3 |
| `applyWeakLink` (confianza/frescura/estatus ≤ premisa más débil) | C1 §10.1; INV-3 |
| `mov_perturbacion_no_juicio` CHECK; `MOV_OSE_NO_ESCRIBE_C_D` (42501) | C1 §7, §8.3; INV-6 |
| `mov_creencia_hecho` / `mov_sustancia_hecho` (HECHO solo observación) | C1 §8.3; INV-2 |
| `vencimiento_procesado` (una sola vez) | C1 §8.3; INV-8b |
| Patrón cron/`ScanDeps`/`requestId`/`errorSamples`/per-tenant try-catch | `scan-overdue-work-orders.ts` |
| `AuditRepository.append` (procedencia + traza) | `audit-repository.ts`; `audit-event.ts`; INV-1 |
| Patrón de test (`vi.fn`, UUID const, `setup()`) | `apply-stock-movement.test.ts`; `vitest.config.ts` (`environment:"node"`) |
| `RelevanceThresholdPort` (solo lectura; origen = AQ) | OSE INV-5, §2 P-OUT; MOTOR "Paso E"/"blindaje forma/contenido" |

---

## Architectural Questions (vacíos del canon registrados, NO resueltos)

> Consolidadas a **una entrada por vacío, id único**, con referencia a la AQ-madre de C1 que cada una hereda.

- **AQ-OSE-ATOMICIDAD-MULTIESCRITURA.** La "Regla de cierre" (OSE §3) exige que el MOV nunca sea observable incoherente; `mov_integrar` lo garantiza **por operación**. Pero un único `G3` se descompone en varias escrituras independientes de C1 (`mov.integrar(A)`, `mov.integrar(B)`, `updateGapObservedSide`, `setExpectationOutcome`, `writePerturbation`), cada una atómica por sí sola → posible **estado intermedio observable** entre ellas. El canon no acota cómo garantizar atómico-o-abstener a través de la cascada. Hereda C1 AQ-BLOQUEO-SUBGRAFO. No resuelto.
- **AQ-OSE-PUERTOS-C1-FALTANTES.** La rama re-anclaje (rama 6, INV-4), la rama conflicto (INV-7) y reemitir/cerrar la expectativa (G3 paso 3) se expresan en esta spec con los 5 métodos reales de `BeliefRepository` + `listByAnchor`/`deprecate`, pero no hay en C1 un método dedicado a "hallar por hecho de mundo", "hallar incompatible vigente" ni "reemitir-o-cerrar". Ampliar C1 = modificar un componente CERRADO. Si la expresión con los métodos reales resultara insuficiente o cara, se evaluaría un delta coordinado con C1. No resuelto.
- **AQ-OSE-UMBRAL.** Dónde vive la **cuantificación** del umbral de relevancia y quién la siembra para un tenant. El canon fija solo su FORMA (relación de orden suficiente/insuficiente; MOTOR "Paso E"/"blindaje forma/contenido") y prohíbe al OSE calibrarla (INV-9: calibra RECONCILIAR). No fija tabla de persistencia, valor inicial ni acto provisionador antes de que exista RECONCILIAR. Aislado tras `RelevanceThresholdPort` (solo lectura); origen/seed sin resolver. No resuelto.
- **AQ-OSE-MEDICION-SORPRESA.** INV-5 fija la sorpresa como una cantidad (relación de orden) sin fórmula de composición y prohíbe la taxonomía discrepancia/cobertura/caducidad (podada). El canon NO especifica la función concreta (`measureSurprise`, §10.4) que produce la magnitud a partir de `{prediccion, tolerancia}` o del estado vigente, ni cómo combina con la confianza heredada sin inventar aritmética. Hereda C1 AQ-CONFIANZA-ORDINAL. No resuelto.
- **AQ-OSE-MAGNITUD-ORDINAL.** La magnitud es canónicamente relación de orden de forma fija (OSE §2 P-OUT), pero se persiste como escalar `numeric`/`number`. ¿Un escalar la representa válidamente, o se necesita un comparador por tipo de incertidumbre? Hereda C1 AQ-CONFIANZA-ORDINAL (`ambiguedad_no_cuantificable` no comparable con `reducible`). No resuelto.
- **AQ-OSE-CLASE-PERTURBACION.** `attrs.clase` NO tiene dominio de valores prefijado (OSE §2 P-OUT: "cualquier ejemplo es ilustrativo, no normativo"). ¿Texto libre, enum abierto validado en dominio, o derivado de la clase de cambio? Fijar un enum cerrado contradiría el canon; dejarlo libre dificulta el consumo de ATENDER. La forma de `classifyChange` sin prescribir. No resuelto.
- **AQ-OSE-PROPAGACION-PROFUNDIDAD.** `P-OUT.propagacion` recorre dependencias vía `traverseLinks(...,maxDepth)`, pero el canon NO fija la profundidad del cierre transitivo ni cómo cortar ciclos (`MAX_DEPTH` es placeholder). Hereda C1 AQ-CICLOS-GRAFO. No resuelto.
- **AQ-OSE-RELOJ-MUNDO.** `P-CLK` se dispara por avance del instante de mundo (combustible externo, INV-8b), pero el canon no nombra QUÉ del stack lo emite (cron/evento/tick) ni con qué cadencia. Un scheduler que el OSE programe violaría "no se enciende solo" (G0; Apéndice #14); un cron que tome `now()` como `worldInstant` arriesga colapsar los dos relojes (INV-4). De dónde viene legítimamente el tick queda sin dueño. Hereda C1 AQ-BINDING-OPERACIONAL. No resuelto.
- **AQ-OSE-IDENTIDAD-REANCLAJE.** INV-4 exige distinguir re-anclaje (misma procedencia + instante de mundo + contenido) de corrección declarada y de conflicto, pero no fija la clave canónica del hecho de mundo (`(sourceAuthority, instante_de_mundo, contentHash)`? `commonSourceKey`?), ni la señal de "corrección declarada". El guard de absorción (§6) y las ramas 4/6 dependen de ella. Hereda C1 AQ-IDENTIDAD-HECHO. No resuelto.
- **AQ-OSE-AUTORIA-BRECHA.** G3 paso 2 recomputa el lado observado de una brecha EXISTENTE (`updateGapObservedSide`, INV-9), pero el canon NO nombra qué acto CREA la `brecha` por primera vez ni cómo el OSE descubre qué brechas refieren al trigger sin recorrer causalidad. Si la brecha no existe, el paso 2 no tiene sobre qué operar; el OSE no puede crearla (sería D, prohibido INV-6). Hereda C1 AQ-AUTORIA-BRECHA y AQ-BRECHA-PARTICION. No resuelto (operativamente bloqueante).
- **AQ-OSE-CONFLICTO-DETECCION.** La rama conflicto (INV-7) requiere hallar "otra creencia vigente de procedencia distinta, incompatible y admisible" sobre la misma referencia. El canon define la creencia disyuntiva pero NO el **predicado de incompatibilidad** entre dos estados observados (¿igualdad de campo? ¿solape de rangos? ¿contradicción semántica?). Interpretación de ingeniería, no concepto canónico literal. No resuelto.
- **AQ-OSE-BINDING-PERCIBIR.** El canon no especifica QUIÉN construye el `RawSignal` desde tablas operacionales reales (work_orders, invoices, WhatsApp) con `sourceAuthority`/`commonSourceKey` poblados — los "órganos sensoriales". Es "valor de tenant, no esquema". Hereda C1 AQ-BINDING-OPERACIONAL y AQ-PROCEDENCIA-SCHEMA. No resuelto en este componente.
- **AQ-OSE-LECTURA-TRAYECTORIA.** El canon admite que el OSE LEE `trayectoria` (C) como insumo de sorpresa "si existía proyección" (OSE §2 P-OUT). Esta spec, por minimalismo, NO inyecta `CausalGraphRepository` en `OseDeps` (mide vs `expectativa` B3 y estado A). Si se demostrara que el OSE necesita leer `trayectoria` directamente, se añadiría `Pick<CausalGraphRepository,"getTrajectory">` (solo lectura, jamás escritura, coherente con INV-9). No resuelto.
- **AQ-OSE-MULTI-SUJETO.** El OSE hereda de C1 AQ-TENANT-vs-SUJETO (tenant ≡ sujeto-del-MOV como supuesto no resuelto). Sus casos de uso son tenant-scoped. Si un tenant albergara >1 sujeto operacional, la frontera de un barrido y de una perturbación debería revisarse. No resuelto.
- **AQ-OSE-PROPAGACION-CRUZA-SUJETO.** `traverseLinks` recorre `vinculo` **sin filtro de sujeto**; si AQ-OSE-MULTI-SUJETO se materializa (>1 sujeto por tenant), `P-OUT.afectadas` y la propagación de coherencia podrían cruzar entre sujetos distintos del mismo tenant, contaminando un MOV con la sorpresa de otro. Falta un predicado de pertenencia-a-sujeto que el canon no provee. Hereda C1 AQ-TENANT-vs-SUJETO. No resuelto.
- **AQ-OSE-CARDINALIDAD-PERTURBACION.** Esta spec asume **una** `perturbacion` con muchas `afectadas[]` por disparo (POST-OUT-7, leído de F3 + "afectadas = entidades A tocadas", OSE §2/§4.4). Si tras releer el canon el agrupamiento de varias entidades sorprendidas en una sola perturbación no resultara literal (vs "una por entidad sorprendida"), queda abierto. No resuelto.
- **AQ-OSE-TEST-INFRA.** El repo no tiene Postgres de test (`vitest environment:node`, Supabase mockeado). Las pruebas que tocan SQL/RPC (parte de F-OSE-2/8/9/10/12/14) NO son ejecutables hoy; solo las de dominio/aplicación puro lo son. Requiere globalSetup con Supabase local / pg-mem. Hereda C1 AQ-TEST-INFRA. No resuelto.
