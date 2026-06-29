# Componente 1 — Modelo de Datos del MOV (Especificación de Ingeniería)

> **Naturaleza.** Esta es una **spec de ingeniería**, no un documento de arquitectura. Convierte el diseño cognitivo CONGELADO (MOV + OSE + Arquitectura + Motor + Constitución) en un componente de software implementable sobre el stack real (Supabase/PostgreSQL + TypeScript + arquitectura hexagonal). **No introduce ni un tipo, acto, invariante ni concepto cognitivo nuevo.** Todo artefacto se traza al canon por **nombre** de concepto (ver §Tabla de trazabilidad). Donde el canon deja un vacío, se registra como ARCHITECTURAL QUESTION y **no se resuelve**.
>
> **Documento primario:** MODELO-OPERACIONAL-VIVO.md (MOV). **Consumidor primario del modelo de datos:** el Operational State Engine (OSE), cuyos puertos e invariantes el modelo debe soportar.
>
> **Disciplina de citas (corrección de los refutadores).** El OSE declara explícitamente que **no tiene secciones numeradas** ("se eliminaron todas las citas con número de sección"). Por tanto **todas** las referencias al OSE son **por nombre** de puerto/invariante/regla (`P-IN`, `P-OUT`, `P-CLK`, `INV-1`…`INV-9`, "Regla de cierre", "apertura ontológica"). Las referencias al MOV y al Motor usan el **número de sección verificado en disco** o, cuando es más seguro, el nombre del concepto. Para eliminar colisiones de numeración entre los tres canones, **todo invariante lleva prefijo de origen**: `MOV.I-N`, `OSE.INV-N`, `MOTOR.*`.
>
> **Nota de alcance — MOV completo, no solo OSE.** Este modelo de datos soporta el MOV COMPLETO (todos los actos), no solo el OSE. Conceptos como `confianza_no_evaluada`, `tipo_incertidumbre`, perfil de decaimiento y `MOV.I-9` (no-doble-instanciación) pertenecen al MOV (dueño: Dimensión de Incertidumbre §5.2 / Tiempo §6.2 / Catálogo §1.7) **aunque el OSE los haya podado de su propio alcance**. Persistirlos NO contradice la poda del OSE: el OSE recortó su frontera, no el catálogo del MOV.

---

## 1. Propósito

El Modelo de Datos del MOV es la **representación persistente de la sustancia del Motor Cognitivo**: los **17 tipos cognitivos en 5 familias** (Catálogo unificado, MOV §8), cada uno portando obligatoriamente su **Sello Epistémico** (`{ estatus, confianza, procedencia }`) y su **Sello Temporal** (`{ instante_de_mundo, instante_de_conocimiento, validez, frescura }`), bajo la **Ley del eslabón débil** (MOV §0.7), más las **aristas del grafo** (causal C1, vínculos A4, brecha→referente, episodio→intervención/expectativa, perturbación→afectadas).

Su razón de existir es exacta: **todo acto aguas abajo lee de un MOV mantenido** (OSE: *"la decisión es una consulta a un MOV vivo, no su origen"*). El OSE escribe en él (efecto interno de su gate **G3 Integrar**) y emite `perturbacion`; los actos DIAGNOSTICAR, JUZGAR, ARTICULAR y RECONCILIAR lo leen. Sin la sustancia sellada y consultable, ningún acto tiene sobre qué operar.

Concretamente, el modelo de datos debe poder:

1. **Persistir una entidad sellada** de cualquiera de los 17 tipos, garantizando el **Invariante MOV.I-0**: ninguna entidad existe sin ambos sellos completos. No existe la "entidad desnuda".
2. **Servir la sustancia por identidad, por tipo y por ancla** (la entidad A a la que una creencia se refiere): el anclaje de `OSE P-IN`/G1 ("la observación queda anclada a su referente del MOV").
3. **Recorrer relaciones**: el grafo de `vinculo` (A4) para la **propagación de coherencia** del OSE (`P-OUT.propagacion` = *"entidades alcanzadas por propagación de coherencia vía dependencias ya existentes"*) y el grafo de `relacion_causal` (C1) que DIAGNOSTICAR recorre hacia atrás y JUZGAR hacia adelante (MOTOR §3.2, invariante (a) "el grafo se recorre en dos sentidos opuestos").
4. **Consultar creencias vigentes** (`observacion`, `inferencia`, `expectativa`), incluidas las `expectativa` con borde de vencimiento finito (combustible del barrido `OSE P-CLK`).
5. **Servir el lado observado de las `brecha`** (distancia estado-vs-referente; síntoma).

Cada dato devuelto viaja con sus dos sellos: *"el sello viaja con cada lectura; ningún peldaño lee un valor desnudo"* (MOTOR §3.2 invariante (c)).

---

## 2. Responsabilidades

Tres, y solo tres:

- **R1 — Persistir la sustancia sellada.** Escribir y actualizar entidades de las familias **A** (sustancia), **B** (creencia), **C** (explicación), **D** (normativa), **E** (memoria/dinámica), cada una con sus atributos propios (MOV §8) más sus dos sellos. Incluye la inmutabilidad de la `observacion` (`MOV.I-5`, *"no se edita ni se borra: se complementa o se deprecia"*) y la transición trazable de estatus (`MOV.I-2`, *"ninguna entidad cambia de estatus sin un evento explícito y trazable"*).
- **R2 — Servir la sustancia para consulta.** Resolver lecturas por identidad, por tipo, por ancla, por vigencia y por recorrido de grafo (vínculos y causal), devolviendo siempre la entidad con ambos sellos poblados.
- **R3 — Garantizar los invariantes de la sustancia** que son propiedades de almacenamiento (no de razonamiento): sellado completo (`MOV.I-0`), anclaje observacional (`MOV.I-1`), inmutabilidad del hecho (`MOV.I-5`), deber-ser explícito de la brecha (`MOV.I-6`), techo por eslabón débil sobre confianza **y estatus** (`MOV.I-3` / §0.7), y no-doble-instanciación (`MOV.I-9`). La garantía se cumple por **abstención de escritura** cuando un invariante no puede satisfacerse — *"el MOV nunca es observable en estado incoherente"* (`OSE` Regla de cierre).

La procedencia (campo del Sello Epistémico) se materializa **reusando `audit_events.metadata`** como sustrato de procedencia (MOV §0.6: *"el Ledger no es una entidad… es la infraestructura de procedencia"*; `OSE INV-1`: *"la procedencia es un campo del Sello Epistémico, no una entidad"*). **No se crea un sistema de procedencia nuevo.**

---

## 3. Límites — qué NO hace (frontera dura)

Este componente es **memoria, no mente**. Persiste, consulta y guarda invariantes de la sustancia; **no ejecuta ningún acto cognitivo**.

- **No razona.** No deriva inferencias, no clasifica síntoma/causa/restricción, no recorre el grafo causal *para diagnosticar*. Recorrer un `vinculo` o un `relacion_causal` aquí es **lectura de grafo** (devolver aristas y nodos sellados), no DIAGNOSTICAR ni JUZGAR.
- **No mide sorpresa.** La comparación observación-vs-`expectativa` es **G2 del OSE** (`OSE INV-5`). El modelo solo *sirve* la `expectativa` vigente contra la que el OSE medirá.
- **No integra ni propaga coherencia por sí mismo.** La reaplicación del eslabón débil y la propagación por dependencias es el efecto interno de **G3** del OSE. El modelo persiste el resultado y *rechaza por abstención* un estado que violaría un invariante de sustancia, pero no decide cómo propagar.
- **No emite `perturbacion`.** Esa es la salida máxima del OSE (`P-OUT`). El modelo la persiste cuando el OSE la escribe.
- **No crea ni prioriza `brecha`, ni escribe `episodio`, ni ajusta `relacion_causal`/`trayectoria` como producto de razonamiento.** El OSE escribe A/B/E y recomputa el lado observado de D; RECONCILIAR escribe `episodio` y calibra C (`OSE INV-9`). El modelo **ofrece la capacidad de escritura tipada**; la disciplina de quién la invoca la imponen los casos de uso de cada acto y los guards de permiso.
- **No interpreta el eje temporal.** No presupone si la validez corre sobre tiempo uniforme, calendárico o pausable (`OSE P-CLK`: *"la política del eje es insumo sellado en la expectativa, no conocimiento del OSE"*). Persiste el horizonte y su borde; el cruce lo evalúa el barrido del OSE.

> **Criterio de fallo del componente:** si el modelo empezara a decidir qué creer, a medir sorpresa o a clasificar papeles causales, dejaría de ser memoria y absorbería competencias del Motor.

---

## 4. Interfaces públicas (puertos hexagonales)

Ubicación: `modules/mov/application/ports/`. Los puertos **declaran firmas, no implementan**. La implementación (`modules/mov/infrastructure/`) usa Supabase + RPC `security definer` con `has_tenant_permission`, mismo patrón que `record_payment`. `tenantId` es el primer parámetro en toda firma (convención del repo). `UUID` es `string` plano (`types/shared.ts`: `export type UUID = string` — **no** branded).

### 4.1 Tipos de dominio transversales (`modules/mov/domain/sellos.ts`)

