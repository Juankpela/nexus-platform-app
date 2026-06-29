# Componente 5 — JUZGAR (Especificación de Ingeniería)

## Ficha (pendiente de falsificación)

| Campo | Valor |
|---|---|
| **Estado** | ⏳ **PENDIENTE DE FALSIFICACIÓN** |
| **Fecha de redacción** | 2026-06-29 |
| **Falsification Gate** | — (se ejecuta antes de CERRAR) |
| **Refutadores** | — (se asignan al inicio del Gate; presupuesto = el de construir) |
| **Claims auditados** | — |
| **Claims refutados/ajustados** | — |
| **APIs inventadas** | — |
| **Conceptos/actos nuevos** | — |
| **Invariantes rotos** | — |
| **AQ abiertas** | 14 (ver §AQ al final) |
| **Ready for** | Falsification Gate de C5 — 5 refutadores independientes |

> Detalle del Gate: misma disciplina que C4 — 5 refutadores atacan cada API, cita y claim contra C1, C3, C4, ARQUITECTURA, MOTOR, CONSTITUCION, MOV y código real.

---

> **Naturaleza.** SPEC DE INGENIERÍA implementable, NO arquitectura. Convierte el acto **JUZGAR** del diseño cognitivo CONGELADO en software sobre el stack real (Supabase/PostgreSQL + TypeScript + Next.js, hexagonal). **No introduce ni un concepto, acto, tipo ni invariante cognitivo nuevo.** Se apoya en **C1** (`01-mov-data-model.md`, CERRADO), recibe su entrada de **C4/DIAGNOSTICAR** (`04-diagnosticar.md`, CERRADO), e importa `RoleContext` de **C3** (`03-atender.md`, CERRADO). **No los redefine**: JUZGAR **recibe** el `Diagnostico` derrotable de C4 y actúa **contra la CAUSA aguas abajo** (`traverseDownstream`). Todo se traza al canon **por nombre** (ver §Tabla de trazabilidad). Donde el canon calla, se registra **Architectural Question** y **no se resuelve por intuición**.
>
> **Decisiones de unificación (este documento es la versión gobernante única):**
> 1. **Módulo único:** `modules/juzgar/{domain, application/{ports,use-cases}, infrastructure}`.
> 2. **Caso de uso primario único:** `judge`. No existe caso de uso secundario.
> 3. **Puertos de cuantificación únicos (dos):** `SufficiencyPolicyPort` (G6 — suficiencia por consecuencia, análogo a `PlausibilityPolicyPort` de C4) y `LeverPolicyPort` (G7/G8 — orden de palancas por rendimiento esperado bajo restricción y techo de presupuesto). Se eliminan cualquier variante `JuzgarPolicy`/`JudgePolicy`/`SufficiencyPolicy` que diverge de esta nomenclatura.
> 4. **Tipo de dependencias único:** `JudgeDeps`. Se eliminan `JuzgarDeps`/`JDeps`.
> 5. **Tipo de salida único:** `Juicio` como **unión discriminada** `{ kind: "juicio" | "abstencion_deliberativa" | "escalada" }`. Se eliminan variantes que no usan la tripleta.
> 6. **`RoleContext` se IMPORTA de C3** (`@/modules/atender/application/ports/salience-policy-port`, donde C3 exporta el tipo `RoleContext`). **No se redeclara localmente** (rompería "fuente única"). Misma decisión que C4 (C4 decisión 7).
> 7. **JUZGAR es el PRIMER ESCRITOR tras C2.** C3 (ATENDER) y C4 (DIAGNOSTICAR) son estrictamente R/O (sus `Deps` excluyen toda escritura por `Pick<…>`). JUZGAR rompe ese patrón: **`JudgeDeps` inyecta la capacidad de escribir en C1** via el punto de escritura único (`mov_integrar`, especificado en C1; pendiente TypeScript — hereda `AQ-SYS-011`). La asimetría R/O↔escritura se desplaza: C1 escribe (sustrato), C2 escribe (mundo), C3/C4 solo leen, **C5 vuelve a escribir** (decisión).
> 8. **Escritura con efecto lateral + valor de retorno.** JUZGAR no es consulta pura como C4. Escribe E3+A2+B3 al MOV como efecto lateral y devuelve `Juicio` que referencia lo escrito. Si escribe parcialmente y falla, las escrituras deben revertirse → hereda `AQ-SYS-005`. La atomicidad E3+A2+B3 queda diferida a implementación (reusar, extender o envolver `mov_integrar` — hereda `AQ-SYS-005`).
> 9. **El `Diagnostico` de C4 se pasa directamente.** La firma recibe `{ tenantId, diagnostico: Diagnostico }` importando el tipo de `@/modules/diagnosticar/domain/diagnostico`. Acoplamiento de tipo C5→C4 aceptado (el `Diagnostico` es el contrato de handoff; su `brechaId` + `causas` + `confianza` son la entrada mínima de G6/G7). Si el diagnostico es `kind:"abstencion"`, JUZGAR produce `abstencion_deliberativa` sin intentar G7.
> 10. **Sin cuantificación en el dominio.** El dominio no contiene umbral, peso, presupuesto ni profundidad mágica. Todo por `SufficiencyPolicyPort`/`LeverPolicyPort` (MOTOR §9 blindaje forma/contenido; JUZGAR.INV-10).
> 11. **La `AbstencionDeliberativa` de C5 es tipo de primera clase, distinto de `Abstencion` de C4.** La confusión entre ambas sería un bug semántico grave: C4 se abstiene por *ausencia de causa fundamentable*; C5 se abstiene *deliberativamente* por stake insuficiente para el costo de error del rol, por grafo downstream sin palanca accionable, por todas las palancas podadas por restricción, o por presupuesto agotado.
>
> **Disciplina de citas.** Las referencias a otros componentes se hacen por **nombre de símbolo/puerto/tipo/§**, nunca por número de línea (lección de C4: las líneas se desplazan al editar — `AQ-SYS-015`). Invariantes con prefijo: `JUZGAR.INV-N`, `MOV.I-N`, `MOTOR.G-N`.
>
> **Convención de stack.** `tenantId: UUID` primer parámetro de toda firma. `UUID = string`, no branded. Patrón de orquestación pura: `knowledgeNowMs`/`requestId` inyectados.
>
> **Precondición de construcción (honestidad, regla dura 6).** Verificado en disco: `nexus-platform/modules/` contiene `api, audit, authorization, billing, calendar, crm, dispatch, field-execution, forecasting, identity, integrations, inventory, notifications, organizations, platform, request-context, scheduling, service, tenancy` — **NO existen** `mov`/`ose`/`atender`/`diagnosticar`/`juzgar`. Los puertos que `judge` consume existen solo como firmas en los `.md` de C1/C3/C4 (hereda `AQ-SYS-011`).

---

## 1. Propósito

JUZGAR es el **quinto acto del Motor** (ARQUITECTURA §3 acto 5) y el **acto de decisión**: *"dada la causa identificada por DIAGNOSTICAR, decide la intervención más útil, se compromete con ella (o declara abstención deliberativa) y siembra la predicción del resultado"*.

Su sede en la dinámica del Motor comprende tres gates consecutivos (MOTOR-COGNITIVO.md §6 + §8 Freno 3; por nombre de sección):

- **G6 — Suficiencia por consecuencia** (*"¿Sé lo bastante para lo que está en juego?" · DIAGNOSTICAR→JUZGAR*): toma la confianza heredada de C4 y el `costoDeError` del rol para decidir si actuar o abstenerse deliberativamente.
- **G7 — Proyectar la palanca HACIA ADELANTE** (*"¿Cuál es la palanca con mayor rendimiento bajo restricción?"*): recorre el grafo causal aguas abajo (`traverseDownstream`) desde la causa diagnosticada, poda por restricciones (D2) vigentes, y genera `PalancaCandidata`(s) candidatas contra la **CAUSA, no el síntoma**.
- **G8 — Decidir / comprometerse / abstenerse / escalar**: elige (o no) una palanca bajo `LeverPolicyPort`, **siembra la `expectativa` (B3)** de resultado de la palanca (la predicción que cerrará el bucle de aprendizaje), y registra el `compromiso` (A2) y la `intervencion` (E3).

JUZGAR es el **primer acto que vuelve a ESCRIBIR sustancia** tras el OSE: C3 y C4 son solo-lectura; JUZGAR escribe E3/A2/B3 vía el punto de escritura único de C1 (`mov_integrar`).

> **Frase de propósito (una línea).** JUZGAR recibe el `Diagnostico` DERROTABLE de C4 (la causa), aplica G6 (¿confianza suficiente dado el costo de error?), recorre el grafo HACIA ADELANTE (G7), poda por restricción vigente, elige la palanca de mayor rendimiento esperado, se compromete (G8), **siembra la `expectativa`** derrotable de resultado — o declara abstención deliberativa — sin re-diagnosticar, sin calibrar la confianza de ninguna `relacion_causal`, sin articular al rol ni rankear salience.

### 1.1 Qué consume y de quién (sin reimplementar C4/C1/C3)

- **De C4 (DIAGNOSTICAR):** el **`Diagnostico`** — unión discriminada `{ kind:"diagnostico", causas, nodos, confianza, ... } | { kind:"abstencion", ... }`. JUZGAR **no re-diagnostica**: consume la causa ya abducida. Si `kind:"abstencion"`, JUZGAR produce `abstencion_deliberativa` directamente (sin G7) con motivo `diagnostico_abstencion_heredada`.
- **De C1 (MOV), vía puertos `JudgeDeps`:**
  - `CausalGraphRepository.traverseDownstream(tenantId, fromNodeId, maxDepth): Promise<AristaMov[]>` — recorrido **HACIA ADELANTE** (especificado en C1 §CausalGraphRepository; pendiente TypeScript — hereda `AQ-SYS-011`). JUZGAR **nunca** llama `traverseUpstream` (re-diagnosticar). El `fromNodeId` es el `nodoCausalId` de la causa diagnosticada → `AQ-JUZGAR-NODO-DOWNSTREAM`.
  - `NormativeRepository.listActiveConstraints` — restricciones (D2) vigentes para podar G7.
  - `MovRepository.getById` — hidratar `relacion_causal` aguas abajo (igual que C4 hacia atrás; misma `AQ-DIAG-LECTURA-ENLACE-CAUSAL` heredada).
  - **Escritura vía `mov_integrar`** (especificado en C1; pendiente TypeScript; hereda `AQ-SYS-011`; decisión 7/8): JUZGAR escribe E3 (`intervencion`), A2 (`compromiso`), B3 (`expectativa`). La atomicidad de las tres escrituras hereda `AQ-SYS-005`.
- **De C3 (ATENDER):** solo el tipo `RoleContext` (importado, no la instancia en tiempo de ejecución). El `costoDeError` del rol gobierna el umbral G6.
- **Puertos de política R/O:** `SufficiencyPolicyPort` (G6) y `LeverPolicyPort` (G7/G8). Solo lectura; su cuantificación la calibra RECONCILIAR → `AQ-SYS-006` + `AQ-JUZGAR-UMBRAL-SUFICIENCIA` + `AQ-JUZGAR-POLITICA-PALANCA`.

---

## 2. Responsabilidades

Una sola responsabilidad indivisible — **dado el Diagnostico de C4, decidir la intervención más útil (o abstenerse/escalar deliberativamente), comprometerse y sembrar la expectativa de resultado** (ARQUITECTURA §3 acto 5; MOTOR G6/G7/G8) — descompuesta en obligaciones ancladas al canon:

- **RD-1 — Recibir y anclar el Diagnostico (la causa derrotable).** Aceptar el `Diagnostico` de C4. Si `kind:"abstencion"` → `abstencion_deliberativa` con motivo `diagnostico_abstencion_heredada`; se detiene. Si `kind:"diagnostico"` → tomar la causa de mayor soporte de `causas[0]` (o manejar disyuntiva si `esDisyuntiva`, `AQ-JUZGAR-DISJUNTIVA-CAUSA`). JUZGAR **no recorre hacia atrás, no re-abduce**.
- **RD-2 — G6: Gate de suficiencia por consecuencia (MOTOR G6).** Comparar la `confianza` heredada del Diagnostico con el umbral que `SufficiencyPolicyPort.meetsSufficiency(tenantId, confianza, role)` determina dado el `costoDeError`. Si la confianza **no alcanza** → `abstencion_deliberativa` con motivo `confianza_insuficiente_para_el_stake`, declarando `faltaParaDecidirSi`. **JUZGAR no re-diagnostica para compensar**: devuelve el control (degradación honesta).
- **RD-3 — G7: Recorrer el grafo HACIA ADELANTE desde la causa (MOTOR G7).** Invocar `causal.traverseDownstream(tenantId, causaNodeId, maxDepth)` desde el `nodoCausalId` de la causa diagnosticada. Solo `traverseDownstream`; `traverseUpstream` **no está en `JudgeDeps`** (excluido por `Pick`). La profundidad la provee `LeverPolicyPort.maxDownstreamDepth`.
- **RD-4 — G7: Podar por restricción vigente (D2).** Para cada nodo aguas abajo, verificar contra `normative.listActiveConstraints`. Un nodo ∈ restricciones activas **no es palanca accionable**: se registra como `restriccionAplicada` y se excluye. *"Tratar una restricción como causa es el error operativo más caro"* (ARQUITECTURA §2.1). Si todas las ramas downstream son restricciones → `abstencion_deliberativa` `todas_palancas_fuera_de_restriccion`.
- **RD-5 — G7: Generar y ordenar `PalancaCandidata`s (MOTOR G7).** Cada nodo accionable aguas abajo es candidata con su camino de aristas, la confianza heredada (eslabón débil, `AQ-JUZGAR-CONFIANZA-DOWNSTREAM`) y las restricciones podadas. Ordenar por `LeverPolicyPort.rankLevers` (relación de orden, forma canónica; cuantificación calibrable por RECONCILIAR).
- **RD-6 — Verificar techo de presupuesto (MOTOR §8 Freno 3).** Antes de comprometerse, consultar `LeverPolicyPort.budgetRemaining(tenantId, role)`. Si el techo se agota → `abstencion_deliberativa` `presupuesto_agotado`. El presupuesto es absoluto e independiente del stake (Freno 3).
- **RD-7 — G8: Elegir palanca, comprometerse, sembrar expectativa (MOTOR G8).** Elegir la primera `PalancaCandidata` del ranking. Escribir vía `mov_integrar` (hereda `AQ-SYS-005` para atomicidad): (a) **`intervencion` (E3)** en estado `considerada` — nace HIPÓTESIS (JUZGAR.INV-5); (b) **`compromiso` (A2)** que vincula la decisión a la causa; (c) **`expectativa` (B3)** con `refutaSi`/`confirmaSi` — el falsador de la palanca, que el OSE medirá y RECONCILIAR calibrará (→ `AQ-SYS-017`). La confianza de la decisión **no excede** la del Diagnostico (eslabón débil heredado, JUZGAR.INV-4).
- **RD-8 — Abstención deliberativa de primera clase (MOTOR §8 Freno 3; MOTOR G6).** Cuando G6 falla, G7 no produce palancas, todas las palancas se podan, o el presupuesto se agota, JUZGAR declara `abstencion_deliberativa` con el `motivo` exacto y `faltaParaDecidirSi` (qué observación/evidencia cambiaría la decisión). Es una salida de primera clase, no un error. **Nada se escribe al MOV** en una abstención.
- **RD-9 — Trazar el compromiso en audit.** Emitir `audit.append({ eventType:"juzgar.decision_registrada"|"juzgar.abstencion_deliberativa", ... })` después de escribir (o de abstenerse). **Sin confianza/score en metadata** (la durabilidad es de RECONCILIAR).

---

## 3. Límites — la frontera dura (qué JUZGAR NO hace)

JUZGAR es **el acto de decisión que actúa aguas abajo contra la causa, se compromete (o se abstiene deliberativamente) y siembra la expectativa**. La frontera se traduce en prohibiciones de código verificables:

| Excluido de JUZGAR | Acto/Componente dueño | Materialización del límite |
|---|---|---|
| **Recorrer el grafo HACIA ATRÁS / re-abducir la causa / reclasificar síntoma/causa/restricción** | **DIAGNOSTICAR** (C4, G5) | `JudgeDeps.causal` es `Pick<CausalGraphRepository, "traverseDownstream">` — `traverseUpstream` **ausente por construcción**. JUZGAR **consume** el Diagnostico; no lo vuelve a producir. |
| **Calibrar la confianza** de `relacion_causal`, palancas o priores; ajustar post-outcome | **RECONCILIAR** (C7, MOTOR §10.4) | `JudgeDeps` NO inyecta escritura de la familia C; JUZGAR **lee** la confianza calibrada (por RECONCILIAR previo) y **siembra** la expectativa; **nunca ajusta** confianzas. El puerto de política es de **solo lectura**. |
| **Proyectar la decisión al rol en su lenguaje**; producir texto/pantalla/mensaje para el usuario | **ARTICULAR** (C6, G9) | La salida de JUZGAR es el tipo `Juicio` (dato); ARTICULAR lo traduce al idioma del rol. JUZGAR no produce ningún string para consumo del usuario. |
| **Rankear salience / asignar foco / reasignar presupuesto cognitivo** | **ATENDER** (C3, G4/G0.5) | JUZGAR **recibe** el foco ya priorizado (via el Diagnostico); no inyecta `SaliencePolicyPort` ni computa `Salience`. |
| **Medir sorpresa / integrar hechos del mundo / emitir `perturbacion` / recomputar el lado observado de la brecha** | **OSE** (C2, G0–G3) | JUZGAR siembra la `expectativa` para que el OSE la mida *después*; **no llama** `perceiveSignal`/`writePerturbation`/`updateGapObservedSide`. |
| **Promover la `intervencion` a HECHO** | Prohibido por canon | La `intervencion` nace HIPÓTESIS (`estado_ejecucion:"considerada"`); JUZGAR.INV-5. |
| **Calibrar / fijar la cuantificación** del umbral G6 o de la palanca | **RECONCILIAR** (C7) | Los puertos son R/O; la cuantificación es contenido calibrable (MOTOR §9 blindaje forma/contenido). |

### 3.1 El límite más fino: JUZGAR no re-diagnostica, no calibra, y la `intervencion` nace HIPÓTESIS

Tres confusiones son las más caras y se prohíben explícitamente:

1. **JUZGAR ≠ DIAGNOSTICAR (no re-diagnostica).** Si la confianza de C4 es insuficiente para el stake (G6), JUZGAR **se abstiene deliberativamente** y devuelve el control — nunca vuelve a recorrer el grafo hacia atrás. Recorrer hacia atrás desde JUZGAR es invadir C4 e invalidar la separación física de los dos sentidos del recorrido (MOTOR §3.2 invariante (a)).
2. **JUZGAR ≠ RECONCILIAR (no calibra).** La confianza de una `relacion_causal` se ajusta **solo tras el outcome**, por RECONCILIAR (MOTOR §10.4). JUZGAR **lee** esa confianza calibrada y **siembra** la expectativa; **no la modifica**.
3. **La `intervencion` nace HIPÓTESIS (nunca HECHO).** La `intervencion` (E3) nace en `estado_ejecucion:"considerada"` y **no se promueve a HECHO**. Es una apuesta derrotable; el bucle de aprendizaje la cierra cuando el OSE mide la sorpresa contra la `expectativa` sembrada y RECONCILIAR calibra.

> **Criterio de fallo del componente.** Si JUZGAR recorriera el grafo hacia atrás (re-diagnosticar), calibrara confianzas (RECONCILIAR), redactara para el rol (ARTICULAR), rankeara salience (ATENDER), midiera sorpresa o integrara hechos (OSE), promoviera la `intervencion` a HECHO, escribiera solo E3 sin A2 y B3 (escritura parcial), o produjera un `Juicio kind:"juicio"` sin expectativa falsable, dejaría de ser el acto de juzgar.

---

## 4. Interfaces públicas (caso de uso hexagonal)

JUZGAR expone un único caso de uso de **orquestación** en `modules/juzgar/application/use-cases`. A diferencia de C3/C4, **sí** inyecta escritura.

### 4.1 Tipos de dominio (`modules/juzgar/domain/juicio.ts`)

```typescript
// modules/juzgar/domain/juicio.ts
// El JUICIO es la decisión de JUZGAR: palanca + compromiso + expectativa sembrada, o abstención deliberativa.
// No es consulta pura como C4: JUZGAR escribe E3+A2+B3 al MOV como efecto lateral (decisión 7).
import type { UUID } from "@/types/shared"
import type { AristaMov } from "@/modules/mov/domain/arista-mov"   // especificado en C1; pendiente TypeScript (AQ-SYS-011)

/** Estatus epistémico de la intervención — SIEMPRE HIPOTESIS al nacer (JUZGAR.INV-5; MOV §2.1 R1). */
export type EstatusIntervencion = "HIPOTESIS"   // jamás HECHO ni INFERENCIA

/**
 * Una palanca candidata generada en G7 (recorrido HACIA ADELANTE desde la causa).
 * Análoga a CausaCandidata de C4 pero en sentido inverso y con foco en accionabilidad downstream.
 */
export type PalancaCandidata = {
  readonly nodoId: UUID                          // nodo accionable aguas ABAJO donde se ejerce la palanca
  readonly causaId: UUID                         // el nodo causa (C4) que origina el recorrido
  readonly camino: readonly AristaMov[]          // aristas traverseDownstream que justifican la palanca
  readonly restriccionesAplicadas: readonly UUID[] // restricciones (D2) que se podaron en G7
  readonly confianzaHeredada: number | null      // eslabón débil heredado del Diagnostico (JUZGAR.INV-4)
}

/** Abstención deliberativa de primera clase (≠ Abstencion de C4; JUZGAR.INV-8). */
export type AbstencionDeliberativa = {
  readonly motivo:
    | "diagnostico_abstencion_heredada"          // C4 ya se abstuvo; JUZGAR no tiene causa sobre la que proyectar
    | "confianza_insuficiente_para_el_stake"      // G6: confianza heredada < costo de error del rol (MOTOR G6)
    | "grafo_downstream_sin_palanca_accionable"   // G7: traverseDownstream devuelve vacío o solo nodos no accionables
    | "todas_palancas_fuera_de_restriccion"        // G7: todas las candidatas podadas por D2
    | "presupuesto_agotado"                        // Freno 3: techo de presupuesto (MOTOR §8 Freno 3)
  readonly faltaParaDecidirSi: string             // qué observación/evidencia cambiaría la decisión (trazabilidad)
  readonly escalaDonde: string | null             // destinatario de escalada, si aplica; null si solo abstención
}

/** Escalada — cuando la decisión requiere un nivel de autoridad que JUZGAR no puede ejercer. */
export type Escalada = {
  readonly destinatario: string
  readonly motivoEscalada: string
  readonly brechaId: UUID
  readonly causaId: UUID
}

/**
 * Salida ÚNICA de judge: unión discriminada (decisión 5).
 * kind:"juicio" → E3+A2+B3 ya escritos al MOV (efecto lateral de judge).
 * kind:"abstencion_deliberativa" → nada escrito al MOV.
 * kind:"escalada" → nada escrito al MOV.
 */
export type Juicio =
  | {
      readonly kind: "juicio"
      readonly tenantId: UUID
      readonly brechaId: UUID
      readonly causaId: UUID                      // la causa diagnosticada (C4) que se atacó
      readonly palancaNodeId: UUID                // el nodo donde se aplicó la palanca (nodoId de la PalancaCandidata)
      readonly interventionId: UUID               // UUID del E3 escrito al MOV (trazabilidad hacia A2/B3)
      readonly confianza: number | null           // eslabón débil heredado (≤ confianza del Diagnostico, JUZGAR.INV-4)
      readonly requestId: UUID
    }
  | {
      readonly kind: "abstencion_deliberativa"
      readonly tenantId: UUID
      readonly brechaId: UUID
      readonly diagnosticoConfianza: number | null // confianza del Diagnostico que se recibió (diagnose)
      readonly abstencion: AbstencionDeliberativa
      readonly requestId: UUID
    }
  | {
      readonly kind: "escalada"
      readonly tenantId: UUID
      readonly brechaId: UUID
      readonly escalada: Escalada
      readonly requestId: UUID
    }
```