```typescript
import type { Json } from "@/types/database"
import type { UUID } from "@/types/shared"   // = string (no branded)

export type EstatusEpistemico = "HECHO" | "INFERENCIA" | "HIPOTESIS"
export type TipoIncertidumbre = "reducible" | "irreducible" | "ambiguedad_no_cuantificable" // MOV §5.2 tricotomía
export type Granularidad = "instante" | "minuto" | "hora" | "dia" | "semana" | "mes" | "indeterminada"
export type ModoCierreValidez = "sustitucion" | "expiracion_natural" | "revocacion" | "abierto" // MOV §6.2

/** Sello Epistémico — dueño: Dimensión de Incertidumbre (MOV §5.2). MOV.I-0 exige su presencia. */
export type SelloEpistemico = {
  readonly estatus: EstatusEpistemico
  /** Confianza graduada y ordenable en [0,1]. NULL SOLO si confianzaNoEvaluada=true (MOV §5.2: estado distinto de confianza mínima). */
  readonly confianza: number | null
  readonly confianzaNoEvaluada: boolean
  readonly tipoIncertidumbre: TipoIncertidumbre | null
  readonly calidadBase: number | null              // MOV §5.2 "calidad de la base"
  readonly procedencia: Procedencia
}

/** Procedencia = campo del sello (OSE INV-1), materializado sobre audit_events.metadata (MOV §0.6). NO es entidad. */
export type Procedencia = {
  /** Observaciones raíz (B1) de las que deriva. MOV.I-1: HECHO/INFERENCIA trazan a ≥1; HIPOTESIS exenta. */
  readonly rootObservationIds: readonly UUID[]
  readonly derivationPath: readonly UUID[]         // premisas de las que se derivó (INFERENCIA)
  readonly sourceAuthority: string | null
  /** Marcador de fuente común (MOV §5.2): el "acuerdo" de hermanas de raíz común NO refuerza confianza. */
  readonly commonSourceKey: string | null
  readonly auditEventId: UUID | null               // FK al audit_event que la registró
}

/** Sello Temporal — dueño: Dimensión del Tiempo (MOV §6.2). Dos relojes (OSE INV-4), jamás colapsados. */
export type SelloTemporal = {
  readonly instanteDeMundo: string                 // cuándo fue verdadero (ISO-8601)
  readonly instanteDeConocimiento: string          // cuándo el Modelo lo supo — separado del de mundo
  readonly granularidad: Granularidad              // MOV §6.2: "no finge precisión que no tiene"
  readonly certezaTemporal: EstatusEpistemico      // MOV §6.2: el "cuándo" también es HECHO/INFERENCIA/HIPÓTESIS
  readonly validezDesde: string | null
  readonly validezHasta: string | null             // null = "Ahora" (MOV §6.3 validez abierta)
  readonly modoCierreValidez: ModoCierreValidez
  readonly frescuraAnclaje: string | null          // ancla = última observación (MOV §6.2)
}
```

### 4.2 Catálogo cerrado y sobre común (`modules/mov/domain/entidad-mov.ts`)

```typescript
import type { SelloEpistemico, SelloTemporal } from "./sellos"
import type { UUID } from "@/types/shared"

export type FamiliaMov = "A_sustancia" | "B_creencia" | "C_explicacion" | "D_normativa" | "E_dinamica"

/** Los 17 tipos en 5 familias — MOV §8. CERRADO: ni un tipo más (prohibido el #18), ni uno menos. */
export type TipoMov =
  | "entidad_objeto" | "compromiso" | "flujo_recurso" | "vinculo"          // A1..A4
  | "observacion" | "inferencia" | "expectativa"                          // B1..B3
  | "relacion_causal" | "trayectoria"                                     // C1..C2
  | "objetivo" | "restriccion" | "brecha" | "norma_conducta"              // D1..D4
  | "episodio" | "perturbacion" | "intervencion" | "exposicion" | "capital_relacional" // E1..E5

/** Sobre invariante: TODA entidad porta ambos sellos (MOV.I-0). No existe entidad "desnuda". */
export type EntidadMov<TAttrs = Record<string, unknown>> = {
  readonly id: UUID
  readonly tenantId: UUID
  readonly familia: FamiliaMov
  readonly tipo: TipoMov                            // inmutable (MOV §1.1): una entidad origina otra, no migra
  readonly sello: SelloEpistemico
  readonly tiempo: SelloTemporal
  readonly attrs: TAttrs                            // atributos propios del tipo (MOV §8)
  readonly deprecatedAt: string | null              // MOV.I-5: se deprecia, no se borra
  readonly supersededById: UUID | null
}
```

### 4.3 Puerto raíz y puertos por familia

`MovRepository` (`mov-repository.ts`) — superficie mínima que el OSE y los actos requieren:

```typescript
import type { EntidadMov, FamiliaMov, TipoMov } from "@/modules/mov/domain/entidad-mov"
import type { AristaMov, RelacionMov } from "@/modules/mov/domain/arista-mov"
import type { UUID } from "@/types/shared"

export interface MovRepository {
  /** Escritura atómica vía RPC mov_integrar (efecto de G3). Familias C/D rechazadas (OSE INV-6). Abstención si viola invariante. */
  integrar(input: {
    tenantId: UUID
    familia: FamiliaMov
    entidad: Omit<EntidadMov, "id" | "deprecatedAt" | "supersededById"> & { id?: UUID }
    aristas?: ReadonlyArray<Omit<AristaMov, "id" | "tenantId">>
  }): Promise<UUID>

  getById(tenantId: UUID, id: UUID): Promise<EntidadMov | null>

  listByType(tenantId: UUID, tipo: TipoMov, opts: { onlyValid?: boolean; page: number; pageSize: number }): Promise<EntidadMov[]>

  /** Anclaje (OSE P-IN/G1): entidades cuyo sujeto/referente es la entidad de sustancia dada. NO recorre causalidad. */
  listByAnchor(tenantId: UUID, anchorId: UUID, tipos?: readonly TipoMov[]): Promise<EntidadMov[]>

  /** Supersesión por superposición (OSE: re-anclaje con corrección declarada): deprecia, no borra. Respeta MOV.I-5. */
  deprecate(tenantId: UUID, id: UUID, supersededById: UUID): Promise<void>
}
```

Puertos segregados por familia (cada acto depende solo de lo que usa):

```typescript
// substance-repository.ts — Familia A; lo que el OSE actualiza en G3 paso 1
export interface SubstanceRepository {
  getObject(tenantId: UUID, id: UUID): Promise<EntidadMov | null>          // entidad_objeto / compromiso / flujo_recurso
  /** Recorre el grafo de vinculo (A4) desde una entidad. Sustrato de P-OUT.propagacion. Devuelve aristas selladas; NO interpreta. */
  traverseLinks(tenantId: UUID, fromId: UUID, linkTypes: readonly string[], maxDepth: number): Promise<AristaMov[]>
}

// belief-repository.ts — Familia B; lo que el OSE ancla, mide y sirve
export interface BeliefRepository {
  appendObservation(obs: EntidadMov): Promise<void>                        // observacion inmutable (MOV.I-5)
  findActiveExpectation(tenantId: UUID, subjectRef: UUID, atWorldInstant: string): Promise<EntidadMov | null> // insumo de G2
  /** Combustible del barrido P-CLK: expectativas con borde finito sin cumplir. NO evalúa el cruce. */
  listPendingExpectations(tenantId: UUID, page: number, pageSize: number): Promise<EntidadMov[]>
  /** Transita expectativa.resultado a 'vencida_sin_cumplir' UNA sola vez (OSE P-CLK). MOV.I-2. */
  setExpectationOutcome(tenantId: UUID, id: UUID, outcome: string, transitionSeal: SelloTemporal): Promise<void>
  /** Conflicto de fuentes como creencia disyuntiva (MOV §5.2; OSE INV-7). No elige ganador, no promedia. */
  writeDisjunctiveBelief(branches: ReadonlyArray<EntidadMov>, masa: Record<string, number>, conflictoPersistente: boolean): Promise<void>
}

// causal-graph-repository.ts — Familia C; lectura para DIAGNOSTICAR/JUZGAR; el OSE solo lee trayectoria
export interface CausalGraphRepository {
  traverseUpstream(tenantId: UUID, fromNodeId: UUID, maxDepth: number): Promise<AristaMov[]>   // DIAGNOSTICAR (hacia atrás)
  traverseDownstream(tenantId: UUID, fromNodeId: UUID, maxDepth: number): Promise<AristaMov[]> // JUZGAR (hacia adelante)
  getTrajectory(tenantId: UUID, id: UUID): Promise<EntidadMov | null>      // OSE solo lee, no ajusta
}

// normative-repository.ts — Familia D; insumo de lectura del OSE; recomputa lado observado de la brecha
export interface NormativeRepository {
  listActiveObjectives(tenantId: UUID): Promise<EntidadMov[]>
  listActiveConstraints(tenantId: UUID): Promise<EntidadMov[]>
  listGaps(tenantId: UUID, opts: { onlyOpen?: boolean }): Promise<EntidadMov[]>
  /** Recomputa el LADO OBSERVADO (= magnitud/tendencia recomputadas) de una brecha EXISTENTE (OSE INV-9; flujo G3 paso A4 sub-paso 2). NO crea ni prioriza. */
  updateGapObservedSide(tenantId: UUID, id: UUID, magnitud: number, tendencia: string, transitionSeal: SelloTemporal): Promise<void>
}

// dynamics-repository.ts — Familia E; cada tipo escrito por su acto dueño
export interface DynamicsRepository {
  writePerturbation(perturbation: EntidadMov, afectadas: readonly UUID[]): Promise<void> // P-OUT (lo escribe el OSE)
  writeEpisode(episode: EntidadMov): Promise<void>                          // SOLO RECONCILIAR, nunca el OSE
  listEpisodesBySignature(tenantId: UUID, signature: Record<string, unknown>, limit: number): Promise<EntidadMov[]> // materia prima de G5/G7
}
```

> **Nota sobre `updateGapObservedSide` (corrección de refutador).** El canon (MOV §8) lista para `brecha` (D3): `magnitud; tendencia; urgencia; referente; causas candidatas; carácter`. NO existe un "lado observado" como columna separada. La firma materializa la regla del flujo del OSE (G3 paso A4 sub-paso 2): el OSE *recomputa la distancia estado-vs-referente* — operativamente, los atributos **observacionales** de la brecha (`magnitud`, `tendencia`). El `referente` y las `causas_candidatas` son **insumo no tocado** por el OSE. La partición "lado observado mutable / lado normativo insumo" es una interpretación de ingeniería declarada, no un concepto canónico literal (ver AQ-BRECHA).