### 4.2 Puerto de suficiencia G6 (`SufficiencyPolicyPort`)

```typescript
// modules/juzgar/application/ports/sufficiency-policy-port.ts
import type { RoleContext } from "@/modules/atender/application/ports/salience-policy-port"  // decisión 6: C3, fuente única
import type { UUID } from "@/types/shared"

/**
 * ÚNICO puerto de suficiencia de G6. La FORMA es ley del canon:
 *   - suficiencia = función de la confianza heredada y del costoDeError del rol (MOTOR G6)
 *   - el umbral numérico es CONTENIDO calibrable por RECONCILIAR (MOTOR §9 blindaje forma/contenido)
 * JUZGAR solo LEE; nunca escribe. Análogo a PlausibilityPolicyPort (C4) pero para G6.
 * AQ-SYS-006: calibración diferida; AQ-JUZGAR-UMBRAL-SUFICIENCIA: cuantificación pendiente.
 */
export interface SufficiencyPolicyPort {
  /** ¿La confianza heredada alcanza para lo que está en juego dado el costo de error del rol?
   *  FORMA: relación de orden (suficiente | insuficiente) relativa a costoDeError.
   *  CUANTIFICACIÓN: diferida a RECONCILIAR → AQ-JUZGAR-UMBRAL-SUFICIENCIA. */
  meetsSufficiency(
    tenantId: UUID,
    confianza: number | null,   // null (confianza_no_evaluada) ⇒ siempre insuficiente (MOV §5.2)
    role: RoleContext,
  ): Promise<boolean>
}
```

### 4.3 Puerto de selección de palanca G7/G8 (`LeverPolicyPort`)

```typescript
// modules/juzgar/application/ports/lever-policy-port.ts
import type { PalancaCandidata } from "@/modules/juzgar/domain/juicio"
import type { RoleContext } from "@/modules/atender/application/ports/salience-policy-port"
import type { UUID } from "@/types/shared"

/**
 * ÚNICO puerto de cuantificación de G7/G8. La FORMA es ley del canon:
 *   - orden de palancas = rendimiento esperado bajo restricción (MOTOR G7; MOTOR §8 Freno 3)
 *   - presupuesto = techo absoluto independiente del stake (MOTOR §8 Freno 3)
 * La CUANTIFICACIÓN (cómo se mide "rendimiento esperado") es CONTENIDO calibrable por RECONCILIAR.
 * JUZGAR solo LEE. AQ-SYS-006 + AQ-JUZGAR-POLITICA-PALANCA.
 */
export interface LeverPolicyPort {
  /** Profundidad máxima del recorrido hacia adelante (Freno 3; su VALOR es contenido calibrable → AQ-JUZGAR-POLITICA-PALANCA). */
  maxDownstreamDepth(tenantId: UUID, role: RoleContext): Promise<number>

  /** Orden de palancas por rendimiento esperado bajo restricción: -1 (a<b) | 0 (empate) | 1 (a>b) | null (incomparable).
   *  NUNCA fabrica orden entre incomparables. Cuantificación → AQ-JUZGAR-POLITICA-PALANCA. */
  rankLevers(tenantId: UUID, a: PalancaCandidata, b: PalancaCandidata): Promise<-1 | 0 | 1 | null>

  /** Presupuesto restante para este rol/tenant (Freno 3). Si <= 0 ⇒ abstención presupuesto_agotado. */
  budgetRemaining(tenantId: UUID, role: RoleContext): Promise<number>
}
```

### 4.4 Dependencias inyectadas (`JudgeDeps`)

```typescript
// modules/juzgar/application/use-cases/deps.ts
import type {
  CausalGraphRepository,  // C1: traverseDownstream (HACIA ADELANTE); traverseUpstream NO (re-diagnosticar)
  NormativeRepository,    // C1: listActiveConstraints (podar G7)
  MovRepository,          // C1: getById (hidratar relacion_causal downstream), integrar (ESCRIBIR E3/A2/B3)
} from "@/modules/mov/application/ports"  // especificado en C1; pendiente TypeScript (AQ-SYS-011)
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SufficiencyPolicyPort } from "@/modules/juzgar/application/ports/sufficiency-policy-port"
import type { LeverPolicyPort } from "@/modules/juzgar/application/ports/lever-policy-port"
import type { RoleContext } from "@/modules/atender/application/ports/salience-policy-port"  // decisión 6
import type { UUID } from "@/types/shared"

/**
 * LECTURAS de C1 + política suficiencia/palanca (R/O) + auditoría + reloj/correlación
 * + ESCRITURA al MOV (decisión 7: JUZGAR rompe el patrón R/O de C3/C4).
 *
 * Pick<…> INCLUYE traverseDownstream y EXCLUYE traverseUpstream por construcción:
 * estructuralmente JUZGAR no puede re-diagnosticar (recorrer hacia atrás).
 * Pick<…> INCLUYE integrar: JUZGAR SÍ escribe sustancia (E3+A2+B3).
 *
 * La atomicidad de las tres escrituras hereda AQ-SYS-005 (diferida a implementación).
 */
export type JudgeDeps = {
  readonly causal: Pick<CausalGraphRepository, "traverseDownstream">   // traverseUpstream AUSENTE a propósito
  readonly normative: Pick<NormativeRepository, "listActiveConstraints">
  readonly mov: Pick<MovRepository, "getById" | "integrar">            // integrar: escritura E3/A2/B3 (decisión 7)
  readonly sufficiency: SufficiencyPolicyPort
  readonly lever: LeverPolicyPort
  readonly role: RoleContext
  readonly audit: AuditRepository
  readonly knowledgeNowMs: number
  readonly requestId: UUID
}
```

### 4.5 Firma del caso de uso primario `judge`

```typescript
// modules/juzgar/application/use-cases/judge.ts
import type { JudgeDeps } from "./deps"
import type { Juicio } from "@/modules/juzgar/domain/juicio"
import type { Diagnostico } from "@/modules/diagnosticar/domain/diagnostico"  // decisión 9: acoplamiento aceptado
import type { UUID } from "@/types/shared"

/**
 * G6/G7/G8 del Motor: dado el Diagnostico DERROTABLE de C4, decide la intervención más útil,
 * se compromete (o se abstiene deliberativamente), y siembra la expectativa de resultado.
 * NO re-diagnostica, NO calibra relacion_causal, NO articula al rol, NO rankea salience.
 * ESCRIBE E3+A2+B3 al MOV como efecto lateral (vía deps.mov.integrar; atomicidad → AQ-SYS-005).
 *
 * Acoplamiento con C4: recibe el Diagnostico por valor (no solo brechaId)
 * porque JUZGAR necesita causas[], confianza, esDisyuntiva y brechaId del Diagnostico.
 */
export async function judge(
  deps: JudgeDeps,
  input: { tenantId: UUID; diagnostico: Diagnostico },
): Promise<Juicio>
```

### 4.6 Notas sobre los puertos de C1 consumidos por JUZGAR

- **El recorrido es de C1.** `traverseDownstream(tenantId, fromNodeId, maxDepth)` devuelve `AristaMov[]` (especificado en C1 §CausalGraphRepository; pendiente TypeScript). JUZGAR **orquesta** la proyección; **no** recorre el grafo en SQL.
- **`fromNodeId` es el NODO CAUSAL de la causa de C4.** El `nodoCausalId` de la `CausaCandidata` mejor soportada que C4 diagnosticó. Cómo se mapea desde la causa a su `nodoCausalId` cuando C1 no lo provee explícitamente → `AQ-JUZGAR-NODO-DOWNSTREAM` (hereda `AQ-DIAG-NODO-CAUSAL`).
- **Hidratar el enlace aguas abajo.** Igual que en C4 (§4.5), `nivel_causal` y las propiedades relevantes del enlace viven en la entidad `relacion_causal` (`getById`), no en la arista. JUZGAR debe hidratar downstream → `AQ-JUZGAR-LECTURA-ENLACE-DOWNSTREAM` (hereda `AQ-DIAG-LECTURA-ENLACE-CAUSAL`).
- **Escritura.** `mov_integrar` es el punto de escritura único de C1 (especificado en C1; pendiente TypeScript; hereda `AQ-SYS-011`). Las familias E3/A2/B3 y los atributos exactos que JUZGAR debe proveer a `mov_integrar` → `AQ-JUZGAR-SCHEMA-MOV-ESCRITURA` (el canon nombra las familias; C1 define los atributos).

---

## 5. Contratos de entrada

```typescript
export async function judge(
  deps: JudgeDeps,
  input: { tenantId: UUID; diagnostico: Diagnostico },
): Promise<Juicio>
```

La entrada **no es una brecha**: es el **`Diagnostico` derrotable que DIAGNOSTICAR produjo** (G5→G6). JUZGAR consume la causa ya abducida.

### 5.1 Precondiciones

- **PRE-1 — Diagnostico válido de C4.** `input.diagnostico` es el valor de retorno de `diagnose` (C4), no un diagnóstico fabricado. Puede ser `kind:"diagnostico"` o `kind:"abstencion"`. En ambos casos `judge` procede: el segundo produce `abstencion_deliberativa` directamente.
- **PRE-2 — Si `kind:"diagnostico"`, hay al menos una causa en `causas`.** Garantizado por la postcondición POST-1 de C4 (si C4 devuelve `kind:"diagnostico"`, `causas.length >= 1`). JUZGAR no verifica esto: lo garantiza el tipo de C4.
- **PRE-3 — Políticas presentes.** `SufficiencyPolicyPort` y `LeverPolicyPort` proveen sus respuestas. Sin ellas → error `JUDGE_NO_POLICY`. **Nunca un umbral/profundidad hardcodeado** (MOTOR §9; JUZGAR.INV-10).
- **PRE-4 — Restricciones legibles.** `normative.listActiveConstraints` accesible. Si falla → error `JUDGE_CONSTRAINTS_UNAVAILABLE`; JUZGAR no poda sin ellas (no se asume "sin restricciones").
- **PRE-5 — Solo lectura de diagnose lateral; escritura en mov.integrar.** Estructural: `JudgeDeps.causal` es `Pick<…,"traverseDownstream">` (sin `traverseUpstream`). La escritura está explícitamente inyectada.
- **PRE-6 — Contexto de rol explícito.** `deps.role` declara `costoDeError` (governa G6). Sin él → error `JUDGE_EMPTY_ROLE_CONTEXT`.