---

## 5. Contratos de entrada

Las firmas siguen `(tenantId, …): Promise<…>`. Cada operación declara **precondiciones** (qué se acepta al escribir). Estos contratos materializan los puertos del OSE y los invariantes del MOV.

### 5.1 `integrar` (efecto de G3 — la única escritura del OSE)

- **Precondiciones (garantiza el llamante):**
  - La entidad porta **ambos sellos completos** (`MOV.I-0` / `OSE INV-1`). Ningún campo de sello vacío; ningún campo "se completa después".
  - `familia ∈ {A_sustancia, B_creencia, E_dinamica}` cuando el llamante es el OSE. C/D rechazadas (`OSE INV-6`: el OSE no escribe explicación ni normativa como decisión propia). Otros actos (RECONCILIAR) sí pueden escribir C/E con su propio permiso.
  - **Etiqueta epistémica correcta** (`OSE INV-2`): `estatus = HECHO` **solo** si `tipo = observacion`. Derivados (inferencia, expectativa, estado A derivado) son `INFERENCIA`/`HIPOTESIS`.
  - **Anclaje observacional** (`MOV.I-1`): si `estatus ∈ {HECHO, INFERENCIA}` ⇒ `procedencia.rootObservationIds` no vacío. Solo `HIPOTESIS` está exenta (declara su carencia).
  - **Ley del eslabón débil** (`MOV.I-3` / §0.7): la confianza propuesta `≤ min(confianza de premisas)`; la frescura `≤ min(frescura de premisas)`; **el estatus `≤` el estatus más débil** (HIPOTESIS contagia: derivado de HIPOTESIS es a lo sumo INFERENCIA, nunca HECHO).
  - `relacion_causal` (C1) **nunca** `HECHO` (MOV §2.1, R1).
- **Errores:** `MOV_SELLO_INCOMPLETO`, `MOV_HECHO_SOLO_OBSERVACION`, `MOV_ANCLAJE_VIOLADO`, `MOV_ESLABON_DEBIL_VIOLADO`, `MOV_OSE_NO_ESCRIBE_C_D`, `MOV_CAUSAL_NO_HECHO`, `MOV_FORBIDDEN` (sin permiso de tenant).

### 5.2 `appendObservation` (única vía que introduce HECHO)

- **Precondiciones:** procedencia trazable (`sourceAuthority` + `auditEventId` o origen externo); `instanteDeMundo`, `granularidad`, `certezaTemporal` presentes; si falta `instanteDeConocimiento` se toma el instante de admisión (`OSE P-IN`).
- **Rama "tipo no catalogado":** se sella igual como `observacion` con `attrs.inclasificable = true` (apertura ontológica, `OSE INV-8a`); **no** se fuerza a un tipo ni se crea el #18.
- **Errores:** `MOV_NO_PROVENANCE` (sin procedencia ⇒ se abstiene, `OSE INV-1` rama "no se puede sellar"), `MOV_FORBIDDEN`.

### 5.3 `setExpectationOutcome` (barrido de Vencimiento — `OSE P-CLK`)

- **Precondiciones:** la `expectativa` tiene **ventana finita y horizonte sellado**; su borde fue **cruzado** por el avance del instante de mundo; su `resultado` sigue sin cumplimiento. El cruce se evalúa por la **relación de orden** del eje sellado en la propia expectativa (el modelo no presupone uniforme/calendárico/pausable). Se transita **una sola vez** (`OSE INV-8b`).
- **Errores:** `MOV_EXPECTATION_NOT_DUE`, `MOV_EXPECTATION_ALREADY_RESOLVED`.

### 5.4 `writeDisjunctiveBelief` (sostener conflicto, no resolverlo)

- **Precondiciones:** ≥2 observaciones vigentes de **procedencias distintas** afirman estados incompatibles sobre la misma referencia (`OSE INV-7`). Cada rama es `HIPOTESIS`; masa de creencia repartida; ninguna rama hereda confianza superior a su premisa.
- **Prohibido:** elegir ganador, promediar, sobrescribir la previa. → `MOV_CONFLICT_AVERAGED`, `MOV_CONFLICT_SILENT_OVERWRITE`.

---

## 6. Contratos de salida

Toda lectura garantiza:

1. **Ningún valor desnudo:** cada entidad devuelta porta sus dos sellos completos (`MOV.I-0`; MOTOR §3.2 (c) "el sello viaja con cada lectura").
2. **Aislamiento de tenant:** solo filas del `tenantId` (RLS + filtro explícito).
3. **Coherencia:** el conjunto satisface la Ley del eslabón débil (ninguna entidad lee con confianza > su premisa más débil ya persistida).
4. **Dos relojes distinguidos:** `instanteDeMundo` y `instanteDeConocimiento` se devuelven por separado; habilita "¿qué era verdad el martes?" vs "¿qué creíamos el martes?" (MOV §6.1).
5. **Conflicto representado, no colapsado:** la creencia disyuntiva se devuelve como conjunto de ramas con su masa, nunca como un valor único.

`integrar` devuelve la `UUID` de la entidad escrita, o **lanza** (abstención): cuando un invariante no puede satisfacerse, la transacción revierte TODO y el MOV no queda en estado intermedio observable (`OSE` Regla de cierre). El llamante recibe el `errcode`, que el repositorio traduce a error de dominio.

---

## 7. Invariantes (constraint/trigger SQL + guard de aplicación)

> Cada invariante se expresa, donde es posible, como **constraint/trigger SQL** (defensa de datos, no eludible) y donde no, como **guard de aplicación** en la RPC/use-case (defensa de intención). Prefijo de origen para evitar colisiones.

| Invariante (canon) | (a) SQL | (b) Guard | Error |
|---|---|---|---|
| **MOV.I-0** sellado completo (incluida procedencia) | columnas de sello `NOT NULL` + `mov_assert_sellos` exige estatus, **procedencia poblada**, ambos relojes; XOR de confianza | el repositorio rechaza input incompleto; no completa sellos después (`OSE INV-1`) | `MOV_SELLO_INCOMPLETO` (23514) |
| **MOV.I-1** anclaje observacional | trigger `mov_enforce_anchoring`: HECHO/INFERENCIA exigen `rootObservationIds` no vacío; HIPOTESIS exenta | — | `MOV_ANCLAJE_VIOLADO` (23514) |
| **OSE INV-2** / HECHO solo observación | `CHECK (estatus <> 'HECHO' OR tipo = 'observacion')` por tabla | `integrar` rechaza promover a HECHO sin observación entrante | `MOV_HECHO_SOLO_OBSERVACION` |
| **MOV.I-2** no promoción silenciosa | trigger `mov_block_silent_promotion`: prohíbe subir confianza/estatus/frescura sin premisa entrante registrada | transición de estatus solo por evento explícito | `MOV_SILENT_PROMOTION` (23514) |
| **MOV.I-3 / §0.7** eslabón débil (confianza, frescura **y estatus**) | RPC topa los tres contra `min(premisas)`; `confianza_no_evaluada` se trata como **incomparable** (no como 0) | carga premisas y verifica antes de persistir | `MOV_ESLABON_DEBIL_VIOLADO` (23514) |
| **OSE INV-4** dos relojes | `instante_de_mundo` e `instante_de_conocimiento` columnas separadas `NOT NULL`; nunca colapsadas en una | `reanchor`: identidad del hecho por `(sourceAuthority, instante_de_mundo, contenido)`, no por transporte | `MOV_CLOCK_COLLAPSE` |
| **MOV.I-5** inmutabilidad del hecho | trigger `mov_observation_immutable`: prohíbe `DELETE` y edición de `contenido`/`instante_de_mundo`; solo `deprecated_at` | supersesión por superposición | `MOV_OBSERVATION_IMMUTABLE` (23514) |
| **MOV.I-6** deber-ser explícito | arista `referente` brecha→objetivo obligatoria (verificada en RPC) | `integrar` rechaza brecha sin referente | `MOV_GAP_WITHOUT_REFERENT` |
| **OSE INV-6** frontera de escritura | `GRANT`/RLS + RPC: rol OSE no inserta en `mov_explicacion`/`mov_normativa` | `integrar` rechaza familia C/D del OSE | `MOV_OSE_NO_ESCRIBE_C_D` (42501) |
| **MOV §2.1 R1** enlace causal nunca HECHO | `CHECK (tipo <> 'relacion_causal' OR estatus <> 'HECHO')` | — | `MOV_CAUSAL_NO_HECHO` |
| **OSE INV-7** conflicto representado | — | rechaza promediar/sobrescribir conflicto de procedencias distintas | `MOV_CONFLICT_AVERAGED` / `MOV_CONFLICT_SILENT_OVERWRITE` |
| **MOV.I-9** no-doble-instanciación | FK de origen `originated_from_observation_id` (E2), `originated_from_expectation_id` (D3) | rechaza instanciar el mismo evento como par B1/E2 o B3-refutada/D3 sin relación de origen | `MOV_DOUBLE_INSTANCE` |
| **OSE P-OUT** no-juicio en perturbación | `CHECK` rechaza claves `prioridad/score/urgencia/ranking` en `attrs` de `perturbacion` | — | `MOV_PERTURBATION_HAS_PRIORITY` |
| RLS por tenant | RLS con `has_tenant_permission` en las 6 tablas | guard `has_tenant_permission(tenant_id,'mov.write')` al inicio de la RPC | `MOV_FORBIDDEN` (42501) |