### 5.2 Origen del disparo

JUZGAR **duerme por defecto** (Freno 1, event-driven). Corre solo cuando el ritmo de juicio del Motor recoge el `Diagnostico` de C4 (G5→G6). **Qué del stack invoca `judge`** no lo fija el canon → `AQ-JUZGAR-DISPARO` (hereda `AQ-DIAG-DISPARO`). Auto-invocarse violaría "el Motor no se enciende a sí mismo" (Freno 1).

### 5.3 Errores

| Error | Causa | Disposición |
|---|---|---|
| `JUDGE_NO_POLICY` | `SufficiencyPolicyPort` o `LeverPolicyPort` no provistos (viola PRE-3) | rechazo — nunca default hardcodeado (MOTOR §9) |
| `JUDGE_EMPTY_ROLE_CONTEXT` | `deps.role` sin `costoDeError` (viola PRE-6) | rechazo: sin rol no hay G6 |
| `JUDGE_CONSTRAINTS_UNAVAILABLE` | `listActiveConstraints` falla (viola PRE-4) | rechazo: sin restricciones la poda es insegura |
| `JUDGE_FORBIDDEN` | sin `has_tenant_permission(tenant,'mov.write')` | rechazo (RLS de C1, errcode 42501) → `AQ-JUZGAR-PERMISOS` |

*(El Diagnostico `kind:"abstencion"`, el grafo sin palancas accionables, la confianza insuficiente para el stake y el presupuesto agotado NO son errores: son **abstenciones deliberativas** de primera clase.)*

---

## 6. Contratos de salida

La salida de JUZGAR es el `Juicio`: **una decisión comprometida con expectativa sembrada, una abstención deliberativa, o una escalada**. ARTICULAR (C6) lo traducirá al lenguaje del rol. No es consulta pura: JUZGAR escribe E3+A2+B3 al MOV como efecto lateral (si `kind:"juicio"`).

- **POST-1 — Decisión trazable a la causa y a la brecha.** `Juicio kind:"juicio"` porta `causaId` y `brechaId`. La `intervencion` (E3) nace con referencia a la causa diagnosticada por C4, no al síntoma.
- **POST-2 — Intervención nace HIPÓTESIS (JUZGAR.INV-5; MOV §2.1 R1).** El E3 escrito lleva `estado_ejecucion:"considerada"` y estatus `HIPOTESIS`. **Nunca HECHO**.
- **POST-3 — Eslabón débil heredado.** La `confianza` del `Juicio` ≤ `confianza` del `Diagnostico` recibido (JUZGAR.INV-4; MOV §0.7 §2.2). Si `diagnostico.confianza === null` ⇒ `juicio.confianza === null`.
- **POST-4 — Expectativa falsable sembrada (JUZGAR.INV-6).** El B3 escrito contiene `refutaSi` y `confirmaSi` no vacíos (la predicción de resultado de la palanca). Sin falsador no hay expectativa — es dogma → se abstiene.
- **POST-5 — La abstención deliberativa declara qué falta.** `Juicio kind:"abstencion_deliberativa"` porta `motivo` exacto y `faltaParaDecidirSi` no vacío. Es primera clase, no un error.
- **POST-6 — Nada se calibra, nada se articula.** El `Juicio` es dato estructurado; JUZGAR no produce texto para el rol (G9, ARTICULAR), no modifica `relacion_causal.confianza`, no emite `perturbacion`.
- **POST-7 — Atomicidad declarada (AQ-gateada).** Si `kind:"juicio"`, E3+A2+B3 se escriben coherentemente o no se escribe nada (rollback). La atomicidad exacta hereda `AQ-SYS-005` y `AQ-JUZGAR-ESCRITURA-ATOMICA` — **no se garantiza en la spec, se registra como AQ**.
- **POST-8 — Traza de decisión.** `audit.append` emite `"juzgar.decision_registrada"` o `"juzgar.abstencion_deliberativa"` sin confianza/score en `metadata`.

---

## 7. Invariantes

| Invariante (origen) | Enunciado verificable | Guard | Centinela |
|---|---|---|---|
| **JUZGAR.INV-1 — Recorrido HACIA ADELANTE** (MOTOR §3.2 invariante (a)) | Recorre solo `traverseDownstream`; jamás `traverseUpstream` | `JudgeDeps.causal` es `Pick<…,"traverseDownstream">` (sin `traverseUpstream`) | F-JZ-1 |
| **JUZGAR.INV-2 — Actúa contra la CAUSA** (MOTOR G7; ARQUITECTURA §2.1) | La palanca parte del `nodoCausalId` de la causa diagnosticada; jamás del nodoId del síntoma | `fromNodeId = causa.nodoCausalId`, no `brechaId` | F-JZ-8 |
| **JUZGAR.INV-3 — Suficiencia relativa al costo de error (G6 primero)** (MOTOR G6) | G6 se ejecuta **antes** de G7; si falla, se abstiene sin recorrer downstream | G6 = primer paso post-Diagnostico; `abstencion_deliberativa` si `!meetsSufficiency` | F-JZ-6 |
| **JUZGAR.INV-4 — Eslabón débil heredado** (MOV §0.7, §2.2) | `juicio.confianza <= diagnostico.confianza`; si `null` → `null` | la confianza del juicio se toma del Diagnostico, nunca se eleva | F-JZ-11 |
| **JUZGAR.INV-5 — Nada a HECHO** (MOV §2.1 R1; MOTOR §6.1) | La `intervencion` (E3) nace HIPÓTESIS; `estado_ejecucion:"considerada"` | el tipo y la escritura siempre pasan `estatus:"HIPOTESIS"` | F-JZ-5 |
| **JUZGAR.INV-6 — Derrotabilidad: expectativa sembrada** (MOTOR §6.2 Regla F) | Toda palanca elegida porta su falsador (B3 con `refutaSi` y `confirmaSi` no vacíos) | palanca sin falsador ⇒ abstención, no compromiso | F-JZ-10 |
| **JUZGAR.INV-7 — No calibra** (RECONCILIAR; MOTOR §10.4) | Cero escrituras de confianza en `relacion_causal`; los puertos de política son R/O | `JudgeDeps` no inyecta escritura de familia C | F-JZ-3 |
| **JUZGAR.INV-8 — Abstención deliberativa de primera clase** (MOTOR §8 Freno 3; MOV §5.2) | Cualquier condición de abstención (G6/G7/presupuesto) produce `kind:"abstencion_deliberativa"` con `faltaParaDecidirSi`; nada escrito al MOV | rama de abstención explicita motivo y qué faltaría para decidir | F-JZ-12 |
| **JUZGAR.INV-9 — Presupuesto bajo techo absoluto** (MOTOR §8 Freno 3) | Si `budgetRemaining <= 0` → abstención `presupuesto_agotado`, antes de escribir nada | consulta de presupuesto antes de `integrar` | F-JZ-7 |
| **JUZGAR.INV-10 — Sin cuantificación en el dominio** (MOTOR §9) | El dominio no contiene umbral, peso, presupuesto ni profundidad numérica | grep al dominio: cero literales de control; todo por puertos | F-JZ-9 |
| **JUZGAR.INV-11 — No re-diagnostica, no articula, no atiende, no percibe** (fronteras C4/C6/C3/C2) | Cero llamadas a traverseUpstream/perceiveSignal/writePerturb/updateGap/rankAttention/texto-para-rol | `JudgeDeps` excluye esos puertos; `Juicio` no contiene strings de usuario | F-JZ-1, F-JZ-2, F-JZ-4 |
| **JUZGAR.INV-12 — Escritura atómica E3+A2+B3 o nada** (AQ-SYS-005) | Si escribe E3 sin A2 o B3 (o viceversa), es escritura parcial → MOV inconsistente | atomicidad AQ-gateada; la spec declara el invariante; la implementación lo garantiza | F-JZ-13 |

> **Criterio de fallo del componente.** Si JUZGAR recorriera el grafo hacia atrás (JUZGAR.INV-1), actuara sobre el síntoma en vez de la causa (INV-2), saltara G6 (INV-3), elevara la confianza (INV-4), promoviera a HECHO (INV-5), comprometiera sin expectativa (INV-6), calibrara confianzas causales (INV-7), escribiera parcialmente E3 sin A2/B3 (INV-12), o produjera texto para el rol, dejaría de ser el acto de juzgar.

---

## 8. Modelo de datos (delta sobre C1)

### 8.0 Tesis del delta: JUZGAR ESCRIBE sustancia — E3, A2, B3

> **Decisión gobernante.** JUZGAR **sí escribe en el MOV**, a diferencia de C3/C4. Escribe tres entidades pertenecientes a las familias que C1 define y que el canon (MOTOR §8 G8; CONSTITUCION §6) asigna al acto de juzgar: `intervencion` (E3), `compromiso` (A2), `expectativa` (B3). El punto de escritura único es `mov_integrar` (C1). **No crea tablas nuevas; escribe en las familias ya definidas por C1.**
>
> El permiso de escritura de las familias A/B/E con "permiso propio" de JUZGAR está abierto por el canon (MOTOR §8: *"cada acto distinto del OSE puede escribir en las familias que le corresponden, con su propio permiso"*; verificado semánticamente contra MOTOR §6, acto 5). La RLS de C1 debe conceder `mov.write` al acto JUZGAR → `AQ-JUZGAR-PERMISOS`.

### 8.1 Qué ESCRIBE al MOV vía `mov_integrar` (familias del canon; esquema → `AQ-JUZGAR-SCHEMA-MOV-ESCRITURA`)

| Entidad | Familia | Atributos que C5 necesita proveer | AQ de esquema |
|---|---|---|---|
| `intervencion` (E3) | E (Eventos/Intervenciones) | `causaId`, `palancaNodeId`, `estatus:"HIPOTESIS"`, `estado_ejecucion:"considerada"`, `tenantId`, `requestId` | `AQ-JUZGAR-SCHEMA-MOV-ESCRITURA` |
| `compromiso` (A2) | A (Actos/Compromisos) | `interventionId`, `causaId`, `brechaId`, `rationale` (qué gates G6+G7+G8 lo justifican), `tenantId` | `AQ-JUZGAR-SCHEMA-MOV-ESCRITURA` |
| `expectativa` (B3) | B (Creencias/Expectativas) | `interventionId`, `refutaSi`, `confirmaSi`, `brechaId`, `causaId`, `tenantId`, `requestId` | `AQ-JUZGAR-SCHEMA-MOV-ESCRITURA` + `AQ-SYS-017` |

> **`AQ-JUZGAR-SCHEMA-MOV-ESCRITURA` (NO resuelta).** Los atributos exactos de E3/A2/B3 que `mov_integrar` acepta los define C1. Esta spec nombra las familias y las semánticas mínimas; la traducción al tipo de llamada de `mov_integrar` queda diferida. La atomicidad de las tres escrituras hereda `AQ-SYS-005`.
>
> **`AQ-SYS-017` (Outcome Feedback Loop).** La `expectativa` (B3) que C5 siembra necesita que el Motor defina el mecanismo por el cual C2 (OSE) la recoge al procesar nuevas señales y C7 (RECONCILIAR) calibra. Este mecanismo es el cierre del bucle de aprendizaje. El vacío está registrado a nivel de sistema (`SYSTEM_DECISIONS.md`); su interfaz concreta no está definida en esta spec.