> **Atribución correcta (corrección de refutador):** `MOV.I-9` (no-doble-instanciación) es del **MOV** (§1.7, línea 176), NO del OSE — el OSE lo **podó** de su aparato. La spec lo soporta porque su autoridad primaria es el MOV. No se etiqueta como "OSE INV-7" (que es conflicto-de-fuentes).

---

## 8. Modelo de datos (SQL Supabase + tipos TypeScript)

> **Decisión de modelo físico — UNA sola opción (resuelve la contradicción de los tres borradores).** Se adopta **5 tablas por familia + `mov_arista`**. Justificación trazable: hace de la frontera de escritura del OSE (`OSE INV-6`: "el OSE solo escribe A/B/E; PROHIBIDO C/D") una **restricción de esquema** (`GRANT`/RLS por familia), no una comprobación en código. La tabla única polimórfica y la tabla-por-tipo quedan **descartadas explícitamente**. *Aclaración de honestidad (regla 8):* el canon NO prescribe la física de almacenamiento; la cardinalidad "5 tablas" es **decisión de implementación** elegida por evidencia de la infraestructura existente (patrón de migraciones, costo de JOINs) + trazabilidad de la frontera A/B/E. Las citas a `OSE INV-6` / MOTOR §3.2 justifican el **requisito** (cruzar familias, frontera de escritura), no derivan la cardinalidad (ver AQ-GRANULARIDAD).

### 8.1 Enums

```sql
create type public.mov_familia as enum ('A_sustancia','B_creencia','C_explicacion','D_normativa','E_dinamica');

create type public.mov_tipo as enum (
  'entidad_objeto','compromiso','flujo_recurso','vinculo',                     -- A1..A4
  'observacion','inferencia','expectativa',                                     -- B1..B3
  'relacion_causal','trayectoria',                                              -- C1..C2
  'objetivo','restriccion','brecha','norma_conducta',                           -- D1..D4
  'episodio','perturbacion','intervencion','exposicion','capital_relacional');  -- E1..E5

create type public.mov_estatus as enum ('HECHO','INFERENCIA','HIPOTESIS');                    -- MOV §5.2
create type public.mov_tipo_incertidumbre as enum ('reducible','irreducible','ambiguedad_no_cuantificable'); -- MOV §5.2
create type public.mov_granularidad as enum ('instante','minuto','hora','dia','semana','mes','indeterminada'); -- MOV §6.2
create type public.mov_modo_cierre as enum ('sustitucion','expiracion_natural','revocacion','abierto');        -- MOV §6.2
create type public.mov_cardinalidad as enum ('individuo','poblacion');                        -- MOV §1.2 A1

create type public.mov_relacion as enum (
  'causal',             -- C1 origen→destino (MOV §2.2); palanca de E3; causas candidatas de D3
  'vinculo',            -- A4 extremos {asociativo, compatibilidad, contractual, dependencia, contencion}
  'composicion',        -- A1 parte-de (MOV §1.2)
  'referente',          -- D3 brecha → D1 objetivo (MOV.I-6); E4 exposicion → referente (apetito de riesgo, MOV §1.6)
  'ancla',              -- B1 observacion → A (anclaje, OSE P-IN/G1; no recorre causalidad)
  'afecta',             -- E2 perturbacion → A afectadas (OSE P-OUT)
  'palanca',            -- E1 episodio → E3 intervencion (MOV §1.6 cierre de referencia colgante)
  'expectativa_previa', -- E1 episodio → B3
  'resultado',          -- E1 episodio → B1
  'disyuncion',         -- creencia disyuntiva entre varias B (MOV §5.2; OSE INV-7)
  'base_de_expectativa' -- B3 expectativa → C2 trayectoria / A estado (materializa el atributo 'base' de B3, MOV §8)
);
```

> **`naturaleza` NO es enum cerrado (corrección de refutador).** MOV §1.2 A1 dice que naturaleza es *"enum ABIERTO y probado contra dominios sin despacho físico"*. Un enum Postgres es cerrado por definición. Para honrar la palabra canónica **abierto**, `naturaleza` vive en `attrs.naturaleza` (texto libre validado en el dominio), no como tipo SQL. Coherente con que `ubicacion` ya se degrada a `attrs` (MOV §1.2). Igual: `base_de_expectativa` reemplaza el nombre `mide_contra` del borrador (medir es G2, un acto; el atributo canónico es `base`, MOV §8 B3).

### 8.2 Bloque de sellos común (`<SELLOS_COMUNES>`) — idéntico en las 5 tablas de familia

```sql
-- <SELLOS_COMUNES>
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants(id) on delete cascade,
  tipo                     public.mov_tipo not null,        -- discriminador (inmutable, MOV §1.1)
  -- ── SELLO EPISTÉMICO (MOV §5.2) ──
  estatus                  public.mov_estatus not null,
  confianza                numeric(5,4),                    -- [0,1]; NULL solo si confianza_no_evaluada
  confianza_no_evaluada    boolean not null default false,  -- MOV §5.2: estado distinto de confianza mínima
  tipo_incertidumbre       public.mov_tipo_incertidumbre,   -- MOV §5.2 tricotomía
  calidad_base             smallint,                        -- MOV §5.2
  procedencia              jsonb not null,                  -- {rootObservationIds[], derivationPath[], sourceAuthority, commonSourceKey, auditEventId}
  procedencia_event_id     uuid references public.audit_events(id), -- LEDGER = procedencia (MOV §0.6)
  -- ── SELLO TEMPORAL (MOV §6.2) ──
  instante_de_mundo        timestamptz not null,
  instante_de_conocimiento timestamptz not null,            -- separado del de mundo (OSE INV-4)
  granularidad             public.mov_granularidad not null default 'instante',
  certeza_temporal         public.mov_estatus not null default 'INFERENCIA',
  validez_desde            timestamptz,
  validez_hasta            timestamptz,                      -- null = "Ahora" (MOV §6.3)
  modo_cierre_validez      public.mov_modo_cierre not null default 'abierto',
  frescura                 numeric(5,4) not null,            -- valor SELLADO al escribir (ver nota)
  frescura_anclaje         timestamptz,                      -- ancla = última observación (MOV §6.2)
  -- ── atributos propios del tipo ──
  attrs                    jsonb not null default '{}'::jsonb,
  -- ── trazabilidad / supersesión ──
  created_at               timestamptz not null default now(),
  deprecated_at            timestamptz,                      -- MOV.I-5
  superseded_by_id         uuid,
  -- ── invariantes intra-fila ──
  constraint mov_conf_xor check (case when confianza_no_evaluada then confianza is null else confianza is not null end), -- NO fija 0
  constraint mov_conf_rango check (confianza is null or (confianza >= 0 and confianza <= 1)),
  constraint mov_frescura_rango check (frescura >= 0 and frescura <= 1),
  constraint mov_validez_orden check (validez_hasta is null or validez_desde is null or validez_hasta >= validez_desde)
```

> **Frescura (resuelve la contradicción de los borradores): se PERSISTE el valor sellado al escribir.** Como la Ley del eslabón débil topa la frescura por `min(premisas)` *en escritura*, frescura debe existir como valor sellado y persistido. El **decaimiento posterior** (perfil por clase, MOV §6.2) es **función de lectura**; **ningún proceso la sube** silenciosamente. Persistir el valor sellado ≠ persistir el decaimiento. El mecanismo de recomputo entre escrituras queda como AQ-DECAIMIENTO.

> **`confianza_no_evaluada` (corrección de refutador): NO se fija a 0.** El `CHECK mov_conf_xor` permite `confianza` NULL exactamente cuando `confianza_no_evaluada = true`. El `min()` del eslabón débil trata "no evaluada" como **incomparable/abstención**, nunca como confianza mínima 0 (MOV §5.2: "estado distinto de confianza mínima"). Si una premisa es no-evaluada, la RPC se abstiene en vez de derivar un mínimo numérico falso.

### 8.3 Las cinco tablas de familia