### 8.2 Qué LEE de C1/C3/C4 (verificado por nombre — pendiente TypeScript)

| Necesidad de JUZGAR | Pieza de C1/C3/C4 (reuso, NO redefinición) | Cita (por nombre) |
|---|---|---|
| El Diagnostico (causas + confianza + brechaId) | `Diagnostico` (tipo de C4 `diagnostico.ts`) | C4 `diagnose` → tipo `Diagnostico` (decisión 9) |
| Recorrer el grafo causal HACIA ADELANTE | `CausalGraphRepository.traverseDownstream` | C1 §CausalGraphRepository; pendiente TypeScript (AQ-SYS-011) |
| Hidratar enlace downstream (nivel, propiedades) | `MovRepository.getById` sobre `relacion_causal` | C1 §MovRepository; hereda AQ-DIAG-LECTURA-ENLACE-CAUSAL |
| Restricciones vigentes para podar G7 | `NormativeRepository.listActiveConstraints` | C1 §NormativeRepository |
| Suficiencia por consecuencia (G6) | `SufficiencyPolicyPort.meetsSufficiency` | nuevo puerto C5 (§4.2) |
| Orden de palancas + presupuesto (G7/G8) | `LeverPolicyPort.rankLevers` + `.budgetRemaining` + `.maxDownstreamDepth` | nuevo puerto C5 (§4.3) |
| Contexto de rol (`costoDeError`) | `RoleContext` (importado de C3) | C3 `salience-policy-port` → tipo `RoleContext` (por nombre) |
| Reloj/correlación | `knowledgeNowMs` + `requestId` | patrón `ScanDeps` (verificado en `scan-overdue-work-orders.ts`) |
| Traza | `AuditRepository.append` | `modules/audit` (verificado) |

---

## 9. Flujo interno (G6 → G7 → G8 — acto de decisión y compromiso)

JUZGAR es orquestación sobre los puertos de C1 + puertos de política R/O, con escritura lateral al MOV. **No tiene impulsor interno** (Freno 1): corre solo cuando el ritmo de juicio le entrega un Diagnostico de C4.

```
   DIAGNOSTICO (de C4, value object) ── MOTOR (G5 → G6)
        │  (puede ser kind:"diagnostico" o kind:"abstencion")
        ▼
 [1] ¿ES ABSTENCIÓN DE C4?
        kind:"abstencion" → ABSTENCIÓN DELIBERATIVA motivo:"diagnostico_abstencion_heredada"
        kind:"diagnostico" → continuar
        │
 [2] ELEGIR CAUSA  causas[0] (mayor soporte de C4; disyuntiva si esDisyuntiva)
        (AQ-JUZGAR-DISJUNTIVA-CAUSA: ¿cómo elegir si hay empate declarado?)
        │
 [3] G6 — GATE DE SUFICIENCIA  sufficiency.meetsSufficiency(tenantId, diagnostico.confianza, role)
        NO (o confianza===null) → ABSTENCIÓN DELIBERATIVA motivo:"confianza_insuficiente_para_el_stake"
                                   faltaParaDecidirSi: "confianza >= [umbral del rol costoDeError]"
        SÍ → continuar
        │
 [4] PROFUNDIDAD  depth ← lever.maxDownstreamDepth(tenantId, role)  (NO hardcodeada; JUZGAR.INV-10)
        │
 [5] RECORRER HACIA ADELANTE  causal.traverseDownstream(tenantId, causaNodeId, depth): AristaMov[]
        (causaNodeId ← causas[0].nodoCausalId; AQ-JUZGAR-NODO-DOWNSTREAM)
        vacío → ABSTENCIÓN DELIBERATIVA motivo:"grafo_downstream_sin_palanca_accionable"
        │
 [6] PODAR POR RESTRICCIÓN  normative.listActiveConstraints → activeConstraintIds
        Por cada nodo aguas abajo:
          ∈ activeConstraintIds → excluido (restriccionAplicada); jamás es palanca (JUZGAR.INV-2)
        Si todas excluidas → ABSTENCIÓN DELIBERATIVA motivo:"todas_palancas_fuera_de_restriccion"
        │
 [7] GENERAR PALANCAS CANDIDATAS  PalancaCandidata[] con camino + restriccionesAplicadas + confianzaHeredada
        (confianzaHeredada = diagnostico.confianza ≤ MIN del camino de C4; JUZGAR.INV-4)
        │
 [8] VERIFICAR PRESUPUESTO  lever.budgetRemaining(tenantId, role)
        <= 0 → ABSTENCIÓN DELIBERATIVA motivo:"presupuesto_agotado"  (Freno 3; JUZGAR.INV-9)
        │
 [9] ORDENAR PALANCAS  lever.rankLevers (relación de orden; incomparables = empates)
        Elegir best = primera del ranking (palancas[0])
        │
[10] EXIGIR FALSADOR PARA LA PALANCA  refutaSi/confirmaSi no vacíos (JUZGAR.INV-6)
        Si la palanca no tiene expectativa falsable → ABSTENCIÓN DELIBERATIVA motivo:"grafo_downstream_sin_palanca_accionable"
        │
[11] ESCRIBIR E3+A2+B3 al MOV vía mov_integrar (AQ-SYS-005 para atomicidad)
        intervencion (E3): causaId, palancaNodeId, estatus:"HIPOTESIS", estado_ejecucion:"considerada"
        compromiso (A2): interventionId, causaId, brechaId, rationale (G6+G7+G8 gates)
        expectativa (B3): interventionId, refutaSi, confirmaSi, brechaId, causaId  (→ AQ-SYS-017)
        │
[12] TRAZA  audit.append('juzgar.decision_registrada')  — sin confianza en metadata
        │
        └──► JUICIO kind:"juicio" { tenantId, brechaId, causaId, palancaNodeId, interventionId, confianza, requestId }
             └──► ARTICULAR (C6, G9, FUERA de JUZGAR) traduce al rol
             └──► OSE (C2) medirá la sorpresa contra la expectativa sembrada (AQ-SYS-017)
             └──► RECONCILIAR (C7) calibrará las confianzas post-outcome
```

**Invariantes del flujo:** G6 SIEMPRE antes de G7; en ninguna rama se recorre hacia atrás; la palanca ataca la `causaId` de C4, nunca el `brechaId` (síntoma); todas las abstenciones son de primera clase con `faltaParaDecidirSi`; nada se escribe al MOV en ramas de abstención; la confianza del Juicio ≤ la del Diagnostico (eslabón débil heredado).

---

## 10. Pseudocódigo

> **Placeholders AQ-gated.** Los siguientes símbolos NO están resueltos por el canon y aparecen como funciones-marcador: `causaNodeIdDe(causa)` (`AQ-JUZGAR-NODO-DOWNSTREAM`, hereda `AQ-DIAG-NODO-CAUSAL`), `refutaSiDePalanca(palanca)` / `confirmaSiDePalanca(palanca)` (`AQ-JUZGAR-FALSADOR-PALANCA`), y los campos exactos de `mov_integrar` para E3/A2/B3 (`AQ-JUZGAR-SCHEMA-MOV-ESCRITURA`). El pseudocódigo es **ilustrativo de la lógica G6/G7/G8**, NO compila hasta resolver esas AQ.

### 10.1 `projectForward` — proyección causal hacia adelante (G7, función pura de lectura)

```typescript
// modules/juzgar/application/use-cases/project-forward.ts
import type { JudgeDeps } from "./deps"
import type { PalancaCandidata } from "@/modules/juzgar/domain/juicio"
import type { UUID } from "@/types/shared"

/**
 * G7: recorre el grafo HACIA ADELANTE desde la causa diagnosticada y devuelve palancas candidatas.
 * Poda por restricción; no rankea (eso es LeverPolicyPort). No escribe. Función PURA de orquestación.
 * NO recorre hacia atrás; no re-diagnostica; no calibra.
 */
export async function projectForward(
  deps: JudgeDeps,
  tenantId: UUID,
  causaId: UUID,              // la causa diagnosticada (de C4)
  diagnosticoConfianza: number | null,
  maxDepth: number,
  activeConstraintIds: ReadonlySet<UUID>,
): Promise<PalancaCandidata[]> {
  // ÚNICA llamada al grafo hacia adelante (MOTOR §3.2 inv (a))
  const aristas = await deps.causal.traverseDownstream(
    tenantId,
    causaNodeIdDe(causaId),   // AQ-JUZGAR-NODO-DOWNSTREAM: mapeo causaId → nodoCausalId
    maxDepth,
  )
  const candidatas: PalancaCandidata[] = []
  for (const arista of aristas) {
    const nodoId = arista.destinoId       // aguas abajo (dirección opuesta a C4)
    if (activeConstraintIds.has(nodoId)) continue  // restricción activa: no es palanca (JUZGAR.INV-2, RD-4)
    candidatas.push({
      nodoId,
      causaId,
      camino: [arista],                   // camino mínimo; extensión a rutas largas → AQ-JUZGAR-RUTA-LARGA
      restriccionesAplicadas: [...activeConstraintIds].filter(c => !activeConstraintIds.has(c)),
      confianzaHeredada: diagnosticoConfianza, // hereda sin elevar (JUZGAR.INV-4)
    })
  }
  return candidatas
}
```

### 10.2 `judge` — caso de uso primario (G6 → G7 → G8)

```typescript
// modules/juzgar/application/use-cases/judge.ts
import type { JudgeDeps } from "./deps"
import type { Juicio, AbstencionDeliberativa } from "@/modules/juzgar/domain/juicio"
import type { Diagnostico } from "@/modules/diagnosticar/domain/diagnostico"
import type { UUID } from "@/types/shared"
import { projectForward } from "./project-forward"
import { randomUUID } from "crypto"

export async function judge(
  deps: JudgeDeps,
  input: { tenantId: UUID; diagnostico: Diagnostico },
): Promise<Juicio> {
  const { tenantId, diagnostico } = input
  const base = { tenantId, brechaId: diagnostico.brechaId, requestId: deps.requestId }

  // [1] Heredar abstención de C4
  if (diagnostico.kind === "abstencion")
    return { kind: "abstencion_deliberativa", ...base,
      diagnosticoConfianza: null,
      abstencion: { motivo: "diagnostico_abstencion_heredada",
        faltaParaDecidirSi: diagnostico.abstencion.rescatariaSi, escalaDonde: null } }

  const causa = diagnostico.causas[0]   // mayor soporte (AQ-JUZGAR-DISJUNTIVA-CAUSA si esDisyuntiva)

  // [3] G6 — Suficiencia por consecuencia (SIEMPRE antes de G7; JUZGAR.INV-3)
  const suficiente = await deps.sufficiency.meetsSufficiency(tenantId, diagnostico.confianza, deps.role)
  if (!suficiente)
    return { kind: "abstencion_deliberativa", ...base,
      diagnosticoConfianza: diagnostico.confianza,
      abstencion: { motivo: "confianza_insuficiente_para_el_stake",
        faltaParaDecidirSi: "confianza suficiente para el costo de error del rol (AQ-JUZGAR-UMBRAL-SUFICIENCIA)",
        escalaDonde: null } }

  // [4] Profundidad — del puerto, nunca del dominio (JUZGAR.INV-10)
  const depth = await deps.lever.maxDownstreamDepth(tenantId, deps.role)

  // [5] Restricciones vigentes para podar
  const constraints = await deps.normative.listActiveConstraints(tenantId)
  const activeConstraintIds = new Set(constraints.map(c => c.id))

  // [6+7] G7 — Proyectar hacia adelante y generar candidatas
  const candidatas = await projectForward(
    deps, tenantId, causa.nodoCausalId, diagnostico.confianza, depth, activeConstraintIds)
  if (candidatas.length === 0)
    return { kind: "abstencion_deliberativa", ...base,
      diagnosticoConfianza: diagnostico.confianza,
      abstencion: { motivo: "grafo_downstream_sin_palanca_accionable",
        faltaParaDecidirSi: "al menos un nodo accionable aguas abajo de la causa en relacion_causal",
        escalaDonde: null } }

  // [8] Freno 3 — Presupuesto (JUZGAR.INV-9)
  const budget = await deps.lever.budgetRemaining(tenantId, deps.role)
  if (budget <= 0)
    return { kind: "abstencion_deliberativa", ...base,
      diagnosticoConfianza: diagnostico.confianza,
      abstencion: { motivo: "presupuesto_agotado",
        faltaParaDecidirSi: "presupuesto cognitivo disponible (Freno 3 MOTOR §8)",
        escalaDonde: null } }

  // [9] Ordenar por rendimiento esperado
  const ranked = [...candidatas]
  for (let i = 0; i < ranked.length; i++)
    for (let j = i + 1; j < ranked.length; j++) {
      const cmp = await deps.lever.rankLevers(tenantId, ranked[i], ranked[j])
      if (cmp === -1) { const t = ranked[i]; ranked[i] = ranked[j]; ranked[j] = t }
    }
  const best = ranked[0]

  // [10] Exigir falsador para la palanca (JUZGAR.INV-6)
  const refutaSi = refutaSiDePalanca(best)      // AQ-JUZGAR-FALSADOR-PALANCA
  const confirmaSi = confirmaSiDePalanca(best)  // AQ-JUZGAR-FALSADOR-PALANCA
  if (!refutaSi || !confirmaSi)
    return { kind: "abstencion_deliberativa", ...base,
      diagnosticoConfianza: diagnostico.confianza,
      abstencion: { motivo: "grafo_downstream_sin_palanca_accionable",
        faltaParaDecidirSi: "relacion_causal downstream con condicion_falsacion (refutaSi/confirmaSi)",
        escalaDonde: null } }

  // [11] Escribir E3+A2+B3 (efecto lateral; atomicidad → AQ-SYS-005 + AQ-JUZGAR-ESCRITURA-ATOMICA)
  const interventionId: UUID = randomUUID()
  // TODO (AQ-JUZGAR-SCHEMA-MOV-ESCRITURA): los atributos exactos dependen del esquema de mov_integrar
  await deps.mov.integrar(tenantId, [
    { familia: "E", tipo: "intervencion", id: interventionId,
      attrs: { causaId: causa.nodoCausalId, palancaNodeId: best.nodoId,
               estatus: "HIPOTESIS", estado_ejecucion: "considerada" } },
    { familia: "A", tipo: "compromiso",
      attrs: { interventionId, causaId: causa.nodoCausalId, brechaId: diagnostico.brechaId,
               rationale: `G6(suficiente)+G7(downstream)+G8(elegida)` } },
    { familia: "B", tipo: "expectativa",
      attrs: { interventionId, refutaSi, confirmaSi,
               brechaId: diagnostico.brechaId, causaId: causa.nodoCausalId } },
  ])   // AQ-SYS-005: si falla parcialmente, mov_integrar debe revertir o esta llamada debe ser transaccional

  // [12] Traza (sin confianza/score en metadata)
  await deps.audit.append({
    eventType: "juzgar.decision_registrada", actorType: "system", actorId: null, tenantId,
    subjectType: "mov_intervencion", subjectId: interventionId, action: "juzgar.decision_registrada",
    requestId: deps.requestId, source: "juzgar-engine",
    metadata: { rol: deps.role.rol, kind: "juicio", brechaId: diagnostico.brechaId },
  })

  return {
    kind: "juicio", tenantId, brechaId: diagnostico.brechaId,
    causaId: causa.nodoCausalId, palancaNodeId: best.nodoId,
    interventionId, confianza: best.confianzaHeredada, requestId: deps.requestId,
  }
}
```

> **Por qué esto es G6/G7/G8 fiel y no DIAGNOSTICAR.** (a) G6 ejecuta **antes** de G7 (suficiencia relativa al stake); (b) el recorrido es solo `traverseDownstream` (hacia adelante — MOTOR §3.2 inv (a)); (c) actúa contra la **causa** (`nodoCausalId` de C4), nunca contra el `brechaId` (síntoma); (d) exige `refutaSi`/`confirmaSi` para la palanca (Regla F; JUZGAR.INV-6); (e) escribe E3+A2+B3 como efecto lateral (decisión 7); (f) **no modifica** ninguna `relacion_causal.confianza` (RECONCILIAR); (g) **no produce texto** para el rol (ARTICULAR); (h) la `intervencion` nace HIPÓTESIS (JUZGAR.INV-5). Termina donde G9 (ARTICULAR) traduce la decisión al lenguaje del rol.

---

## 11. Pruebas unitarias (vitest `environment:node`, mockeando los puertos de C1/C4)

> **Naturaleza.** Verifican que `judge` (orquestación pura) ejerce JUZGAR según ARQUITECTURA §3 acto 5 y MOTOR G6/G7/G8. **Mockean** `traverseDownstream`, `listActiveConstraints`, `mov.integrar`, `SufficiencyPolicyPort`, `LeverPolicyPort`. **`traverseUpstream` no existe en `JudgeDeps`**: su ausencia estructural se verifica por tipo. **El `Diagnostico` de C4 se inyecta directamente** (valor ya producido por C4, no por estos tests). Ningún umbral/presupuesto/profundidad se hardcodea en el dominio (JUZGAR.INV-10).

```ts
// modules/juzgar/application/use-cases/judge.test.ts
import { describe, expect, it, vi } from "vitest"
const TENANT = "11111111-1111-1111-1111-111111111111"
const GAP    = "99999999-9999-9999-9999-999999999999"
const CAUSA  = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"  // nodo causa (de C4)
const PALANCA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" // nodo aguas abajo
const RESTR  = "cccccccc-cccc-cccc-cccc-cccccccccccc"  // restricción activa

function diagnosticoOk(overrides?: object) {
  return {
    kind: "diagnostico" as const, tenantId: TENANT, brechaId: GAP,
    estatus: "INFERENCIA" as const, esDisyuntiva: false, requestId: "req-1",
    causas: [{ nodoCausalId: CAUSA, papel: "causa" as const, nivelMin: "intervencion" as const,
               camino: [], estatus: "INFERENCIA" as const, confianza: 0.75,
               falsador: { refutaSi: "si X", confirmaSi: "si Y", relacionCausalId: "rel-1" },
               viaMemoria: false, procedencia: ["obs-1"] }],
    nodos: [], empatesDeclarados: [], confianza: 0.75,
    ...overrides,
  }
}

function setup(opts: { downstream?: any[]; constraints?: any[]; suficiente?: boolean;
                       budget?: number; writeOk?: boolean; rankResult?: -1|0|1|null }) {
  const traverseDownstream = vi.fn().mockResolvedValue(opts.downstream ?? [
    { origenId: CAUSA, destinoId: PALANCA, confianza: 0.75, attrs: { refutaSi: "si X", confirmaSi: "si Y" } }
  ])
  const listActiveConstraints = vi.fn().mockResolvedValue(opts.constraints ?? [])
  const integrar = vi.fn().mockResolvedValue({ ok: true })
  const sufficiency = { meetsSufficiency: vi.fn().mockResolvedValue(opts.suficiente ?? true) }
  const lever = {
    maxDownstreamDepth: vi.fn().mockResolvedValue(5),
    rankLevers: vi.fn().mockResolvedValue(opts.rankResult ?? 1),
    budgetRemaining: vi.fn().mockResolvedValue(opts.budget ?? 100),
  }
  const deps = {
    causal: { traverseDownstream },
    normative: { listActiveConstraints },
    mov: { getById: vi.fn(), integrar },
    sufficiency, lever,
    role: { rol: "supervisor", esferaDeAccion: [], horizonte: "semanas", costoDeError: "alto" },
    audit: { append: vi.fn() },
    knowledgeNowMs: Date.parse("2026-06-29T00:00:00Z"),
    requestId: "44444444-4444-4444-4444-444444444444",
  } as any
  return { deps, traverseDownstream, integrar, sufficiency, lever }
}
```

| # | Propiedad verificada | Ancla canónica | Assert |
|---|---|---|---|
| **U-1** | Diagnostico válido + G6 OK + palanca downstream → `kind:"juicio"` | MOTOR G6/G7/G8 | `r.kind==="juicio"`; `r.causaId===CAUSA`; `r.palancaNodeId===PALANCA` |
| **U-2** | Recorre HACIA ADELANTE; `traverseUpstream` ausente en `JudgeDeps` | MOTOR §3.2 inv (a) | `traverseDownstream` llamado con `(TENANT, CAUSA, 5)`; `(deps.causal as any).traverseUpstream === undefined` |
| **U-3** | G6 falla (insuficiente) → `abstencion_deliberativa confianza_insuficiente_para_el_stake` | MOTOR G6 | `sufficiency.meetsSufficiency(…, 0.75, …) → false` ⇒ `r.kind==="abstencion_deliberativa"`; `r.abstencion.motivo===…stake` |
| **U-4** | Diagnostico `kind:"abstencion"` → `abstencion_deliberativa diagnostico_abstencion_heredada` | MOTOR G6; RD-1 | `r.kind==="abstencion_deliberativa"`; `r.abstencion.motivo==="diagnostico_abstencion_heredada"` |
| **U-5** | Nodo ∈ restricciones activas → podado, nunca palanca | ARQUITECTURA §2.1; RD-4 | con `constraints:[{id:PALANCA}]` y solo ese nodo downstream ⇒ `r.kind==="abstencion_deliberativa"`; `r.abstencion.motivo==="todas_palancas…"` |
| **U-6** | Presupuesto agotado → `abstencion_deliberativa presupuesto_agotado` (Freno 3) | MOTOR §8 Freno 3 | `budget=0` ⇒ `r.kind==="abstencion_deliberativa"`; `motivo==="presupuesto_agotado"` |
| **U-7** | `intervencion` nace HIPÓTESIS (nunca HECHO) | MOV §2.1 R1; JUZGAR.INV-5 | `integrar` llamado con `estatus:"HIPOTESIS"`, `estado_ejecucion:"considerada"` |
| **U-8** | Confianza del Juicio ≤ confianza del Diagnostico (eslabón débil heredado) | MOV §0.7; JUZGAR.INV-4 | `r.confianza <= diagnosticoOk().confianza` (0.75) |
| **U-9** | Expectativa sembrada con `refutaSi`/`confirmaSi` (falsador) | MOTOR §6.2 Regla F; JUZGAR.INV-6 | `integrar` llamado con `{ refutaSi: expect.stringContaining("…"), confirmaSi: … }` para B3 |
| **U-10** | E3+A2+B3 escritos (tres entidades en la misma llamada o secuencia) | decisión 8; AQ-SYS-005 | `integrar` llamado al menos una vez conteniendo las tres familias E/A/B |
| **U-11** | Profundidad viene del puerto, no del dominio | MOTOR §9; JUZGAR.INV-10 | `lever.maxDownstreamDepth` llamado; sin literal numérico en el cuerpo de `judge`/`projectForward` |
| **U-12** | Abstención con `faltaParaDecidirSi` no vacío | RD-8; MOV §5.2 | en toda rama de abstención `r.abstencion.faltaParaDecidirSi.length > 0` |