```sql
-- A — Sustancia (A1 entidad_objeto, A2 compromiso, A3 flujo_recurso, A4 vinculo)
create table public.mov_sustancia (
  <SELLOS_COMUNES>,
  cardinalidad public.mov_cardinalidad,   -- MOV §1.2 A1; NOT NULL lógico solo para entidad_objeto
  constraint mov_sustancia_familia check (tipo in ('entidad_objeto','compromiso','flujo_recurso','vinculo')),
  constraint mov_sustancia_card    check ((tipo = 'entidad_objeto') = (cardinalidad is not null)),
  constraint mov_sustancia_hecho   check (estatus <> 'HECHO')  -- A nunca HECHO (solo observacion lo es)
);
-- attrs (validados en el dominio):
--  entidad_objeto: { naturaleza, estado, capacidad, composicion[], ubicacion?, reglas_membresia? }  (MOV §1.2 A1)
--  compromiso:     { direccion, plazo{tipo}, cumplimiento, contraparte, alcance, holgura }           (MOV §1.2 A2)
--  flujo_recurso:  { nivel, tasa_consumo, tasa_reposicion, piso_alarma, proyeccion_agotamiento }     (MOV §1.2 A3)
--  vinculo:        { tipo_vinculo, fuerza }  (extremos → arista 'vinculo')                            (MOV §1.2 A4)

-- B — Creencia (B1 observacion, B2 inferencia, B3 expectativa)
create table public.mov_creencia (
  <SELLOS_COMUNES>,
  concordancia text check (concordancia in ('confirma','contradice','neutral')),  -- B1 (MOV §1.3 / §8)
  resultado    text check (resultado in ('confirmada','refutada','sin_contrastar','vencida_sin_cumplir')), -- B3
  horizonte_vencimiento timestamptz,            -- borde de vencimiento (OSE P-CLK)
  vencimiento_procesado boolean not null default false, -- OSE INV-8b: se transita UNA vez
  constraint mov_creencia_familia check (tipo in ('observacion','inferencia','expectativa')),
  constraint mov_creencia_hecho   check (estatus <> 'HECHO' or tipo = 'observacion'),  -- OSE INV-2
  constraint mov_b3_horizonte     check (tipo <> 'expectativa' or horizonte_vencimiento is not null) -- ventana finita
);
-- attrs:
--  observacion: { contenido, sujeto_ref, fuente{id,fiabilidad}, inclasificable:boolean }  (MOV §1.3 B1; inclasificable = apertura ontológica OSE INV-8a)
--  inferencia:  { premisas_ref[], forma, robustez }                                        (MOV §1.3 B2)
--  expectativa: { prediccion, tolerancia }   (base → arista 'base_de_expectativa')         (MOV §1.3 B3)

-- C — Explicación (C1 relacion_causal, C2 trayectoria)  — SOLO LECTURA para el OSE (OSE INV-6/INV-9)
create table public.mov_explicacion (
  <SELLOS_COMUNES>,
  nivel_causal text check (nivel_causal in ('asociacion','intervencion','contrafactual')), -- MOV.I-4
  constraint mov_explicacion_familia check (tipo in ('relacion_causal','trayectoria')),
  constraint mov_c1_no_hecho check (tipo <> 'relacion_causal' or estatus <> 'HECHO'),       -- MOV §2.1 R1
  constraint mov_c1_nivel    check (tipo <> 'relacion_causal' or nivel_causal is not null)  -- MOV.I-4
);
-- attrs:
--  relacion_causal: { polaridad, fuerza{escala,forma}, mecanismo, retardo, condicion_falsacion, ambiguedad_direccional, modo_combinacion } (MOV §2.2; origen/destino → arista 'causal')
--  trayectoria:     { proyeccion, supuestos[], horizonte, sensibilidad }                   (MOV §1.4 C2)

-- D — Normativa (D1 objetivo, D2 restriccion, D3 brecha, D4 norma_conducta) — SOLO LECTURA para el OSE; salvo lado observado de brecha
create table public.mov_normativa (
  <SELLOS_COMUNES>,
  modalidad text check (modalidad in ('dura','blanda','negociable')),    -- D2 (MOV §4.3)
  caracter  text check (caracter in ('corregible','gestionable')),        -- D3 (MOV §1.5)
  constraint mov_normativa_familia check (tipo in ('objetivo','restriccion','brecha','norma_conducta'))
);
-- attrs:
--  objetivo:      { estado_deseado{fijo|funcion_de}, metrica, umbral, prioridad, direccion }  (MOV §1.5 D1)
--  restriccion:   { tipo[], origen, frontera, holgura, disposicion }                          (MOV §1.5 D2 / §4)
--  brecha:        { magnitud, tendencia, urgencia, severidad }  (referente → arista 'referente'; causas → aristas 'causal') (MOV §1.5 D3 / §8)
--  norma_conducta:{ condicion_aplicacion, conducta_prescrita, autoridad, rigidez }            (MOV §1.5 D4)

-- E — Memoria/Dinámica (E1 episodio, E2 perturbacion, E3 intervencion, E4 exposicion, E5 capital_relacional)
create table public.mov_dinamica (
  <SELLOS_COMUNES>,
  estado_ejecucion text check (estado_ejecucion in ('considerada','lanzada','en_curso','abortada','completada')), -- E3
  disposicion      text check (disposicion in ('aceptado','mitigado','transferido','evitado')),                  -- E4
  constraint mov_dinamica_familia check (tipo in ('episodio','perturbacion','intervencion','exposicion','capital_relacional')),
  constraint mov_e3_hipotesis check (tipo <> 'intervencion' or estado_ejecucion <> 'considerada' or estatus = 'HIPOTESIS'), -- MOV §1.6 E3
  -- OSE P-OUT: la perturbacion NO porta prioridad/score/urgencia/ranking (test de falsación OSE #7)
  constraint mov_perturbacion_no_juicio check (
    tipo <> 'perturbacion' or not (attrs ?| array['prioridad','score','urgencia','ranking'])
  )
);
-- attrs:
--  episodio:           { brecha_origen_ref, resultado, sorpresa, contexto } (palanca→E3, expectativa_previa→B3, resultado→B1 vía aristas) (MOV §1.6 E1)
--  perturbacion:       { clase, magnitud, caracter }  (afectadas → aristas 'afecta'; propagacion = cierre transitivo por 'vinculo')        (MOV §1.6 E2 / §8)
--  intervencion:       { costo, reversibilidad, rol_ejecutor, fidelidad }   (palanca → arista 'causal')                                    (MOV §1.6 E3)
--  exposicion:         { evento_potencial, probabilidad, impacto, horizonte } (apetito_de_riesgo → arista 'referente' al objetivo/referente D) (MOV §1.6 E4)
--  capital_relacional: { saldo, tendencia, eventos[] }  (actor → arista 'vinculo' a A4)                                                     (MOV §1.6 E5)
```

> **Atributos canónicos restaurados (corrección de refutador):** `concordancia` (B1) es columna tipada en `mov_creencia` (MOV §8); `caracter` se conserva en `attrs` de `perturbacion` (MOV §8 lista `carácter`, aunque `OSE P-OUT` no lo enumere — prevalece el MOV, fuente primaria); el **apetito de riesgo** de `exposicion` (E4) se materializa como arista `referente` al objetivo/referente D que declara la tolerancia (MOV §1.6 E4), no se pierde.

### 8.4 Aristas del grafo (`mov_arista`)

```sql
create table public.mov_arista (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  relacion        public.mov_relacion not null,
  origen_id       uuid not null,                 -- 1 de 5 tablas de familia (FK polimórfica → integridad en RPC)
  destino_id      uuid not null,
  origen_familia  public.mov_familia not null,   -- desnormalizado: barrido sin UNION de 5 tablas
  destino_familia public.mov_familia not null,
  estatus         public.mov_estatus,            -- una arista 'causal' es afirmación con sello; 'ancla'/'composicion' son estructurales
  confianza       numeric(5,4),
  instante_de_mundo        timestamptz,
  instante_de_conocimiento timestamptz,
  attrs           jsonb not null default '{}'::jsonb,  -- fuerza/polaridad/direccion/masa según relacion
  created_at      timestamptz not null default now(),
  deprecated_at   timestamptz,
  constraint mov_arista_causal_no_hecho check (relacion <> 'causal' or estatus is distinct from 'HECHO') -- MOV §2.1 R1
);

create index mov_arista_origen_idx  on public.mov_arista (tenant_id, origen_id, relacion)  where deprecated_at is null;
create index mov_arista_destino_idx on public.mov_arista (tenant_id, destino_id, relacion) where deprecated_at is null;
```

> **FK polimórfica sin integridad declarativa nativa:** `origen_id`/`destino_id` apuntan a una de 5 tablas; Postgres no soporta FK polimórfica. La integridad se garantiza en `mov_integrar` (único camino de mutación, `security definer`). **Riesgo real:** `service_role` (usado por seed scripts) salta RLS y guard — debe respetar la integridad manualmente o pasar por `mov_integrar`. Alternativa (tabla-índice `mov_nodo`) registrada en AQ-FK-POLIMORFICA.

### 8.5 Índices de soporte

```sql
create index mov_sustancia_tenant_tipo_idx on public.mov_sustancia (tenant_id, tipo) where deprecated_at is null;
create index mov_creencia_tenant_tipo_idx  on public.mov_creencia  (tenant_id, tipo) where deprecated_at is null;
-- Barrido de Vencimiento (OSE P-CLK): expectativas con borde finito no cruzado y sin cumplir
create index mov_creencia_vencimiento_idx on public.mov_creencia (tenant_id, horizonte_vencimiento)
  where tipo = 'expectativa' and resultado = 'sin_contrastar' and vencimiento_procesado = false;
-- Re-anclaje (OSE INV-4): localizar por instante de mundo + procedencia
create index mov_creencia_reanclaje_idx on public.mov_creencia (tenant_id, instante_de_mundo, procedencia_event_id);
```

### 8.6 RLS (idéntico al resto del producto)

```sql
alter table public.mov_sustancia   enable row level security;
alter table public.mov_creencia    enable row level security;
alter table public.mov_explicacion enable row level security;
alter table public.mov_normativa   enable row level security;
alter table public.mov_dinamica    enable row level security;
alter table public.mov_arista      enable row level security;

-- Lectura: miembro con permiso (patrón audit_events)
create policy "mov_sustancia_read" on public.mov_sustancia
  for select to authenticated using (public.has_tenant_permission(tenant_id, 'mov.read'));
-- ... idéntico para las otras 5 tablas ...

-- Escritura: NUNCA directa. Único camino = RPC security definer mov_integrar.
-- No se crea policy de insert/update para 'authenticated' → todo INSERT directo es rechazado.
```

> **Permiso unificado (corrección de refutador):** un solo nombre `mov.read` / `mov.write` en TODA la spec (se elimina la triple nomenclatura `mov.substance.write`). Sigue el patrón real `dominio.recurso.accion`. El catálogo de permisos y su seed quedan en AQ-PERMISOS.

> **`on delete` (anotado):** `mov_*.tenant_id` usa `on delete cascade` (al borrar el tenant se borra su MOV), distinto de `audit_events.tenant_id` (`on delete set null`, que conserva la auditoría sin tenant). Decisión consciente: el MOV es estado del tenant, no auditoría de plataforma.

### 8.7 Tipos TypeScript de arista