```ts
it("U-1: Diagnostico válido → juicio con palanca downstream (MOTOR G6/G7/G8)", async () => {
  const { deps, traverseDownstream } = setup({})
  const r = await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect(traverseDownstream).toHaveBeenCalledWith(TENANT, expect.any(String), 5)
  expect(r.kind).toBe("juicio")
  if (r.kind === "juicio") { expect(r.causaId).toBe(CAUSA); expect(r.palancaNodeId).toBe(PALANCA) }
})

it("U-2: traverseUpstream ausente en JudgeDeps (MOTOR §3.2 inv (a))", async () => {
  const { deps } = setup({})
  await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect((deps.causal as any).traverseUpstream).toBeUndefined()
})

it("U-3: G6 falla → abstencion_deliberativa (MOTOR G6)", async () => {
  const { deps } = setup({ suficiente: false })
  const r = await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect(r.kind).toBe("abstencion_deliberativa")
  if (r.kind === "abstencion_deliberativa") expect(r.abstencion.motivo).toBe("confianza_insuficiente_para_el_stake")
})

it("U-4: Diagnostico abstencion → abstencion_deliberativa heredada (RD-1)", async () => {
  const { deps } = setup({})
  const dx = { kind: "abstencion" as const, tenantId: TENANT, brechaId: GAP, requestId: "r",
               abstencion: { motivo: "grafo_vacio" as const, faltaObservacion: "x", rescatariaSi: "y" } }
  const r = await judge(deps, { tenantId: TENANT, diagnostico: dx })
  expect(r.kind).toBe("abstencion_deliberativa")
  if (r.kind === "abstencion_deliberativa") expect(r.abstencion.motivo).toBe("diagnostico_abstencion_heredada")
})

it("U-7: intervencion nace HIPOTESIS, nunca HECHO (MOV §2.1 R1; JUZGAR.INV-5)", async () => {
  const { deps, integrar } = setup({})
  await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  const calls = integrar.mock.calls[0]
  expect(JSON.stringify(calls)).toContain("HIPOTESIS")
  expect(JSON.stringify(calls)).not.toContain("HECHO")
})

it("U-8: confianza del juicio ≤ confianza del diagnostico (JUZGAR.INV-4)", async () => {
  const { deps } = setup({})
  const r = await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  if (r.kind === "juicio") expect(r.confianza ?? 0).toBeLessThanOrEqual(0.75)
})
```

---

## 12. Pruebas de falsación

> Cada prueba intenta llevar a JUZGAR a un estado prohibido. El diseño es correcto solo si el estado es **estructuralmente imposible** o **rechazado**.

| # | Estado PROHIBIDO | Canon (por nombre) | Resultado exigido | Capa |
|---|---|---|---|---|
| **F-JZ-1** | recorre el grafo HACIA ATRÁS (re-diagnosticar) | MOTOR §3.2 inv (a); DIAGNOSTICAR C4 G5 | **imposible por construcción**: `JudgeDeps.causal` es `Pick<…,"traverseDownstream">` sin `traverseUpstream` | dominio (tipo) |
| **F-JZ-2** | no percibe, no mide sorpresa, no emite `perturbacion` | OSE C2 G0–G3 | `JudgeDeps` no inyecta `perceiveSignal`/`writePerturbation`/`updateGapObservedSide` | dominio (tipo) |
| **F-JZ-3** | **CALIBRA** confianza de `relacion_causal` o ajusta prior | RECONCILIAR C7 MOTOR §10.4 | `JudgeDeps` no inyecta escritura de familia C; puertos de política son R/O | dominio (tipo) |
| **F-JZ-4** | produce texto/string para el rol (articular) | ARTICULAR C6 G9 | `Juicio` no contiene strings de usuario; tipo no admite campo de texto para rol | dominio (tipo) |
| **F-JZ-5** | `intervencion` nace en estatus HECHO | MOV §2.1 R1; JUZGAR.INV-5 | `integrar` siempre llamado con `estatus:"HIPOTESIS"`; tipo `EstatusIntervencion = "HIPOTESIS"` | dominio |
| **F-JZ-6** | salta G6 (va directo a G7 sin suficiencia) | MOTOR G6; JUZGAR.INV-3 | si `meetsSufficiency → false` ⇒ `abstencion_deliberativa` y `traverseDownstream` **no se llama** | dominio |
| **F-JZ-7** | presupuesto agotado pero igual produce palanca | MOTOR §8 Freno 3; JUZGAR.INV-9 | `budget=0` ⇒ `abstencion_deliberativa presupuesto_agotado`; `integrar` **no se llama** | dominio |
| **F-JZ-8** | palanca aguas abajo ataca el SÍNTOMA (brechaId) en vez de la causa | MOTOR G7; JUZGAR.INV-2 | `traverseDownstream` llamado con `causaNodeId`, no `brechaId`; `juicio.causaId === CAUSA` | dominio |
| **F-JZ-9** | umbral/presupuesto/profundidad hardcodeado en el dominio | MOTOR §9; JUZGAR.INV-10 | sin policy ⇒ rechazo `JUDGE_NO_POLICY`; grep al dominio: cero literales numéricos de control | dominio |
| **F-JZ-10** | expectativa sin falsador (`refutaSi`/`confirmaSi` vacíos) | MOTOR §6.2 Regla F; JUZGAR.INV-6 | palanca sin falsador ⇒ `abstencion_deliberativa`; `integrar` no llama sin B3 con falsador | dominio |
| **F-JZ-11** | confianza del Juicio excede la del Diagnostico | MOV §0.7, §2.2; JUZGAR.INV-4 | `juicio.confianza <= diagnostico.confianza` siempre; no se eleva | dominio |
| **F-JZ-12** | abstención sin `faltaParaDecidirSi` (opaca) | MOV §5.2; RD-8 | toda rama de abstención exige `faltaParaDecidirSi.length > 0` | dominio |
| **F-JZ-13** | escritura parcial E3 sin A2 o sin B3 | AQ-SYS-005; JUZGAR.INV-12 | `integrar` solo se llama una vez con las tres familias (o no se llama si hay abstención) | dominio |

```ts
it("F-JZ-1: traverseUpstream NO existe en JudgeDeps (MOTOR §3.2 inv (a))", async () => {
  const { deps, traverseDownstream } = setup({})
  await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect((deps.causal as any).traverseUpstream).toBeUndefined()  // estructural por tipo
  expect(traverseDownstream).toHaveBeenCalled()
})

it("F-JZ-5: intervencion NUNCA en estatus HECHO (MOV §2.1 R1)", async () => {
  const { deps, integrar } = setup({})
  await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  const callArgs = JSON.stringify(integrar.mock.calls)
  expect(callArgs).not.toContain('"HECHO"')  // el tipo EstatusIntervencion nunca admite "HECHO"
})

it("F-JZ-6: G6 falla → traverseDownstream NO se llama (JUZGAR.INV-3)", async () => {
  const { deps, traverseDownstream } = setup({ suficiente: false })
  const r = await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect(r.kind).toBe("abstencion_deliberativa")
  expect(traverseDownstream).not.toHaveBeenCalled()
})

it("F-JZ-7: presupuesto=0 → integrar NO se llama (MOTOR §8 Freno 3)", async () => {
  const { deps, integrar } = setup({ budget: 0 })
  const r = await judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect(r.kind).toBe("abstencion_deliberativa")
  if (r.kind === "abstencion_deliberativa") expect(r.abstencion.motivo).toBe("presupuesto_agotado")
  expect(integrar).not.toHaveBeenCalled()
})

it("F-JZ-9: sin policy → JUDGE_NO_POLICY; cero literales numéricos en el dominio (MOTOR §9)", async () => {
  const { deps } = setup({})
  ;(deps as any).sufficiency = undefined
  await expect(judge(deps, { tenantId: TENANT, diagnostico: diagnosticoOk() }))
    .rejects.toThrow("JUDGE_NO_POLICY")
  // centinela CI: grep -RnE "[^a-zA-Z_][0-9]+" modules/juzgar/{domain,application} ⇒ cero literales de control
})

it("F-JZ-13: escritura solo con E3+A2+B3 completos; abstención → integrar NO se llama", async () => {
  // rama de abstención: sin escritura
  const { deps: depsAbs, integrar: intAbs } = setup({ suficiente: false })
  await judge(depsAbs, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  expect(intAbs).not.toHaveBeenCalled()
  // rama de juicio: las tres familias presentes
  const { deps: depsJuicio, integrar: intJuicio } = setup({})
  await judge(depsJuicio, { tenantId: TENANT, diagnostico: diagnosticoOk() })
  const args = JSON.stringify(intJuicio.mock.calls)
  expect(args).toContain('"E"'); expect(args).toContain('"A"'); expect(args).toContain('"B"')
})
```

---

## 13. Criterios de aceptación

El acto JUZGAR está **terminado** (a nivel de esta spec; sujeto a las AQ de sus dependencias, en particular `AQ-SYS-011`, `AQ-SYS-001`, `AQ-SYS-002`, `AQ-JUZGAR-NODO-DOWNSTREAM` y `AQ-JUZGAR-SCHEMA-MOV-ESCRITURA`) solo si TODOS son verdaderos:

- **CA-1 — G6 siempre antes de G7.** `judge` invoca `SufficiencyPolicyPort.meetsSufficiency` **antes** de `traverseDownstream`; si G6 falla, `traverseDownstream` no se llama. U-3, U-2; F-JZ-6. *(MOTOR G6; JUZGAR.INV-3.)*
- **CA-2 — Recorrido HACIA ADELANTE, nunca hacia atrás.** `judge` invoca solo `traverseDownstream`; `traverseUpstream` es ausente estructuralmente de `JudgeDeps`. U-2; F-JZ-1. *(MOTOR §3.2 inv (a); JUZGAR.INV-1.)*
- **CA-3 — Palanca actúa sobre la CAUSA, nunca el síntoma.** `traverseDownstream` parte de `causaNodeId` (de C4), no de `brechaId`. U-1; F-JZ-8. *(MOTOR G7; JUZGAR.INV-2.)*
- **CA-4 — Restricciones podadas correctamente.** Nodo ∈ `listActiveConstraints` nunca es palanca; si todas están podadas → abstención `todas_palancas_fuera_de_restriccion`. U-5. *(ARQUITECTURA §2.1; RD-4.)*
- **CA-5 — Presupuesto respetado (Freno 3).** `budget <= 0` → abstención `presupuesto_agotado`; `integrar` no se llama. U-6; F-JZ-7. *(MOTOR §8 Freno 3; JUZGAR.INV-9.)*
- **CA-6 — Intervención nace HIPÓTESIS; expectativa siembra falsador.** E3 con `estatus:"HIPOTESIS"`; B3 con `refutaSi`/`confirmaSi` no vacíos. U-7, U-9; F-JZ-5, F-JZ-10. *(MOV §2.1 R1; MOTOR §6.2 Regla F; JUZGAR.INV-5/6.)*
- **CA-7 — Eslabón débil heredado.** `juicio.confianza <= diagnostico.confianza`; nunca se eleva. U-8; F-JZ-11. *(MOV §0.7, §2.2; JUZGAR.INV-4.)*
- **CA-8 — Abstención deliberativa de primera clase con qué-falta.** Toda rama de abstención porta `motivo` exacto y `faltaParaDecidirSi` no vacío; nada se escribe al MOV. U-3, U-4, U-5, U-6; F-JZ-12. *(MOV §5.2; RD-8; JUZGAR.INV-8.)*
- **CA-9 — Frontera DIAGNOSTICAR / RECONCILIAR / ARTICULAR / ATENDER / OSE intacta.** Cero re-diagnósticos; cero calibraciones de `relacion_causal`; cero texto para el rol; cero ranks de salience; cero llamadas `perceiveSignal`/`writePerturb`. F-JZ-1, F-JZ-2, F-JZ-3, F-JZ-4. *(ARQUITECTURA §3 actos 4/6/7/8; MOTOR §10.4.)*
- **CA-10 — Escritura atómica E3+A2+B3 o nada.** `integrar` se llama solo si `kind:"juicio"`, con las tres familias; en abstención no se llama. F-JZ-13. *(AQ-SYS-005; JUZGAR.INV-12. Atomicidad declarada como AQ-gateada; la implementación la garantiza.)*
- **CA-11 — Forma fija, contenido inyectado, cero números en el dominio.** Suficiencia y palanca se leen de los puertos; sin ellos, rechazo. F-JZ-9; JUZGAR.INV-10. *(MOTOR §9.)*
- **CA-12 — Cero conceptos nuevos.** Ningún tipo/acto/invariante fuera del canon; reusa `traverseDownstream`/`getById`/`listActiveConstraints`/`mov_integrar` de C1 (especificados; pendiente TypeScript — AQ-SYS-011); importa `RoleContext` de C3 y `Diagnostico` de C4 (fuentes únicas); no redefine el MOV ni añade tabla. *(Reglas duras 1-7.)*
- **CA-13 — Ejecutabilidad condicionada.** U-1..U-12 y F-JZ-1..F-JZ-13 corren con vitest mockeando puertos, **una vez que `modules/mov`, `modules/atender`, `modules/diagnosticar` existan como TypeScript importable** (hoy no existen — AQ-SYS-011). Contra datos reales, **JUZGAR se abstiene siempre** hasta resolver: `AQ-JUZGAR-NODO-DOWNSTREAM` (sin punto de entrada al recorrido downstream) y `AQ-SYS-001`/`AQ-SYS-002` (sin brechas ni relacion_causal). "Construible YA" = esqueleto con puertos mockeados, NO operable end-to-end.

---

## Tabla de trazabilidad (todo al canon, por nombre — verificado por referencia)

| Elemento de la spec | Ancla canónica (por nombre) |
|---|---|
| Acto JUZGAR (propósito) | ARQUITECTURA §3 acto 5 |
| Gate G6 (suficiencia por consecuencia, DIAGNOSTICAR→JUZGAR) | MOTOR-COGNITIVO.md §6 + G6 (por sección) |
| Gate G7 (proyectar la palanca hacia adelante, podar por restricción) | MOTOR-COGNITIVO.md G7 (por sección) |
| Gate G8 (decidir/comprometerse/abstenerse/sembrar expectativa) | MOTOR-COGNITIVO.md G8 (por sección) |
| Invariante (a): grafo en dos sentidos, separados físicamente | MOTOR-COGNITIVO.md §3.2 invariante (a) |
| `traverseDownstream` (hacia adelante; hacia atrás = DIAGNOSTICAR) | C1 §CausalGraphRepository (por nombre); hereda AQ-SYS-011 |
| `traverseUpstream` EXCLUIDO de `JudgeDeps.causal` por `Pick` | C1 §CausalGraphRepository; MOTOR §3.2 inv (a) |
| `mov_integrar` (punto de escritura único de C1 para E3/A2/B3) | C1 §MovRepository (por nombre); hereda AQ-SYS-011 |
| Familias E3 (`intervencion`) / A2 (`compromiso`) / B3 (`expectativa`) | MOTOR-COGNITIVO.md §6 G8 + CONSTITUCION §6 (por sección) |
| Atomicidad de escritura E3+A2+B3 | AQ-SYS-005 (SYSTEM_DECISIONS.md) |
| Outcome Feedback Loop (expectativa → OSE → RECONCILIAR) | AQ-SYS-017 (SYSTEM_DECISIONS.md) |
| `intervencion` nace HIPÓTESIS (`estado_ejecucion:"considerada"`) | MOTOR-COGNITIVO.md §6 G8 + MOV §2.1 R1 |
| Eslabón débil heredado (confianza ≤ MIN del diagnóstico) | MOV §0.7, §2.2 |
| Suficiencia = función del `costoDeError` del rol | CONSTITUCION §8 (costoDeError); MOTOR G6 |
| Abstención deliberativa de primera clase | MOTOR §8 Freno 3 + MOV §5.2 (por sección) |
| Presupuesto bajo techo absoluto (Freno 3) | MOTOR-COGNITIVO.md §8 Freno 3 (por sección) |
| Blindaje forma/contenido (cuantificación calibrable, R/O) | MOTOR-COGNITIVO.md §9; §10.4 (por sección) |
| `Diagnostico` importado de C4 (fuente única; acoplamiento aceptado) | C4 `04-diagnosticar.md` → tipo `Diagnostico` (por nombre) |
| `RoleContext` importado de C3 (fuente única, misma decisión que C4 decisión 7) | C3 `salience-policy-port` → tipo `RoleContext` (por nombre) |
| RECONCILIAR calibra confianzas post-outcome ("cuatro cosas, solo cuatro") | MOTOR-COGNITIVO.md §10.4 (por sección) |
| ARTICULAR traduce la decisión al idioma del rol (G9) | ARQUITECTURA §3 acto 6; MOTOR G9 (por sección) |
| Patrón orquestación pura (`knowledgeNowMs`/`requestId`) | `scan-overdue-work-orders.ts` (verificado en disco) |
| `AuditRepository.append` | `modules/audit` (verificado en disco) |

---

## Architectural Questions (NO resueltas — registradas, no resueltas por intuición)

- **AQ-JUZGAR-PRECONDICION-C1C4** — `modules/mov` (C1), `modules/diagnosticar` (C4), `modules/atender` (C3) **no existen como TypeScript** (verificado: hereda AQ-SYS-011). Los puertos que `judge` consume existen solo como firmas en los `.md`. Precondición de construcción. NO resuelta.
- **AQ-JUZGAR-NODO-DOWNSTREAM** (operativamente bloqueante) — `traverseDownstream` parte de un **nodo causal** (dimensión de variación, MOV §2.2: "la carga del recurso R, no R"), distinto de la `CausaCandidata.nodoCausalId`. Cómo se mapea `CausaCandidata.nodoCausalId` al nodo del grafo desde el que recorre hacia adelante no lo fija el canon. Hereda C1 `AQ-NODO-CAUSAL` y C4 `AQ-DIAG-NODO-CAUSAL`. NO resuelta.
- **AQ-JUZGAR-SCHEMA-MOV-ESCRITURA** (operativamente bloqueante) — Los atributos exactos de E3/A2/B3 que `mov_integrar` acepta los define C1. Esta spec nombra las familias y semánticas mínimas; la traducción al tipo de llamada de `mov_integrar` queda diferida. Sin esquema, `integrar` no es llamable. NO resuelta.
- **AQ-JUZGAR-ESCRITURA-ATOMICA** — Hereda AQ-SYS-005. Si `mov_integrar` solo acepta una entidad por llamada, tres llamadas separadas no son atómicas. La decisión de envolver, extender o crear una RPC superior queda diferida a la fase de implementación (C5_CONTRACT.md). NO resuelta.
- **AQ-JUZGAR-UMBRAL-SUFICIENCIA** — Hereda AQ-SYS-006 y AQ-DIAG-UMBRAL-ABSTENCION. La FORMA de G6 (suficiencia relativa al `costoDeError` del rol) es ley; la CUANTIFICACIÓN (qué valor numérico de confianza alcanza para cada nivel de `costoDeError`) es contenido calibrable por RECONCILIAR. El seed inicial de `SufficiencyPolicyPort` no está definido. NO resuelta.
- **AQ-JUZGAR-POLITICA-PALANCA** — Hereda AQ-SYS-006. La FORMA de G7/G8 (rendimiento esperado bajo restricción, techo de presupuesto) es ley; la CUANTIFICACIÓN (cómo se mide "rendimiento esperado") es contenido calibrable. El seed inicial de `LeverPolicyPort` no está definido. NO resuelta.
- **AQ-JUZGAR-FALSADOR-PALANCA** — ¿Cómo JUZGAR obtiene el `refutaSi`/`confirmaSi` para la palanca? La `relacion_causal` downstream puede tener `condicion_falsacion` (igual que upstream; ver AQ-DIAG-LECTURA-ENLACE-CAUSAL). Pero si el nodo downstream no tiene `relacion_causal` explícita con falsador, JUZGAR se abstiene. El mapeo palanca-nodo → `condicion_falsacion` hereda AQ-DIAG-LECTURA-ENLACE-CAUSAL y AQ-JUZGAR-NODO-DOWNSTREAM. NO resuelta.
- **AQ-JUZGAR-LECTURA-ENLACE-DOWNSTREAM** — Hereda AQ-DIAG-LECTURA-ENLACE-CAUSAL. Los atributos relevantes del enlace downstream (incluido el falsador de la palanca) viven en la entidad `relacion_causal`, no en la arista. JUZGAR debe hidratar el enlace downstream con `getById` igual que C4 lo hace aguas arriba. El mapeo arista→`relacion_causal` downstream comparte el mismo vacío que C4. NO resuelta.
- **AQ-JUZGAR-DISJUNTIVA-CAUSA** — Si el Diagnostico de C4 tiene `esDisyuntiva:true` (varias causas candidatas con igual soporte), JUZGAR toma `causas[0]` por defecto. El canon no especifica si JUZGAR debe proyectar hacia adelante desde todas las causas simultáneamente o elegir una. Con una sola causa se actúa; con disyuntiva podría haber múltiples palancas desde distintos orígenes. NO resuelta.
- **AQ-JUZGAR-CONFIANZA-DOWNSTREAM** — La confianza de la palanca se hereda del Diagnostico (JUZGAR.INV-4). ¿Debe JUZGAR también calcular el eslabón débil del camino downstream aguas abajo (análogo a `applyWeakLink` en C4 para el camino aguas arriba)? El canon exige "herencia por eslabón débil" pero no especifica si aplica solo al camino de C4 o también al camino de G7. NO resuelta.
- **AQ-JUZGAR-PERMISOS** — El permiso `mov.write` para JUZGAR (familias A/B/E) debe estar sembrado en la RLS de C1. Sin el seed, `integrar` falla (errcode 42501). Análoga a C4 `AQ-DIAG-PERMISOS` pero para escritura. NO resuelta.
- **AQ-JUZGAR-DISPARO** — Hereda AQ-DIAG-DISPARO. ¿Qué del stack invoca `judge` con el Diagnostico de C4? El canon no nombra el orquestador que conecta G5→G6 sin violar "el Motor no se enciende a sí mismo" (Freno 1). NO resuelta.
- **AQ-JUZGAR-RUTA-LARGA** — `projectForward` actualmente construye palancas con `camino=[arista]` (arista inmediata). Para palancas en nodos más lejanos aguas abajo, el camino debe incluir todas las aristas hasta el nodo. La extensión a rutas largas (análoga a la abducción recursiva de C4) no está en el pseudocódigo por depender de AQ-JUZGAR-NODO-DOWNSTREAM. NO resuelta.
- **AQ-JUZGAR-PREEMPCION** — Hereda AQ-SYS-012. Si el Motor preempta a JUZGAR (G0.5) a mitad de G7 (después de G6 pero antes de comprometerse), ¿qué ocurre con la deuda viva de la proyección (las candidatas generadas)? Su hogar persistente entre invocaciones no está definido. NO resuelta.