```typescript
// modules/mov/domain/arista-mov.ts
import type { EstatusEpistemico } from "./sellos"
import type { FamiliaMov } from "./entidad-mov"
import type { UUID } from "@/types/shared"

export type RelacionMov =
  | "causal" | "vinculo" | "composicion" | "referente" | "ancla"
  | "afecta" | "palanca" | "expectativa_previa" | "resultado"
  | "disyuncion" | "base_de_expectativa"

export type AristaMov = {
  readonly id: UUID
  readonly tenantId: UUID
  readonly relacion: RelacionMov
  readonly origenId: UUID
  readonly destinoId: UUID
  readonly origenFamilia: FamiliaMov
  readonly destinoFamilia: FamiliaMov
  readonly estatus: EstatusEpistemico | null  // null si arista estructural (ancla/composicion)
  readonly confianza: number | null
  readonly attrs: Record<string, unknown>
}
```

---

## 9. Flujo interno (ciclo de vida de una entidad: validar → sellar → persistir → indexar → servir)

```
  candidato (datos crudos + premisas)
        │
   [1 VALIDAR]  forma del tipo (familia/attrs) + MOV.I-1 anclaje observacional
        │           ├─ HECHO/INFERENCIA ⇒ ≥1 observación en procedencia
        │           └─ HIPOTESIS ⇒ exenta (declara su carencia)
        │
   [2 SELLAR]   stampSeals(): compone Sello Epistémico + Sello Temporal (MOV.I-0)
        │           y aplica ESLABÓN DÉBIL (MOV §0.7): confianza ≤ min(premisas);
        │           frescura ≤ min(premisas); estatus ≤ más débil (HIPOTESIS contagia)
        │           (confianza_no_evaluada = incomparable, NO 0)
        │
   [3 PERSISTIR] RPC security definer mov_integrar(): re-valida en SQL (CHECK/trigger),
        │           inserta entidad + aristas; cualquier RAISE revierte TODO
        │           (OSE Regla de cierre: el MOV nunca observable incoherente)
        │
   [4 INDEXAR]  (tenant,tipo); ancla; vencimiento (P-CLK); re-anclaje (INV-4)
        │
   [5 SERVIR]   listByAnchor / traverse* / listByType devuelven SIEMPRE con AMBOS sellos
                  (MOTOR §3.2 (c): ningún peldaño lee un valor desnudo)
```

Regla transversal: **la promoción de estatus nunca es silenciosa** (`MOV.I-2`). El único modo de que el MOV contenga un HECHO es que **entre** una `observacion` con estatus HECHO. La escritura del OSE recae **solo** sobre A/B/E (`OSE INV-6`); la lectura del MOV pertenece a los actos aguas abajo.

---

## 10. Pseudocódigo

### 10.1 Eslabón débil — función pura (`modules/mov/domain/weak-link.ts`)

```ts
const ESTATUS_ORDER = { HIPOTESIS: 0, INFERENCIA: 1, HECHO: 2 } as const
type Estatus = keyof typeof ESTATUS_ORDER
type Premise = { estatus: Estatus; confianza: number | null; confianzaNoEvaluada: boolean; frescura: number }

// MOV §0.7: lo derivado nunca declara más confianza, ni estatus más firme, ni más frescura que su premisa más débil.
function applyWeakLink(
  declared: { estatus: Estatus; confianza: number | null; frescura: number },
  premises: Premise[],
): { estatus: Estatus; confianza: number | null; frescura: number } | { abstain: "PREMISA_NO_EVALUADA" } {
  if (premises.length === 0) return declared        // observacion (HECHO) o hipotesis pura
  // confianza_no_evaluada es INCOMPARABLE (MOV §5.2), no 0 → abstención
  if (premises.some(p => p.confianzaNoEvaluada)) return { abstain: "PREMISA_NO_EVALUADA" }
  const minConf  = Math.min(...premises.map(p => p.confianza as number))
  const minFresh = Math.min(...premises.map(p => p.frescura))
  const minStat  = premises.reduce<Estatus>((m, p) => ESTATUS_ORDER[p.estatus] < ESTATUS_ORDER[m] ? p.estatus : m, declared.estatus)
  // HIPOTESIS contagia: derivado de HIPOTESIS es a lo sumo INFERENCIA, nunca HECHO
  const capped: Estatus = minStat === "HIPOTESIS"
    ? (declared.estatus === "HECHO" ? "INFERENCIA" : declared.estatus)
    : (ESTATUS_ORDER[declared.estatus] > ESTATUS_ORDER[minStat] ? minStat : declared.estatus)
  return {
    estatus: capped,
    confianza: declared.confianza === null ? null : Math.min(declared.confianza, minConf),
    frescura: Math.min(declared.frescura, minFresh),
  }
}
```

### 10.2 RPC atómica `mov_integrar` (patrón `record_payment`)

```sql
create or replace function public.mov_integrar(
  p_tenant_id uuid,
  p_familia   public.mov_familia,   -- A/B/E permitidas al OSE; C/D rechazadas (OSE INV-6)
  p_entidad   jsonb,                -- entidad candidata con sus dos sellos
  p_premises  uuid[] default '{}',  -- premisas (eslabón débil)
  p_aristas   jsonb default '[]'    -- aristas a crear (propagación de coherencia)
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_min_conf numeric; v_min_fresh numeric; v_min_stat public.mov_estatus;
  v_estatus public.mov_estatus := (p_entidad->>'estatus')::public.mov_estatus;
  v_conf numeric := nullif(p_entidad->>'confianza','')::numeric;
  v_fresh numeric := (p_entidad->>'frescura')::numeric;
begin
  -- Guard de permiso (idéntico a record_payment): cierra hueco cross-tenant
  if auth.role() <> 'service_role'
     and not public.has_tenant_permission(p_tenant_id, 'mov.write') then
    raise exception 'MOV_FORBIDDEN' using errcode = '42501';
  end if;

  -- OSE INV-6: el OSE no escribe C ni D como decisión propia
  if p_familia in ('C_explicacion','D_normativa') then
    raise exception 'MOV_OSE_NO_ESCRIBE_C_D' using errcode = '42501';
  end if;

  -- OSE INV-2 / MOV §2.1 R1
  if v_estatus = 'HECHO' and (p_entidad->>'tipo') <> 'observacion' then
    raise exception 'MOV_HECHO_SOLO_OBSERVACION' using errcode = '23514';
  end if;

  -- MOV.I-1 + Eslabón Débil: leer premisas (FOR SHARE) y topar confianza/frescura/estatus
  if v_estatus <> 'HIPOTESIS' then
    if p_premises is null or array_length(p_premises,1) is null then
      raise exception 'MOV_ANCLAJE_VIOLADO' using errcode = '23514';  -- HECHO/INFERENCIA exigen anclaje
    end if;
    -- confianza_no_evaluada en una premisa ⇒ abstención (MOV §5.2: incomparable, no 0)
    if exists (select 1 from public.mov_premise_view p where p.id = any(p_premises) and p.tenant_id = p_tenant_id and p.confianza_no_evaluada) then
      raise exception 'MOV_PREMISA_NO_EVALUADA' using errcode = '23514';
    end if;
    select min(confianza), min(frescura),
           (array_agg(estatus order by case estatus when 'HIPOTESIS' then 0 when 'INFERENCIA' then 1 else 2 end))[1]
      into v_min_conf, v_min_fresh, v_min_stat
      from public.mov_premise_view p          -- vista UNION de las 5 tablas (id, tenant_id, confianza, frescura, estatus)
     where p.id = any(p_premises) and p.tenant_id = p_tenant_id for share;
    if (v_conf is not null and v_conf > v_min_conf)
       or v_fresh > v_min_fresh
       or (v_min_stat = 'HIPOTESIS' and v_estatus = 'HECHO') then
      raise exception 'MOV_ESLABON_DEBIL_VIOLADO' using errcode = '23514';
    end if;
  end if;

  -- INSERT en la tabla de familia (dispara mov_assert_sellos + mov_enforce_anchoring),
  -- INSERT de aristas (verificando referencia polimórfica y MOV.I-6 referente de brecha),
  -- supersesión por superposición (deprecated_at) en vez de borrar (MOV.I-5).
  -- ... (selección de tabla por p_familia; cuerpo omitido por brevedad) ...
  -- Registrar procedencia en audit_events y guardar su id en procedencia_event_id.
  return v_id;
end $$;
```

### 10.3 Lecturas (siempre con sello)

```ts
// readByAnchor: creencias/normativas ancladas a una entidad A. NO recorre causalidad (OSE P-IN).
function readByAnchor(tenantId: UUID, anchorId: UUID): EntidadMov[]   /* cada fila con ambos sellos */
// traverseCausal: grafo de procedencia causal. Hacia atrás = DIAGNOSTICAR; hacia adelante = sustrato de JUZGAR.
function traverseCausal(tenantId: UUID, fromId: UUID, dir: "backward" | "forward", maxDepth: number)
  : { path: EntidadMov[]; confianzaAgregada: number /* = min de sellos del camino, MOV §2.2 */ }
// queryVigentes: validez abierta, no deprecado, frescura sobre el piso de su clase (MOV §6.3).
function queryVigentes(tenantId: UUID, tipo: TipoMov): EntidadMov[]   /* con sellos */
```

---

## 11. Pruebas unitarias

> **Separación exigida por implementabilidad (corrección de refutador).** El repo NO tiene Postgres de test (vitest `environment: 'node'`, tests de infraestructura **mockean** Supabase; no hay globalSetup/testcontainers). Por tanto:
> - **(1) Dominio puro (ejecutable HOY con el vitest actual):** `weak-link.test.ts`, `stamp-seals.test.ts`, `entity-write.test.ts`. Cubren U-1..U-9 a nivel dominio.
> - **(2) RPC/SQL (REQUIERE infraestructura que no existe):** se marcan explícitamente como dependientes de un Postgres de test (Supabase local / pg-mem). Su montaje queda en AQ-TEST-INFRA.

| # | Invariante | Arrange | Act | Assert |
|---|---|---|---|---|
| U-1 | `MOV.I-0` | candidato con ambos sellos completos | `writeEntity(c, [])` | `ok === true`; entidad con `sello` y `tiempo` no nulos |
| U-2 | `MOV.I-1` | INFERENCIA con procedencia que incluye una observación | `writeEntity` | `ok === true`; arista `premisa` hacia la observación |
| U-3 | `§0.7` confianza | derivada 0.9, premisa 0.6 | `applyWeakLink` | `confianza === 0.6` (topada) |
| U-4 | `§0.7` estatus | derivada HECHO, premisa HIPOTESIS | `applyWeakLink` | `estatus === "INFERENCIA"` (contagio) |
| U-5 | `§5.2` no-evaluada | premisa `confianzaNoEvaluada=true` | `applyWeakLink` | `{ abstain: "PREMISA_NO_EVALUADA" }` (NO 0) |
| U-6 | `OSE INV-4` dos relojes | sello con mundo≠conocimiento | `stampSeals` | ambos presentes y no derivados uno del otro |
| U-7 | `MOV.I-5` | observación + corrección declarada | reescritura | original con `deprecatedAt` y `supersededById`; no se borra |
| U-8 | servir con sello | entidad vigente | `queryVigentes(t,'compromiso')` | cada fila trae `sello` y `tiempo` |
| U-9 | `MOV §2.2` confianza agregada | camino con sellos 0.8/0.5/0.7 | `traverseCausal(...,"backward")` | `confianzaAgregada === 0.5` |

```ts
it("U-4: HIPOTESIS contagia el estatus por el eslabón débil (MOV §0.7)", () => {
  const r = applyWeakLink(
    { estatus: "HECHO", confianza: 0.9, frescura: 1 },
    [{ estatus: "HIPOTESIS", confianza: 0.6, confianzaNoEvaluada: false, frescura: 1 }],
  )
  expect("abstain" in r).toBe(false)
  if (!("abstain" in r)) expect(r.estatus).toBe("INFERENCIA")  // nunca HECHO
})
```

---

## 12. Pruebas de falsación (deben FALLAR — la escritura es rechazada)

Espejan el *Apéndice de falsación* del OSE. El test pasa si y solo si la operación es **rechazada**. Las que tocan SQL/RPC dependen de AQ-TEST-INFRA.

| # | Estado prohibido | Acto que lo intenta | Resultado exigido | Capa |
|---|---|---|---|---|
| F-1 | entidad sin sello (`MOV.I-0`) | `writeEntity` con `tiempo` incompleto | `MISSING_TEMPORAL_SEAL` / RAISE | dominio + SQL |
| F-2 | derivada confianza > premisa (`§0.7`) | `mov_integrar(confianza=0.9, premisa=0.6)` | `MOV_ESLABON_DEBIL_VIOLADO`; 0 filas | SQL |
| F-3 | HECHO sin observación (`OSE INV-2`) | `tipo='inferencia', estatus='HECHO'` | `MOV_HECHO_SOLO_OBSERVACION` | dominio + CHECK |
| F-4 | colapsar relojes (`OSE INV-4`) | `instante_de_conocimiento` null | `MOV_CLOCK_COLLAPSE`/NOT NULL | SQL |
| F-5 | `relacion_causal` HECHO (`MOV §2.1 R1`) | `tipo='relacion_causal', estatus='HECHO'` | `MOV_CAUSAL_NO_HECHO`; CHECK | dominio + CHECK |
| F-6 | promoción silenciosa (`MOV.I-2`) | reescribir INFERENCIA→HECHO sin observación | `MOV_SILENT_PROMOTION` | trigger |
| F-7 | borrar observación (`MOV.I-5`) | `delete from mov_creencia where tipo='observacion'` | RLS/trigger lo impide; solo `deprecated_at` | SQL |
| F-8 | escritura cross-tenant | RPC con `p_tenant_id` ajeno | `MOV_FORBIDDEN` (42501) | RPC guard |
| F-9 | perturbación con prioridad (`OSE P-OUT`) | `perturbacion` con `attrs.prioridad` | `MOV_PERTURBATION_HAS_PRIORITY`; CHECK | SQL |
| F-10 | confianza_no_evaluada = 0 (`MOV §5.2`) | premisa no-evaluada entra al `min()` como 0 | abstención `MOV_PREMISA_NO_EVALUADA`, no derivación | dominio + RPC |

---

## 13. Criterios de aceptación

El componente está **terminado** solo si TODOS son verdaderos:

- **CA-1 (catálogo exacto).** `mov_tipo` contiene **exactamente** los 17 tipos del Catálogo unificado (MOV §8). `expect(TIPOS_MOV.length).toBe(17)` y mapeo familia↔tipo igual a §8.
- **CA-2 (sellado universal, `MOV.I-0`).** Ninguna ruta persiste una entidad sin ambos sellos completos, **incluida la procedencia poblada**. F-1 falla en dominio Y en SQL.
- **CA-3 (eslabón débil, `§0.7`).** Para toda derivada: `confianza ≤ min(premisas)`, `frescura ≤ min(premisas)` **y `estatus ≤ más débil`**. U-3, U-4, U-9 pasan; F-2 falla. `confianza_no_evaluada` no degrada a 0: U-5, F-10.
- **CA-4 (HECHO solo por observación, `OSE INV-2`/`MOV.I-1`).** F-3, F-5 fallan; U-2 pasa.
- **CA-5 (no promoción silenciosa, `MOV.I-2`).** F-6 falla.
- **CA-6 (dos relojes, `OSE INV-4`).** U-6 pasa; F-4 falla.
- **CA-7 (inmutabilidad, `MOV.I-5`).** U-7 pasa; F-7 falla.
- **CA-8 (servir con sello).** U-8 pasa; ninguna API devuelve valor desnudo.
- **CA-9 (soporta los puertos del OSE).** Sin tipos extra: anclar `observacion`→A (`P-IN`); leer `expectativa`/`brecha`/`vinculo` para propagación (`P-OUT.propagacion`); transitar `expectativa.resultado` a `vencida_sin_cumplir` (`P-CLK`). Tests de integración (dependen de AQ-TEST-INFRA).
- **CA-10 (aislamiento por tenant).** F-8 falla.
- **CA-11 (atomicidad por abstención).** Tras cada `rejects.toThrow`, el conteo de filas no cambió (depende de AQ-TEST-INFRA).
- **CA-12 (sin conceptos nuevos).** Ninguna tabla/columna/enum introduce un concepto cognitivo fuera del canon. El Ledger (`audit_events.metadata`) se usa como procedencia, no como entidad. Verificable contra la Tabla de trazabilidad.
- **CA-13 (atributos canónicos completos).** `concordancia` (B1), `caracter` (E2), apetito de riesgo (E4 vía arista `referente`), `cardinalidad` (A1), `modo_cierre_validez`, `tipo_incertidumbre`, `certeza_temporal` presentes (MOV §1.3/§1.6/§5.2/§6.2). Ningún atributo distintivo del §8 omitido.

---

## Tabla de trazabilidad (cada artefacto → fuente canónica por nombre)

| Artefacto de la spec | Fuente canónica |
|---|---|
| Enum `mov_tipo` (17 valores, 5 familias) | MOV §8 Catálogo unificado |
| `mov_familia` (A/B/C/D/E) | MOV §1.2–§1.6 |
| Bloque de sellos común | MOV §1.1 atributos transversales; `MOV.I-0` |
| `estatus` {HECHO/INFERENCIA/HIPOTESIS} | MOV §0.3, §5.2; Constitución §4 etiqueta epistémica |
| `confianza` + `confianza_no_evaluada` (NULL, no 0) | MOV §5.2 (marcador de confianza no evaluada, "estado distinto de confianza mínima") |
| `tipo_incertidumbre` (tricotomía) | MOV §5.2 |
| `calidad_base` | MOV §5.2 |
| `procedencia` jsonb + `procedencia_event_id` | MOV §0.6 (Ledger = procedencia); `OSE INV-1` |
| Dos relojes (mundo/conocimiento separados) | MOV §6.1; `OSE INV-4`; MOTOR §2.3 paso B |
| `granularidad`, `certeza_temporal` | MOV §6.2 Sello Temporal |
| `modo_cierre_validez` {sustitución/expiración/revocación/abierto} | MOV §6.2 Intervalo de Validez; §6.3 ("Ahora", validez abierta) |
| `frescura` persistida; decaimiento en lectura | MOV §6.2 Perfil de Decaimiento; `MOV.I-2` (no se sube silenciosamente) |
| `cardinalidad` {individuo/población} | MOV §1.2 A1 |
| `naturaleza` en `attrs` (enum abierto) | MOV §1.2 A1 ("enum ABIERTO") |
| `concordancia` (B1) | MOV §1.3 B1 / §8 |
| `resultado` B3 + `horizonte_vencimiento` + `vencimiento_procesado` | MOV §1.3 B3, §6.5; `OSE P-CLK`, `OSE INV-8b` |
| `nivel_causal`; C1 nunca HECHO | MOV §1.4 C1, §2.1 R1, §2.3; `MOV.I-4` |
| `modalidad`/`caracter`/`disposicion`/`estado_ejecucion` | MOV §4.3 (D2), §1.5 (D3), §1.6 (E3/E4) |
| `caracter` en `perturbacion` | MOV §1.6 E2 / §8 (prevalece MOV sobre `OSE P-OUT` que no lo enumera) |
| apetito de riesgo (E4) vía arista `referente` | MOV §1.6 E4, §3 |
| `mov_arista` (recorrido bidireccional) | MOTOR §3.2 invariante (a); `OSE P-OUT.propagacion` |
| relación `base_de_expectativa` (ex-`mide_contra`) | MOV §8 B3 atributo `base` (renombrado: medir = G2, acto, no relación) |
| relación `disyuncion` (creencia disyuntiva) | MOV §5.2; `OSE INV-7` |
| `mov_perturbacion_no_juicio` CHECK | `OSE P-OUT` invariante de no-juicio; test de falsación OSE #7 |
| RPC `mov_integrar` (security definer, FOR UPDATE/SHARE, guard) | `record_payment` (`20260629002_atomic_payments.sql`); `OSE` Regla de cierre |
| `has_tenant_permission(tenant_id,'mov.write')` | `202606050001_foundation.sql`; patrón `billing.payments.write` |
| RLS por tenant | `202606050001_foundation.sql`; nexus-two-plane-model |
| Reuso `audit_events.metadata` como procedencia | MOV §0.6; `OSE INV-1`; `audit_events` (foundation.sql) |
| Eslabón débil (confianza+frescura+estatus) | MOV §0.7; `OSE INV-3`; MOTOR §3.2 (c) |
| `MOV.I-1` anclaje / `MOV.I-2` no promoción / `MOV.I-5` inmutabilidad / `MOV.I-6` referente / `MOV.I-9` no-doble-instanciación | MOV §1.7 |
| Frontera de escritura OSE = A/B/E | `OSE` Sujeto; `OSE INV-6` |
| Lado observado de la brecha (recompute) | `OSE INV-9`; flujo del OSE G3 paso A4 sub-paso 2 |
| `traverseUpstream`/`Downstream` (DIAGNOSTICAR/JUZGAR) | MOTOR §3.2 tabla de gates (G5 hacia atrás, G7 hacia adelante) |
| "ningún peldaño lee un valor desnudo" | MOTOR §3.2 invariante (c) |
| apertura ontológica / `observacion inclasificable` | `OSE INV-8a`; MOV §10 |

---

## Architectural Questions (vacíos registrados, NO resueltos)

1. **AQ-GRANULARIDAD-ESQUEMA.** La cardinalidad "5 tablas por familia" NO se deriva del canon (el canon no prescribe física de almacenamiento). Es decisión de implementación elegida por evidencia (frontera A/B/E como GRANT por familia + patrón de migraciones). Si esto resulta caro en JOINs de grafo, la alternativa "tabla única `mov_entity` + `mov_provenance`" queda registrada. No resuelto.
2. **AQ-TENANT-vs-SUJETO.** El canon define el MOV como **local a UN sujeto cognitivo** y NO presupone multi-inquilino (`OSE` Independencia; MOTOR §10.4 "local al sujeto modelado, sea cual sea el despliegue"). Se adopta `tenant_id` por requisito del stack (RLS del producto), tratando **tenant ≡ sujeto-del-MOV como SUPUESTO DE IMPLEMENTACIÓN NO RESUELTO**. Si un tenant alberga >1 sujeto operacional, el modelo debe revisarse. No resuelto.
3. **AQ-FK-POLIMORFICA.** `mov_arista.origen_id/destino_id` apuntan a 1 de 5 tablas sin FK física; integridad delegada a `mov_integrar`. ¿Aceptable, o conviene una tabla-índice `mov_nodo (id, familia)` con FK reales? Decisión robustez vs simplicidad. No resuelta.
4. **AQ-VALIDACION-ATTRS.** Los atributos propios por tipo (MOV §8) ¿se validan con `pg_jsonschema`/CHECK en SQL, o con Zod en el adaptador de infraestructura? El canon no lo prescribe. (La spec deja CHECK solo para invariantes universales; sugiere Zod en infraestructura por simplicidad, pero no lo fija.) No resuelta.
5. **AQ-PERMISOS.** `mov.read`/`mov.write` y feature `mov` no existen aún en `permissions`/`role_permissions`/`tenant_features`. Requieren migración de seed (patrón `20260625001_nlabs_permissions.sql`). Sin ella, `mov_integrar` hace `MOV_FORBIDDEN` para todo usuario no `service_role`. Catálogo de permisos pendiente.
6. **AQ-TEST-INFRA.** El repo no tiene Postgres de test (vitest mockea Supabase). Las pruebas SQL/RPC (F-2, F-4, F-7, F-8, F-9, CA-2 "en SQL", CA-11, CA-9) NO son ejecutables hoy. Requieren globalSetup con Supabase local / pg-mem. Dependencia de infraestructura, no resuelta en este componente.
7. **AQ-DECAIMIENTO.** Se persiste el valor de frescura sellado; el canon (MOV §6.2 Perfil de Decaimiento) exige decaimiento por clase con vida media. ¿Quién y cuándo recomputa la frescura entre escrituras (job, lectura perezosa, materialización)? Afecta a `queryVigentes` ("sobre el piso"). No resuelta.
8. **AQ-NODO-CAUSAL.** MOV §2.2 define un "nodo causal" como **dimensión de variación** ("la carga del recurso R", no "R"), distinta de la entidad A1/A3. ¿Es una fila propia o una proyección derivada de un atributo de A? `traverse*` operan sobre `nodeId` sin esto resuelto. No resuelta (modelado de familia C).
9. **AQ-CICLOS-GRAFO.** El canon admite bucles de retroalimentación de primera clase (MOV §2.2) y exige "detectar el lazo como objeto en vez de iterar" (MOV §2.5). `traverse*` exponen `maxDepth`, pero cómo el almacenamiento detecta/representa el bucle sin delegar razonamiento al repositorio queda abierto. No resuelta.
10. **AQ-AUTORIA-BRECHA.** `OSE INV-9` dice que el OSE *recomputa el lado observado* de una brecha EXISTENTE y no la crea. El canon NO nombra qué acto CREA la entidad brecha por primera vez (¿COMPRENDER al detectar distancia, ATENDER, DIAGNOSTICAR?). `updateGapObservedSide` asume que ya existe; la creación inicial queda sin dueño. Vacío de autoría, no resuelto.
11. **AQ-BRECHA-PARTICION.** El canon (MOV §8) lista los atributos de D3 sin un "lado observado" separable. La descomposición "magnitud/tendencia observacionales (mutables por OSE) vs referente/causas (insumo)" es interpretación de ingeniería plausible, NO un concepto canónico literal. No resuelta.
12. **AQ-PROCEDENCIA-SCHEMA.** `audit_events.metadata` sirve para linaje, pero su esquema (`event_type/action/subject_type/subject_id/metadata`) no tiene campos tipados para `rootObservationIds`/`commonSourceKey`. ¿Dentro de `metadata` jsonb (reuso máximo) o columnas/tabla puente? No resuelta.
13. **AQ-BINDING-OPERACIONAL.** El canon (Constitución, Primer principio) dice que los módulos son "órganos sensoriales" que producen observaciones, pero NO especifica el mapeo entre una fila de `work_orders` y una `entidad_objeto` (A1, naturaleza=unidad_de_trabajo), ni cómo una factura se vuelve `observacion` (B1). ¿El MOV se proyecta desde las tablas operacionales (vistas/triggers) o vive como copia sellada poblada por adaptadores PERCIBIR? El binding a tablas concretas es **valor de tenant, no esquema** (MOV §9). No resuelto.
14. **AQ-IDENTIDAD-HECHO.** `OSE INV-4` dice que la identidad de un hecho de mundo se establece "por su sello, no por un mecanismo de transporte", pero no fija la clave canónica exacta (`(sourceAuthority, instante_de_mundo, contentHash)`? `commonSourceKey`?). La clave de deduplicación afecta cuándo dos entradas son el mismo hecho vs conflicto. No resuelta.
15. **AQ-CONFIANZA-ORDINAL.** El Motor (§3.2 (c), blindaje forma/contenido §9) exige que confianza sea "relación de orden de forma fija", cuantificación = contenido calibrable. La columna es `numeric(5,4)`. ¿El `min()` del eslabón débil debe operar sobre un orden parcial por tipo de incertidumbre (`ambiguedad_no_cuantificable` no comparable con `reducible`)? El escalar numérico podría violar la distinción. No resuelta a nivel de modelo de datos.
16. **AQ-PARTICION-RETENCION.** El MOV crece sin cota (cada observación sella una fila; las deprecadas no se borran por `MOV.I-5`). No hay decisión sobre particionado por tenant/tiempo ni archivado de deprecadas. Coherente con "no construir infra de escala de 6 meses"; vacío de escala registrado, no resuelto.
17. **AQ-MEMBRESIA-POBLACION.** La `cardinalidad=poblacion` (MOV §1.2 A1) tiene "reglas de identidad de conjunto (qué entra/sale)". El esquema las deja en `attrs.reglas_membresia`. ¿Una población necesita maquinaria de membresía persistente (tabla) o basta el jsonb? No resuelta.
18. **AQ-INVALIDACION-CAUSAL.** "Caducidad por revisión causal" (MOV §7.3): cuando una `relacion_causal` C1 cambia (la calibra RECONCILIAR, no el OSE), ¿el modelo propaga la re-evaluación de frescura/confianza de los derivados, o solo los marca "a revalidar"? El mecanismo de propagación de invalidación no está especificado en este componente. No resuelta.
19. **AQ-BLOQUEO-SUBGRAFO.** La Regla de cierre exige que el MOV nunca sea observable incoherente. Con RPC `security definer` se cumple por operación, pero una propagación por eslabón débil que toque N entidades en cascada (G3) podría requerir bloquear un sub-grafo (`FOR UPDATE` sobre el sub-grafo de dependencias). El alcance del bloqueo no está acotado por el canon. Debe decidirse al implementar G3. No resuelta.
20. **AQ-DISYUNTIVA-FISICA.** El canon nombra "creencia disyuntiva" y "conflicto persistente" (MOV §5.2) como sub-estructuras de soporte que "viven en sus dimensiones", pero no prescribe si son filas `mov_creencia` con `attrs` especiales, un conjunto de aristas `disyuncion`, o una vista derivada. La spec elige aristas `disyuncion`; su representación física exacta no está prescrita en el canon. Registrado.
