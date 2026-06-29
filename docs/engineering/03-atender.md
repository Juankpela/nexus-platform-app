# Componente 3 — ATENDER (Especificación de Ingeniería)

## Ficha de cierre

| Campo | Valor |
|---|---|
| **Estado** | ✅ **CERRADO** |
| **Fecha de cierre** | 2026-06-29 |
| **Falsification Gate** | **SURVIVED** |
| **Refutadores** | 5 (independientes; presupuesto = el de construir) |
| **Claims auditados** | 78 (contra C1 · C2 · ARQUITECTURA · MOTOR · CONSTITUCION · MOV · código real) |
| **Claims refutados** | 4 — **solo etiquetas de cita; 0 de lógica** |
| **APIs inventadas** | 0 |
| **Conceptos/actos nuevos** | 0 |
| **Invariantes rotos** | 0 |
| **AQ abiertas** | 17 (bloquean la *implementación*, no la spec) |
| **Ready for** | **C4 — DIAGNOSTICAR** |

> Detalle del veredicto y de las 4 correcciones de cita: ver bloque **Veredicto de Falsación (Gate, 2026-06-29)** al final del preámbulo. Panel comparativo entre componentes: `docs/engineering/ENGINEERING_STATUS.md`.

---

> **Naturaleza.** SPEC DE INGENIERÍA implementable, NO arquitectura. Convierte el acto **ATENDER** del diseño cognitivo CONGELADO en software sobre el stack real (Supabase/PostgreSQL + TypeScript + Next.js, hexagonal). **No introduce ni un concepto, acto, tipo ni invariante cognitivo nuevo.** Se apoya en **C1** (`engineering/01-mov-data-model.md`, CERRADO) y **C2/OSE** (`engineering/02-operational-state-engine.md`, CERRADO) y **no los redefine**: ATENDER **LEE** brechas (`brecha` D3, `mov_normativa`) y **CONSUME** las `perturbacion` (E2, `mov_dinamica`) que el OSE deja, vía los puertos de lectura de C1. Todo se traza al canon **por nombre** (ver §Tabla de trazabilidad). Donde el canon calla, se registra **Architectural Question** y **no se resuelve por intuición**.
>
> **Decisiones de unificación (resuelven las contradicciones internas señaladas por los refutadores; este documento es la versión gobernante única):**
> 1. **Módulo único:** `modules/atender/{domain, application/{ports,use-cases}, infrastructure}`. Los puertos de C1 viven en `modules/mov/application/ports/` (ruta verificada por C2 en disco).
> 2. **Caso de uso primario único:** `rankAttention`. Caso de uso secundario único: `arbitratePreemption`.
> 3. **Puerto de calibración único:** `SaliencePolicyPort` (solo lectura; análogo a `RelevanceThresholdPort` del OSE).
> 4. **La salience es RELACIÓN DE ORDEN, no escalar.** Su comparador es `compare(a,b) → -1 | 0 | 1 | null` (`null` = incomparable). **No hay producto escalar de factores, ni constantes de peso/umbral/techo en el dominio.** Toda cuantificación vive tras el puerto.
> 5. **El foco es PROYECCIÓN DE LECTURA EFÍMERA** (valor de retorno de `rankAttention`), NO escritura en el MOV ni tabla persistente. La persistencia de la deuda de preempción queda como AQ **no resuelta y no construida**.
> 6. **Evento de auditoría único:** `atender.focus_ranked`.
>
> **Convención de stack:** `tenantId: UUID` primer parámetro de toda firma (`UUID = string`, no branded, `types/shared.ts`). Patrón de orquestación pura idéntico a `scanTenantOverdue` (`nowMs`/`requestId` inyectados, verificado en `modules/scheduling/application/use-cases/scan-overdue-work-orders.ts`).
>
> **Disciplina de citas.** El OSE (C2) **sí numera sus secciones en disco** (`§1`–`§6`); por convención de esta spec citamos sus constructos **por nombre** (`P-IN`/`P-OUT`/`P-CLK`, `OSE INV-1…INV-9`, "Regla de cierre", tabla de frontera) en vez de por `§`, para no acoplarnos a su numeración. ARQUITECTURA/MOTOR/MOV/CONSTITUCION se citan **por número de sección verificado en disco**. Invariantes con prefijo de origen: `ATENDER.INV-N`, `OSE.INV-N`, `MOV.I-N`.
>
> **Precondición de construcción (honestidad, regla dura 6/8).** Hoy `modules/mov` (C1) y `modules/ose` (C2) **NO existen como TypeScript** (verificado en disco: `modules/` no contiene `mov`/`ose`/`atender`). Ningún `import "@/modules/mov/..."` resuelve aún. La afirmación "ejecutable hoy mockeando puertos de C1" **depende de que C1/C2 existan como código importable** → ver `AQ-ATENDER-PRECONDICION-C1C2`.
>
> **Veredicto de Falsación (Gate, 2026-06-29) — `SURVIVED`.** Cinco refutadores independientes (presupuesto = el de construir) atacaron por separado cada API, cita y claim "verificado" de esta spec contra C1, C2, ARQUITECTURA, MOTOR, CONSTITUCION, MOV y el código real. **Resultado: ningún API inventado, ningún acto/invariante fuera del canon, ningún vacío tapado.** Confirmado en disco: las firmas de C1 (`NormativeRepository`/`MovRepository`/`DynamicsRepository`/`CausalGraphRepository`, `CHECK mov_perturbacion_no_juicio`, atributos D3/E2, `MOV.I-0/I-6`); `RelevanceThresholdPort` (solo lectura) y la frontera C2 que delega salience/presupuesto a ATENDER; `AuditEvent`/`AuditRepository.append` admiten la llamada de §10.4 **sin enum que rechace** `subjectType: "mov_brecha"|"mov_perturbacion"`; el patrón `scanTenantOverdue`/`ScanDeps`; `UUID = string`; la RLS de C1 `has_tenant_permission(tenant_id,'mov.read')` (seed pendiente, ya cubierto por `AQ-ATENDER-PERMISOS` ↔ C1 `AQ-PERMISOS`); y las 14 citas CONSTITUCION/MOV (numeración decimal de MOV incluida) verbatim. **Defectos corregidos en este pase (solo etiquetas de cita, ninguno de lógica):** (a) `MOTOR §5 Q4` era cruce roto — repunteado a `ARQUITECTURA §3 acto 3` + `MOTOR §3.2 G0.5/G4`; (b) `ARQUITECTURA §6 "control sobre las brechas del Modelo"` no existe — es `§3` "control sobre **la sustancia**"; (c) la nota de disciplina de citas invertía lo que dice C2 (el OSE **sí** numera §1–§6); (d) "verificado en disco" aclarado como "firma en la spec .md, no TypeScript compilado". Las 17 Architectural Questions siguen **no resueltas** y bloquean la implementación, no esta spec.

---

## 1. Propósito

ATENDER es el **tercer acto del Motor** y la **función de control sobre la sustancia** (ARQUITECTURA §3, acto 3, literal): *"dado un Modelo rico en brechas, decidir **qué merece pensamiento ahora**, asignando un foco finito por **impacto × urgencia × tratabilidad × relevancia-de-rol**"*. Su razón de existir es la racionalidad limitada hecha operación: *"sin atención, el sistema o se ahoga (todo importa) o se fija (siempre lo mismo)… no se razona sobre todo, se razona sobre lo que más cambia el resultado"*.

En la cadena del Motor, ATENDER se sitúa **después** del Ritmo de Comprensión (PERCIBIR→COMPRENDER, materializado por el OSE/C2) y **antes** del Ritmo de Juicio: *"cuando ATENDER detecta que una brecha cruza el umbral de lo que importa → DIAGNOSTICAR → JUZGAR → ARTICULAR"* (ARQUITECTURA §4). ATENDER **no dispara la sorpresa** (eso es el OSE en su Paso E, que *"deja un candidato de foco —no actúa todavía sobre la atención—; la asignación real de foco y presupuesto la hace ATENDER en el gate G4"*, MOTOR §2.3). ATENDER **convierte ese candidato de foco y el conjunto de brechas vivas en un foco priorizado por rol** (o un orden de focos) que el ritmo de juicio recogerá después.

Ocupa **dos peldaños del Motor, y solo esos** (MOTOR §3.2):
- **G0.5 — Contención de atención:** *"De lo que está vivo, ¿qué se razona ya y qué queda en cola?"* — cuando hay **más de una brecha viva**, ordena y raciona el presupuesto cognitivo finito; lo de mayor prioridad se razona ya, el resto queda **en cola con su deuda viva (no se descarta)**. Incluye la **política de preempción** (suspender-y-marcar).
- **G4 — Atender:** *"De todo lo que cambió, ¿qué merece pensamiento ahora?"* — produce un **foco con su presupuesto cognitivo asignado proporcional al costo de error del rol** (MOTOR §8, Freno 3). Lee `brecha` (D3) y `objetivo` (D1); recorrido normativo (estado vs. objetivo).

> **Frase de propósito (una línea).** ATENDER lee las brechas vivas y las perturbaciones del OSE desde el MOV mantenido, las ORDENA por una salience de forma fija relativa al rol que puede actuar, raciona el presupuesto de foco finito entre las simultáneas y cede el foco ante un costo-de-error mayor — y entrega un **foco priorizado efímero** sin diagnosticar, sin juzgar y sin escribir sustancia.

---

## 2. Responsabilidades

Una sola responsabilidad indivisible — **decidir qué merece pensamiento ahora y para qué rol, entregando un foco priorizado** (ARQUITECTURA §3) — descompuesta en obligaciones, cada una anclada a un gate/regla canónica:

- **RA-1 — Reunir el conjunto atendible (lectura del MOV vía C1).** Leer las `brecha` (D3) abiertas (`NormativeRepository.listGaps(tenantId,{onlyOpen:true})`) y las `perturbacion` (E2) vigentes (`MovRepository.listByType(tenantId,'perturbacion',{onlyValid:true,…})`), más su contexto normativo: `objetivo` (D1) y `restriccion` (D2) vigentes (`listActiveObjectives`/`listActiveConstraints`). Cada entidad llega **con sus dos sellos** (MOV.I-0; MOTOR §3.2 invariante (c): *"el sello viaja con cada lectura; ningún peldaño lee un valor desnudo"*). ATENDER **no construye** estas entidades; las consume.
- **RA-2 — Producir la salience como RELACIÓN DE ORDEN (G4; ARQUITECTURA §3 acto 3, fórmula literal).** Para cada candidato, ordenar por **impacto × urgencia × tratabilidad × relevancia-de-rol**, extendido en contención con **valor de la información** y **frescura** (MOTOR §3.2 G0.5). El resultado es un **orden (posiblemente parcial)**, *"no una métrica numérica de una tecnología concreta"* (MOTOR §9, blindaje forma/contenido). La confianza hereda el **eslabón débil** (MOV §0.7); `confianza_no_evaluada` es **incomparable, nunca 0** (MOV §5.2).
- **RA-3 — Racionar el presupuesto de foco finito (contención, G0.5).** Con >1 brecha viva: el foco de mayor prioridad se entrega para razonarse; el resto se devuelve **encolado con su deuda viva**. La cola **no abre presupuesto nuevo** (MOTOR §3.2 G0.5; §8 Freno 3). El presupuesto por foco es proporcional al **costo de error del rol**, bajo un **techo absoluto independiente del stake** (MOTOR §8 Freno 3); su cuantificación es contenido calibrable (AQ).
- **RA-4 — Resolver preempción/interrupción (G0.5, suspender-y-marcar).** Si llega un candidato de **mayor costo-de-error** mientras un foco anterior está abierto (entre G5 y G8), decidir la **cesión del foco** preservando la deuda epistémica del razonamiento interrumpido. La conmutación exige **margen mayor que el ruido Y sostenido sobre más de una observación independiente** (MOTOR §6.4 Disparador 2). ATENDER **decide** la cesión; **no ejecuta** el razonamiento ni lo descarta (salvo caducidad de frescura). Distingue **preempción** (razonamiento ABIERTO que cede foco) de **reapertura** (tema CERRADO reabierto por hecho nuevo, gobernada por el OSE/§8 Freno 1b).
- **RA-5 — Aplicar la relatividad de rol (principio irreducible #5; CONSTITUCION §8).** Ofrecer un foco a un rol **solo si ese rol puede actuar sobre él** (CONSTITUCION §8: *"se le presenta a un rol solo si ese rol puede actuar sobre ella… mostrarle a alguien una decisión que no puede tomar es ruido"*). El factor relevancia-de-rol usa las cuatro coordenadas del rol (esfera, horizonte, meta dominante, costo de error). **Misma realidad → distinto foco por rol; NUNCA se colapsa a un índice único** (CONSTITUCION §8; MOTOR §7 conflicto inter-rol). ATENDER produce un orden **por rol**.
- **RA-6 — Respetar el blindaje forma/contenido y abstenerse de calibrar.** La **forma** (los cuatro factores como relación de orden; el umbral suficiente/insuficiente; el techo de presupuesto) es ley; ATENDER la **ejerce**, no la define ni recalibra. La **cuantificación** (pesos, umbral, presupuesto, mapeo de atributos) se lee de un puerto de solo lectura; **calibrarla es trabajo de RECONCILIAR** vía los priores de atención (MOTOR §10.4 punto 3). ATENDER nunca escribe esos priores.

**Estado de control propio.** El foco es **valor de retorno efímero**. ATENDER no inventa estado en el MOV ni tabla nueva. La persistencia de la **deuda viva de un razonamiento preemptado entre invocaciones** (lo único que el canon exige que *sobreviva y sea retomable*, MOTOR §3.2 G0.5) **no tiene hogar canónico** y **no se construye aquí** → `AQ-ATENDER-HOGAR-FOCO` (bloqueante para persistir la cola/preempción; no bloqueante para el ranking efímero).

---

## 3. Límites — la frontera dura (qué ATENDER NO hace)

ATENDER es **control sobre la sustancia, no consulta causal ni deliberativa**. Produce un foco priorizado y se detiene. La frontera se traduce a prohibiciones de código verificables:

| Excluido de ATENDER | Acto dueño (ARQUITECTURA §3) | Materialización del límite en el stack |
|---|---|---|
| Determinar el **porqué**; clasificar síntoma/causa/restricción; recorrer el grafo causal hacia atrás | **DIAGNOSTICAR** (G5) | `AtenderDeps` **nunca inyecta** `CausalGraphRepository`; ATENDER nunca llama `traverseUpstream`/`traverseDownstream`. |
| Generar `intervencion`es; proyectar; elegir/abstenerse/escalar | **JUZGAR** (G7/G8) | ATENDER **nunca** escribe `intervencion` (E3), `compromiso` (A2) ni `episodio` (E1); su tope es un orden de focos. |
| Proyectar la decisión a un rol en su lenguaje | **ARTICULAR** (G9) | ATENDER usa la relatividad de rol solo para **ordenar y filtrar**; **no produce texto** ni pantalla. |
| Medir sorpresa; integrar; emitir `perturbacion` | **COMPRENDER / OSE (C2)** | ATENDER **consume** las `perturbacion` ya emitidas; nunca llama `perceiveSignal`/`sweepExpirations`/`writePerturbation`. |
| **Calibrar** pesos/umbral/priores de atención | **RECONCILIAR** (MOTOR §10.4) | El umbral y los pesos se leen de un puerto **de solo lectura**; ATENDER nunca los escribe. |
| Crear/modificar la entidad `brecha`; recomputar su lado observado | **C1 / OSE** | ATENDER solo **lee** `listGaps`; `updateGapObservedSide` (OSE.INV-9) NO está en `AtenderDeps`. |
| Persistir el modelo de datos del MOV | **C1** | ATENDER lo **consume** vía puertos de lectura; no define tablas, enums ni RPC. |

### 3.1 El límite más fino: ATENDER NO escribe sustancia

La regla canónica: *"ATENDER… NO escribe sustancia del MOV salvo —si el canon lo permite— marcar prioridad/foco"*. El canon **no nombra dónde vive el 'foco'/'prioridad' como dato persistible**:
- La `perturbacion` (E2) es **explícitamente sin juicio**: *"NO porta causa/opción/prioridad/score/urgencia/ranking"*, exigible por el `CHECK mov_perturbacion_no_juicio` de C1 (POST-OUT-2; OSE.INV-6). Por tanto ATENDER **no puede escribir su prioridad de vuelta en la `perturbacion`**.
- El atributo **`urgencia`** de la `brecha` (D3, MOV §8) es **insumo normativo derivado de la holgura**, no el ranking de salience; y el OSE solo recomputa el *lado observado* (`updateGapObservedSide`, OSE.INV-9), no la prioridad.
- Los **priores de atención** (MOTOR §10.4 punto 3) los **escribe RECONCILIAR**, no ATENDER.

**Conclusión de ingeniería (declarada, gobernante).** El foco producido por ATENDER es **proyección de lectura efímera** (valor de retorno), **no** escritura en el MOV ni tabla `attention_*`. Si la operación demostrara que la deuda de preempción debe sobrevivir entre invocaciones, requeriría un hogar que el canon hoy no define → `AQ-ATENDER-HOGAR-FOCO` (no resuelto, no construido).

> **Criterio de fallo del componente.** Si ATENDER determinara el porqué (DIAGNOSTICAR), generara opciones (JUZGAR), redactara para el rol (ARTICULAR), recalibrara pesos/umbral (RECONCILIAR), escribiera prioridad en la sustancia, o colapsara las saliences multi-rol a un índice único, dejaría de ser control de atención.

---

## 4. Interfaces públicas (casos de uso hexagonales)

ATENDER expone casos de uso de **orquestación pura** en `modules/atender/application/use-cases`, que **consumen** los puertos de C1 más un puerto de solo lectura para la cuantificación calibrable. **No existe puerto de escritura de ATENDER**: su salida es un valor de retorno (§3.1).

### 4.1 Tipos de dominio (`modules/atender/domain`)

```typescript
// modules/atender/domain/focus.ts — el FOCO es proyección de lectura, NO entidad del MOV (§3.1).
import type { EntidadMov } from "@/modules/mov/domain/entidad-mov"
import type { UUID } from "@/types/shared"

/** Identidad de rol: VALOR de tenant, no esquema (CONSTITUCION §8 "hechos de la organización humana").
 *  El catálogo concreto y el predicado de accionabilidad NO los fija el canon → AQ-ATENDER-ACCIONABILIDAD-ROL. */
export type RolKey = string

/** Origen del candidato de foco: una brecha viva (D3) o una perturbación del OSE (E2). */
export type FocusOrigin =
  | { readonly kind: "brecha"; readonly entity: EntidadMov }        // mov_normativa, tipo='brecha'
  | { readonly kind: "perturbacion"; readonly entity: EntidadMov }  // mov_dinamica, tipo='perturbacion' (P-OUT del OSE)

/** Señal ordinal pura: NO se compromete con un escalar como verdad (MOTOR §9: "comparación, no métrica
 *  numérica"). evaluada=false ⇔ INCOMPARABLE (confianza_no_evaluada, MOV §5.2), nunca rank 0. */
export type OrdinalSignal = { readonly rank: number; readonly evaluada: boolean }

/**
 * Salience como RELACIÓN DE ORDEN de forma fija (ARQUITECTURA §3; MOTOR §3.2 G0.5).
 * Los cuatro factores son la FORMA (ley) + las dos extensiones de G0.5 (valorInformacion, frescura).
 * NO hay 'value' escalar: el orden lo produce SaliencePolicyPort.compare. La cuantificación → AQ-ATENDER-CALIBRACION.
 */
export type Salience = {
  readonly impacto: OrdinalSignal           // proximidad a objetivos/restricciones — MOTOR Paso E, G4
  readonly urgencia: OrdinalSignal          // holgura del compromiso / ventana de decisión — MOV §1.5 D3, §7.2
  readonly tratabilidad: OrdinalSignal      // carácter corregible/gestionable + restricción ya modelada — MOV §1.5 D3, §5
  readonly relevanciaDeRol: OrdinalSignal   // ¿este rol puede ACTUAR? — CONSTITUCION §8, principio #5
  readonly valorInformacion: OrdinalSignal | null  // FRENTE ABIERTO (MOV §10 Clase 3) → AQ-ATENDER-VALOR-INFORMACION
  readonly frescura: OrdinalSignal          // sello temporal del candidato (MOV §6.2)
  /** Confianza topada por eslabón débil (MOV §0.7). null = confianzaNoEvaluada (incomparable, MOV §5.2). */
  readonly confianza: number | null
}

/** Presupuesto como FORMA: nivel proporcional al costo de error del rol + techo absoluto (MOTOR §8 Freno 3).
 *  La MAGNITUD concreta y el techo numérico son contenido calibrable → AQ-ATENDER-CALIBRACION. */
export type PresupuestoForma = { readonly nivel: "somero" | "profundo"; readonly bajoTechoAbsoluto: true }

export type FocusState = "active" | "queued" | "suspended_marked" // razona ya | cola con deuda viva | suspender-y-marcar

/** Un foco entregado al ritmo de juicio. NO porta causa ni opción (no-juicio). */
export type Focus = {
  readonly origin: FocusOrigin
  readonly rol: RolKey                  // a quién se ofrece (relatividad de rol, principio #5)
  readonly salience: Salience
  readonly presupuesto: PresupuestoForma
  readonly state: FocusState
  readonly procedencia: readonly UUID[] // brecha(s)/perturbación(es) y objetivo(s) que fundaron la salience (trazable)
  /** Deuda epistémica viva conservada al suspender por preempción. Referencia opaca; su PERSISTENCIA → AQ-ATENDER-HOGAR-FOCO. */
  readonly liveDebtRef: UUID | null
}

/** Salida de rankAttention: lo activo + la cola + los empates DECLARADOS (nunca colapso silencioso, MOV §3.4). */
export type AttentionRanking = {
  readonly active: readonly Focus[]    // se razonan ya (presupuesto asignado)
  readonly queued: readonly Focus[]    // cola con su deuda viva — la brecha sigue existiendo en el MOV
  readonly empatesDeclarados: readonly (readonly [UUID, UUID])[] // pares incomparables o de igual orden, expuestos
  readonly requestId: UUID
}
```

### 4.2 Puerto único de cuantificación calibrable (`modules/atender/application/ports`)

```typescript
// modules/atender/application/ports/salience-policy-port.ts
import type { Salience, FocusOrigin, RolKey } from "@/modules/atender/domain/focus"
import type { UUID } from "@/types/shared"

/** Contexto de rol: las cuatro coordenadas (CONSTITUCION §8). VALOR de tenant. Quién lo provee → AQ-ATENDER-CONTEXTO-ROL. */
export type RoleContext = {
  readonly rol: RolKey
  readonly esferaDeAccion: readonly string[] // qué puede cambiar → filtra relevanciaDeRol
  readonly horizonte: string
  readonly costoDeError: string              // 4ª coordenada — base del presupuesto (NO la salience), Freno 3
}

/**
 * ÚNICO puerto de cuantificación. La FORMA (4 factores + relación de orden + techo) es ley del canon;
 * la CUANTIFICACIÓN (pesos, umbral, mapeo de atributos, magnitud de presupuesto, techo, margen de preempción)
 * es CONTENIDO calibrable por RECONCILIAR (MOTOR §9 blindaje; §10.4 priores de atención).
 * ATENDER lo LEE; NUNCA lo escribe. Análogo a RelevanceThresholdPort del OSE (solo lectura).
 * Origen/seed/tabla NO los fija el canon → AQ-ATENDER-CALIBRACION. Si falta política, ATENDER se ABSTIENE (F-AT-6).
 */
export interface SaliencePolicyPort {
  /** Compone la salience (relación de orden, no escalar) de un candidato para un rol, aplicando pesos/priores. */
  scoreSalience(tenantId: UUID, origin: FocusOrigin, role: RoleContext): Promise<Salience>
  /** Relación de ORDEN: -1 (a<b) | 0 (empate-declarado) | 1 (a>b) | null (INCOMPARABLE: factor no conmensurable
   *  o confianza_no_evaluada). NUNCA fabrica orden entre incertidumbres no conmensurables (MOV §5.2). */
  compare(tenantId: UUID, a: Salience, b: Salience): Promise<-1 | 0 | 1 | null>
  /** ¿Este candidato MERECE foco ahora para este rol? (G4 freno: comprender no obliga a actuar). */
  crossesAttentionThreshold(tenantId: UUID, s: Salience, role: RoleContext): Promise<boolean>
  /** Forma del presupuesto del foco, proporcional al costoDeError del rol, bajo techo absoluto (Freno 3). */
  budgetFor(tenantId: UUID, s: Salience, role: RoleContext): Promise<import("@/modules/atender/domain/focus").PresupuestoForma>
  /** ¿La cola admite un foco más sin exceder el presupuesto de foco finito del barrido? (contención, G0.5). */
  focusBudgetAdmits(tenantId: UUID, s: Salience, alreadyActive: readonly Salience[]): Promise<boolean>
  /** Margen mínimo (anti-bandazo) para que un retador PREEMPTE a un foco en vuelo (MOTOR §6.4 D2). */
  preemptionAdmits(tenantId: UUID, challenger: Salience, incumbent: Salience): Promise<boolean>
}
```

### 4.3 Dependencias inyectadas (`AtenderDeps`) — puertos de C1 que ATENDER CONSUME

```typescript
// modules/atender/application/use-cases/deps.ts
import type {
  NormativeRepository, // C1: listGaps, listActiveObjectives, listActiveConstraints (LECTURA; updateGapObservedSide NO se usa)
  MovRepository,       // C1: getById, listByType, listByAnchor (LECTURA; integrar/deprecate NO se usan)
  DynamicsRepository,  // C1: listEpisodesBySignature (memoria E para valor-de-información; writePerturbation/writeEpisode NO se usan)
} from "@/modules/mov/application/ports"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SaliencePolicyPort } from "@/modules/atender/application/ports/salience-policy-port"
import type { RoleContext } from "@/modules/atender/application/ports/salience-policy-port"
import type { UUID } from "@/types/shared"

/**
 * SOLO LECTURA del MOV (C1) + cuantificación calibrada (solo lectura) + auditoría + reloj/correlación.
 * Pick<…> EXCLUYE por construcción toda escritura: NO integrar, NO updateGapObservedSide, NO writePerturbation/writeEpisode.
 * NO incluye CausalGraphRepository (no diagnostica, §3). Estructuralmente, ATENDER no puede escribir el MOV ni recorrer causalidad.
 */
export type AtenderDeps = {
  readonly normative: Pick<NormativeRepository, "listGaps" | "listActiveObjectives" | "listActiveConstraints">
  readonly mov: Pick<MovRepository, "getById" | "listByType" | "listByAnchor">
  readonly dynamics: Pick<DynamicsRepository, "listEpisodesBySignature"> // solo memoria E (degradación de valor-de-info, MOTOR §5)
  readonly policy: SaliencePolicyPort
  readonly audit: AuditRepository
  /** Contexto de los roles para los que se atiende (CONSTITUCION §8). Quién lo provee → AQ-ATENDER-CONTEXTO-ROL. */
  readonly roles: readonly RoleContext[]
  readonly knowledgeNowMs: number  // instante de CONOCIMIENTO de la corrida (determinismo), igual que ScanDeps.nowMs
  readonly requestId: UUID
}
```

> **Lectura de `perturbacion` (E2) — contrato único elegido.** C1 `DynamicsRepository` define `writePerturbation`/`writeEpisode`/`listEpisodesBySignature`, pero **NO** un método de lectura de perturbaciones por estado "sin atender". La `perturbacion` se persiste como fila `mov_dinamica (tipo='perturbacion')`; ATENDER la lee **vía `MovRepository.listByType(tenantId,'perturbacion',{onlyValid:true,…})`** — método REAL de C1, **camino canónico único**. No se introduce `PerturbationReadPort`. Sin un cursor de atención no se distingue "ya atendida" de "pendiente"; el foco se **recomputa idempotentemente** cada barrido. Añadir un cursor tocaría C1 (CERRADO) → `AQ-ATENDER-LECTURA-PERTURBACION` (no resuelta).

---

## 5. Contratos de entrada

### 5.1 Firma de `rankAttention`

```typescript
// modules/atender/application/use-cases/rank-attention.ts
export async function rankAttention(
  deps: AtenderDeps,
  input: { tenantId: UUID; rol?: RolKey },
): Promise<AttentionRanking>
```

`rol` opcional: si se da, ordena/filtra **POR ESE ROL** (un foco se ofrece a un rol solo si puede actuar sobre él). Si se omite, produce el orden **multi-rol** (una proyección por cada rol al que el foco es ofrecible) — **NO un índice colapsado** (CONSTITUCION §8: *"un solo hecho… cinco proyecciones según esfera y horizonte"*).

### 5.2 Precondiciones (garantiza el llamante)

- **PRE-1 — Candidatos vigentes y sellados.** Cada candidato (brecha D3 vía `listGaps({onlyOpen:true})`; perturbación E2 vía `listByType('perturbacion',{onlyValid:true})`) llega del MOV con **ambos sellos** (MOV.I-0) y vigente. *El ranking se computa sobre datos vigentes y sellados* (MOTOR §3.2 invariante (c)).
- **PRE-2 — Referente normativo presente.** Toda `brecha` candidata referencia su `objetivo` (referente, MOV.I-6). Sin referente no hay impacto computable: ATENDER **se abstiene de rankearla** (la deja fuera del orden y audita), nunca la prioriza por defecto.
- **PRE-3 — Contexto de rol explícito.** `deps.roles` no vacío; cada `RoleContext` declara `esferaDeAccion` y `costoDeError` (CONSTITUCION §8). Sin rol no hay a quién ofrecer foco.
- **PRE-4 — Solo lectura (estructural).** `AtenderDeps` no expone ninguna escritura de sustancia: el tipo `Pick<…>` no permite `integrar`/`updateGapObservedSide`/`writePerturbation`.
- **PRE-5 — Perturbación sin juicio.** Los candidatos E2 llegan **sin** `prioridad/score/urgencia/ranking` (garantía del OSE, `CHECK mov_perturbacion_no_juicio` de C1). ATENDER **computa** la salience; no la lee de la perturbación.
- **PRE-6 — Existe brecha viva (condición aguas arriba).** ATENDER **lee** brechas; **no las crea**. El canon no nombra qué acto crea la `brecha` por primera vez → `AQ-ATENDER-AUTORIA-BRECHA` (hereda C1 AQ-AUTORIA-BRECHA / OSE AQ-OSE-AUTORIA-BRECHA, **operativamente bloqueante**: si nadie crea la brecha, el conjunto atendible se reduce a perturbaciones).

### 5.3 Origen del disparo (combustible)

ATENDER **duerme por defecto** (Freno 1, event-driven). Corre por: (a) una `perturbacion` que el OSE dejó (candidato de foco, MOTOR §2.3 Paso E), o (b) una **pregunta de rol** que entra por G0 y se posa directamente en G4 (MOTOR §3.1). **Qué del stack invoca `rankAttention` y con qué cadencia** (consumidor de la traza `ose.perturbacion`, barrido, o petición de rol) **NO lo fija el canon**; auto-programarse violaría "el Motor no se enciende a sí mismo" (Freno 1) → `AQ-ATENDER-DISPARO` (hereda C2 AQ-OSE-RELOJ-MUNDO).

### 5.4 Errores

| Error | Causa | Disposición |
|---|---|---|
| `ATENDER_GAP_WITHOUT_REFERENT` | brecha candidata sin referente (viola PRE-2) | se excluye del orden + audita; no se prioriza por defecto |
| `ATENDER_NO_POLICY` | `SaliencePolicyPort` no provee pesos/umbral | **se abstiene** (no usa default hardcodeado) — F-AT-6 |
| `ATENDER_EMPTY_ROLE_CONTEXT` | `deps.roles` vacío (viola PRE-3) | rechazo: sin rol no hay foco |
| `ATENDER_FORBIDDEN` | sin `has_tenant_permission(tenant,'mov.read')` | rechazo (RLS de C1, errcode 42501) |

---

## 6. Contratos de salida

La salida máxima de ATENDER es `AttentionRanking`: un **orden de focos** que DIAGNOSTICAR (G5) recogerá *después*. No es un compromiso, no espera respuesta, no se proyecta al rol (eso es ARTICULAR).

- **POST-1 — Orden, no número, jamás juicio.** Devuelve `{ active, queued, empatesDeclarados }`; ninguna entrada se descarta (G0.5: la cola conserva su deuda viva). **Nunca** contiene causa, diagnóstico, opción, intervención ni recomendación (ARQUITECTURA §3; MOTOR §2.3 *"no nombra causa, no propone opción, no clasifica… síntoma/causa/restricción"*).
- **POST-2 — Forma fija, base trazable.** Cada `Focus.salience` porta los cuatro factores (+extensiones G0.5) como relación de orden; `Focus.procedencia` lista las entidades D/E que la fundaron. La salida es **trazable** hasta los datos sellados del MOV.
- **POST-3 — Relatividad de rol, sin colapso.** Un `Focus` aparece para un `rol` **solo si ese rol puede actuar sobre él**. El mismo candidato puede estar `active` para un rol y ausente para otro. Las saliences multi-rol **NO se colapsan a un índice único** (CONSTITUCION §8; MOTOR §7).
- **POST-4 — Contención (presupuesto finito).** `active` ⊆ candidatos con `crossesAttentionThreshold` true, acotado por `focusBudgetAdmits`; el resto va a `queued` **con su deuda viva**. Por cada recurso de pensamiento los focos están **estrictamente ordenados**; un par incomparable o de igual orden se expone en `empatesDeclarados`, **nunca se asignan dos en silencio**. *(Qué es operativamente un "recurso de pensamiento" —hilo/episodio/concurrencia plena— el canon lo declara frente abierto, MOTOR §11/§12.3 → `AQ-ATENDER-RECURSO-PENSAMIENTO`.)*
- **POST-5 — Eslabón débil.** `Focus.salience.confianza` **no excede** el sello más débil entre la perturbación/brecha y el objetivo que la fundaron (MOV §0.7). ATENDER **no sella creencias nuevas**.
- **POST-6 — Presupuesto proporcional al costo-de-error, bajo techo absoluto.** `Focus.presupuesto.nivel` proporcional al `costoDeError` del rol (Freno 3); `bajoTechoAbsoluto` siempre `true`. La **magnitud** y el **techo** concretos son contenido calibrable → `AQ-ATENDER-CALIBRACION`.
- **POST-7 — Traza (procedencia, no juicio).** `audit.append({ eventType:"atender.focus_ranked", actorType:"system", actorId:null, tenantId, subjectType:"mov_brecha"|"mov_perturbacion", subjectId, action:"atender.focus_ranked", requestId: deps.requestId, source:"atender-engine", metadata:{ rol, state } })` — **sin** salience/score/ranking en metadata (no-juicio durable). Firma real de `AuditEvent`, verificada en disco.

### 6.1 Contrato de `arbitratePreemption` (G0.5, suspender-y-marcar)

```typescript
// modules/atender/application/use-cases/arbitrate-preemption.ts
export type PreemptionDecision =
  | { readonly outcome: "keep_current" }                       // el retador NO supera el costo-de-error del foco en vuelo
  | { readonly outcome: "preempt"; readonly suspended: Focus }  // suspender-y-marcar el actual; conserva su deuda viva

export async function arbitratePreemption(
  deps: AtenderDeps,
  input: { tenantId: UUID; rol: RolKey; current: Focus; incoming: FocusOrigin },
): Promise<PreemptionDecision>
```

- **Precondición:** existe un razonamiento `current` en vuelo (entre G5 y G8) y un `incoming` con sello vigente.
- **Postcondición:** si `policy.preemptionAdmits(challenger, incumbent)` es true (margen mayor que el ruido), devuelve `preempt` con la **deuda epistémica viva preservada** (`liveDebtRef`); *lo que cede es el foco, no el progreso sellado*. En caso contrario `keep_current`. **Preempción ≠ reapertura** (MOTOR §3.2). ATENDER **no borra** la deuda (solo la caducidad de frescura lo haría). La **condición de sostenimiento sobre >1 observación independiente** (MOTOR §6.4 D2) la materializa `preemptionAdmits`; si no es computable con los puertos reales de C1 → `AQ-ATENDER-PREEMPCION-SOSTENIMIENTO`. La **persistencia** de la deuda entre invocaciones → `AQ-ATENDER-HOGAR-FOCO`.

---

## 7. Invariantes (cada uno → guard de aplicación; ninguno redefine C1/C2)

| Invariante (origen) | Enunciado verificable | Guard | Centinela |
|---|---|---|---|
| **ATENDER.INV-1 — Forma fija** (ARQUITECTURA §3; MOTOR §3.2) | La salida ordena por impacto × urgencia × tratabilidad × relevancia-de-rol (+valor-info/frescura); ningún otro factor | `compare`/`scoreSalience` solo operan sobre `Salience` | F-AT-1 |
| **ATENDER.INV-2 — Sin cuantificación en el dominio** (MOTOR §9; regla dura 8) | El dominio NO contiene constantes de peso/umbral/techo/margen; toda comparación pasa por `SaliencePolicyPort` | grep al dominio: cero números mágicos | `AQ-ATENDER-CALIBRACION` |
| **ATENDER.INV-3 — Salience es orden, no escalar** (MOTOR §9) | `compare → -1\|0\|1\|null`; `null` cuando un factor es no conmensurable o `confianza_no_evaluada` | el dominio no expone `value:number` | F-AT-3, F-AT-7 |
| **ATENDER.INV-4 — Relatividad de rol, sin colapso** (CONSTITUCION §8; MOTOR §7) | Foco se ofrece a un rol solo si puede actuar; saliences multi-rol NO se aplanan a un índice | orden por rol; sin `Math.max` global | F-AT-4 |
| **ATENDER.INV-5 — Contención: orden, no doble asignación** (MOTOR §3.2 G0.5; §8 Freno 3) | `active` ordenado y acotado por presupuesto; excedente → `queued`; empate → `empatesDeclarados` | `focusBudgetAdmits`; nunca doble silencioso | F-AT-5 |
| **ATENDER.INV-6 — No-juicio** (ARQUITECTURA §3; MOTOR §2.3) | La salida es orden de focos, jamás causa/opción/recomendación; traza sin score | `AttentionRanking`/`Focus` sin campos de causa/opción | F-AT-2 |
| **ATENDER.INV-7 — Eslabón débil** (MOV §0.7, §5.2) | `confianza` ≤ premisa más débil; `evaluada=false` ⇒ incomparable, no 0 | `scoreSalience` topa por `min`; `compare→null` | F-AT-8 |
| **ATENDER.INV-8 — No escribe MOV ni modifica OSE** (reglas duras 2,4) | Cero escrituras de sustancia; no toca `integrar`/`updateGapObservedSide`/`writePerturbation`/`writeEpisode` | `AtenderDeps` solo expone lecturas + auditoría | F-AT-9 |
| **ATENDER.INV-9 — No recorre causalidad** (frontera con G5) | El orden no usa `traverseUpstream`; `tratabilidad` se lee del carácter de la brecha + restricciones ya modeladas | `AtenderDeps` no inyecta `CausalGraphRepository` | F-AT-1(causal) |
| **ATENDER.INV-10 — Preempción = suspender-y-marcar, no reapertura** (MOTOR §3.2 G0.5) | Mayor costo-de-error suspende y preserva la deuda; nunca reabre tema cerrado ni descarta progreso | `arbitratePreemption` devuelve `suspended` intacto | F-AT-10 |
| **ATENDER.INV-11 — Presupuesto del costo-de-error, no de la salience** (MOTOR §8 Freno 3) | `presupuesto` deriva de `costoDeError` del rol, bajo techo absoluto; no se iguala a la salience | `budgetFor(s, role)` recibe el rol | F-AT-11 |

---

## 8. Modelo de datos (delta sobre C1)

### 8.0 ¿El foco se PERSISTE o se computa on-read?

El canon describe el foco como producto de ATENDER pero **NO fija dónde vive**. El ranking es función de orden de forma fija; **materializarlo como columna de prioridad violaría el no-juicio** (`CHECK mov_perturbacion_no_juicio`, OSE.INV-6). Por tanto:

> **Decisión gobernante (v1).** El ranking y el foco se **computan on-read**: son el **valor de retorno** de `rankAttention`. **No se crea ninguna tabla `attention_*`, ni enum, ni RLS, ni CHECK, ni FK polimórfica.** ATENDER **no añade delta de esquema a C1**.

Lo único que el canon exige que *sobreviva y sea retomable* entre disparos es la **deuda viva de un razonamiento preemptado** (MOTOR §3.2 G0.5). Esa deuda la producen DIAGNOSTICAR/JUZGAR (componentes posteriores, aún no especificados) y su contrato de entrega/recogida cruza una frontera no definida. **No se construye un hogar para ella aquí** → `AQ-ATENDER-HOGAR-FOCO` (no resuelto, no construido) y `AQ-ATENDER-PREEMPCION-PROTOCOLO`. Si la operación demostrara que la cola/preempción debe persistir entre corridas, su modelo de datos queda sin dueño canónico hasta que esos componentes existan.

### 8.1 Qué LEE de C1/C2 (firmas verificadas en la spec en disco; aún no en TypeScript compilado — ver `AQ-ATENDER-PRECONDICION-C1C2`) — y qué NO redefine

| Necesidad de ATENDER | Pieza de C1/C2 (reuso, NO redefinición) | Cita |
|---|---|---|
| Reunir perturbaciones vigentes (E2) | `MovRepository.listByType(tenantId,'perturbacion',{onlyValid:true,page,pageSize})` | C1 `mov-repository.ts` |
| Reunir brechas vivas (D3) | `NormativeRepository.listGaps(tenantId,{onlyOpen:true})` | C1 `normative-repository.ts` |
| Referente normativo (impacto) | `NormativeRepository.listActiveObjectives(tenantId)` | C1; ARQUITECTURA §2.3 |
| Restricciones (tratabilidad sin diagnosticar) | `NormativeRepository.listActiveConstraints(tenantId)` | C1; MOV §1.5 D2 |
| Carácter corregible/gestionable de la brecha (tratabilidad) | atributo `caracter` leído vía `listGaps` | MOV §1.5 D3, §8 |
| Localizar entidades A afectadas (sin causalidad) | `MovRepository.getById` / `listByAnchor` | C1; C2 `P-OUT` |
| Memoria E (degradación de valor-de-información) | `DynamicsRepository.listEpisodesBySignature` | C1; MOTOR §5 |
| Traza/procedencia de cada decisión de foco | `AuditRepository.append` | `audit-repository.ts` (verificado) |
| Reloj/correlación (determinismo) | `knowledgeNowMs` + `requestId` inyectados | patrón `ScanDeps` |
| Cuantificación como orden (forma fija) | `SaliencePolicyPort` (solo lectura, análogo a `RelevanceThresholdPort`) | C2 `relevance-threshold-port.ts`; MOTOR §9 |

**No se redefine:** catálogo de 17 tipos, 5 tablas de familia, sellos, `mov_arista`, enums, RLS de C1; ni los tres puertos del OSE. ATENDER **lee** del MOV y **consume** la `perturbacion`; **nunca escribe A/B/C/D/E**.

### 8.2 Cardinalidad perturbación → foco (frente abierto, impacto en código)

El OSE emite, por disparo supra-umbral, **exactamente una** `perturbacion` con muchas `afectadas[]` (POST-OUT-7; OSE AQ-OSE-CARDINALIDAD-PERTURBACION). DIAGNOSTICAR (G5) opera sobre **una** brecha. ¿ATENDER produce 1 foco por perturbación, 1 por entidad afectada, o 1 por brecha referida? El mapeo de una perturbación con N `afectadas` (que se leerían vía aristas `afecta` de `mov_arista`) a focos **no está alineado por el canon** → `AQ-ATENDER-CARDINALIDAD-FOCO` (**operativamente bloqueante para el flujo**). El pseudocódigo (§10) trata cada candidato como **un** origen de foco y marca explícitamente este residual; no finge resolverlo.

---

## 9. Flujo interno (G0.5 + G4)

ATENDER es un caso de uso de orquestación pura sobre los puertos de C1, idéntico en forma a `scanTenantOverdue`. No tiene impulsor interno (Freno 1).

```
   PERTURBACION (E2) del OSE              PREGUNTA DE ROL (G0 → G4 directo)
   o BARRIDO de brechas vivas (D3)                 │
            └──────────────────────┬────────────────┘
                                   ▼
  [1] REUNIR CANDIDATOS  perturbaciones vigentes (listByType) ∪ brechas vivas (listGaps)
                                   ▼
  [2] PUNTUAR  policy.scoreSalience(origin, role)  — relación de orden de FORMA fija
        impacto ← proximidad a objetivos D1 (referente)         (ARQUITECTURA §2.3; MOV §4)
        urgencia ← holgura de la brecha + ventana que se cierra (MOV §1.5 D3, §7.2)
        tratabilidad ← carácter corregible/gestionable + restricciones D2 YA MODELADAS (MOV §1.5, §5) — SIN recorrer causalidad
        confianza ← topada por eslabón débil (MOV §0.7); no-evaluada ⇒ INCOMPARABLE
                                   ▼
  [3] FILTRAR POR RELATIVIDAD DE ROL  (CONSTITUCION §8; principio #5)
        un foco se ofrece a un rol SOLO si su esfera de acción puede actuar sobre el target;
        salience por rol — NUNCA colapsada a un índice único.
                                   ▼
  [4] CONTENCIÓN  (G0.5)  — repartir el presupuesto FINITO
        ordenar por policy.compare (orden, posiblemente parcial; incomparables → empatesDeclarados);
        admitir mientras policy.focusBudgetAdmits; el resto a la COLA con su deuda viva (NO se descarta).
                                   ▼
  [5] PREEMPCIÓN  (G0.5 suspender-y-marcar, anti-bandazo §6.4 D2)
        por cada foco ABIERTO en vuelo: arbitratePreemption() — si policy.preemptionAdmits ⇒ suspender-y-marcar
        (conserva deuda viva) y el retador toma el relevo; si no ⇒ el incumbent conserva el foco, el retador a la cola.
                                   ▼
  [6] DEVOLVER  AttentionRanking { active, queued, empatesDeclarados }  +  audit.append('atender.focus_ranked')
        SIN causa, SIN opción, SIN prioridad materializada. El FOCO es VALOR DE RETORNO (no escritura).
                                   └──► DIAGNOSTICAR→JUZGAR (FUERA de ATENDER) recogen el foco
```

**Invariantes del flujo:** la salida es valor de retorno, NO escritura en `mov_*`; ATENDER nunca llama `integrar`/`updateGapObservedSide`/`writePerturbation`/`traverseUpstream`; Σ presupuesto admitido ≤ presupuesto finito (Freno 3); la cola **no descarta** (la brecha sigue viva, se reevalúa el próximo barrido); preemptar conserva la deuda (solo la caducidad de frescura la descarta).

---

## 10. Pseudocódigo

### 10.1 `compareForRole` — la salience como relación de ORDEN (función pura, NO escalar)

```typescript
// modules/atender/domain/compare-for-role.ts
import type { Salience } from "./focus"

/**
 * FORMA FIJA (ARQUITECTURA §3; MOTOR §3.2): impacto × urgencia × tratabilidad × relevancia-de-rol (+ valorInfo, frescura).
 * Es RELACIÓN DE ORDEN, no producto escalar (MOTOR §9: "comparación, no métrica numérica"). La cuantificación vive
 * TRAS el puerto (policy.compare); este wrapper de dominio NO inventa pesos/umbral/techo (ATENDER.INV-2/INV-3).
 * Devuelve null = INCOMPARABLE: algún factor con confianza_no_evaluada o incertidumbre no conmensurable (MOV §5.2).
 * NUNCA fuerza un orden total entre incomparables (corrige el "Math.max" y el producto escalar refutados).
 */
export type Order = -1 | 0 | 1 | null
// La composición real (qué factor domina, con qué pesos) la realiza SaliencePolicyPort.compare; el dominio solo
// declara la FIRMA del orden y la regla de incomparabilidad — no calcula números.
export function incomparable(a: Salience, b: Salience): boolean {
  const factors = [a.impacto, a.urgencia, a.tratabilidad, a.relevanciaDeRol]
  const bf = [b.impacto, b.urgencia, b.tratabilidad, b.relevanciaDeRol]
  return a.confianza === null || b.confianza === null
      || factors.some(f => !f.evaluada) || bf.some(f => !f.evaluada)
}
```

### 10.2 `allocateContention` — repartir el presupuesto finito (G0.5)

```typescript
// modules/atender/domain/allocate-contention.ts
import type { Focus } from "./focus"

/**
 * MOTOR G0.5: "lo de mayor prioridad se razona ya; el resto queda en cola, con su deuda viva".
 * Reparte un presupuesto de foco FINITO por orden de salience. El orden y la admisión vienen del puerto
 * (cmp = policy.compare; admits = policy.focusBudgetAdmits): el dominio NO tiene techo ni pesos (ATENDER.INV-2).
 * La cola NO abre presupuesto nuevo; los incomparables se EXPONEN, no se fuerzan.
 */
export async function allocateContention(
  candidates: readonly Focus[],
  cmp: (a: Focus, b: Focus) => Promise<Order>,
  admits: (s: Focus["salience"], active: readonly Focus["salience"][]) => Promise<boolean>,
): Promise<{ active: Focus[]; queued: Focus[]; empatesDeclarados: [string, string][] }> {
  const empates: [string, string][] = []
  // Orden estable; pares con cmp===null o 0 se registran como empate declarado (MOV §3.4: nunca colapso silencioso).
  const ordered = await stableSort(candidates, cmp, empates)
  const active: Focus[] = []; const queued: Focus[] = []
  for (const f of ordered) {
    if (await admits(f.salience, active.map(a => a.salience))) active.push({ ...f, state: "active" })
    else queued.push({ ...f, state: "queued" }) // deuda viva: la brecha sigue en el MOV
  }
  return { active, queued, empatesDeclarados: empates }
}
```

### 10.3 `decidePreemption` — interrupción de un razonamiento en vuelo (G0.5)

```typescript
// modules/atender/domain/preemption.ts
import type { Focus } from "./focus"

export type PreemptionDecision =
  | { kind: "keep_current" }
  | { kind: "preempt"; suspended: Focus } // suspender-y-marcar: conserva la deuda viva (NO descarta el progreso sellado)

/**
 * MOTOR §3.2 G0.5 política de preempción + §6.4 D2 anti-bandazo. El retador solo preempta si supera al foco en vuelo
 * POR MÁS QUE EL RUIDO **y de forma sostenida sobre >1 observación independiente** — todo ello lo decide el puerto
 * (admits = policy.preemptionAdmits); el dominio NO codifica margen alguno (ATENDER.INV-2). Preempción ≠ reapertura.
 */
export async function decidePreemption(
  challenger: Focus, incumbent: Focus,
  admits: (challenger: Focus["salience"], incumbent: Focus["salience"]) => Promise<boolean>,
): Promise<PreemptionDecision> {
  if (await admits(challenger.salience, incumbent.salience))
    return { kind: "preempt", suspended: { ...incumbent, state: "suspended_marked" } } // liveDebtRef intacto
  return { kind: "keep_current" }
}
```

### 10.4 `rankAttention` — orquestación (G0.5 + G4)

```typescript
// modules/atender/application/use-cases/rank-attention.ts
import type { AtenderDeps } from "./deps"
import type { AttentionRanking, Focus, FocusOrigin, RolKey } from "@/modules/atender/domain/focus"
import { allocateContention } from "@/modules/atender/domain/allocate-contention"
import type { UUID } from "@/types/shared"

export async function rankAttention(
  deps: AtenderDeps, input: { tenantId: UUID; rol?: RolKey },
): Promise<AttentionRanking> {
  if (deps.roles.length === 0) throw atenderError("ATENDER_EMPTY_ROLE_CONTEXT")
  const targetRoles = input.rol ? deps.roles.filter(r => r.rol === input.rol) : deps.roles

  // [1] REUNIR CANDIDATOS — lectura pura de C1. (Cardinalidad perturbación→foco: AQ-ATENDER-CARDINALIDAD-FOCO.)
  const perturbaciones = await deps.mov.listByType(input.tenantId, "perturbacion", { onlyValid: true, page: 0, pageSize: 200 })
  const brechas = await deps.normative.listGaps(input.tenantId, { onlyOpen: true })
  const origins: FocusOrigin[] = [
    ...perturbaciones.map(e => ({ kind: "perturbacion", entity: e } as const)),
    ...brechas.filter(hasReferent).map(e => ({ kind: "brecha", entity: e } as const)), // PRE-2: sin referente, fuera + audita
  ]

  // [2]+[3] PUNTUAR (relación de orden, vía puerto) + FILTRAR POR ROL — salience POR ROL, NUNCA colapsada
  const candidates: Focus[] = []
  for (const role of targetRoles) {
    for (const origin of origins) {
      const salience = await deps.policy.scoreSalience(input.tenantId, origin, role) // null/abstención propaga incomparabilidad
      if (!(await deps.policy.crossesAttentionThreshold(input.tenantId, salience, role))) continue // G4 freno: no obliga a actuar
      const presupuesto = await deps.policy.budgetFor(input.tenantId, salience, role)               // costo-de-error del rol, no la salience
      candidates.push({ origin, rol: role.rol, salience, presupuesto, state: "queued",
                        procedencia: procedenciaOf(origin), liveDebtRef: null })
    }
  }

  // [4] CONTENCIÓN — orden + presupuesto finito; el resto a la cola con deuda viva; incomparables expuestos
  const { active, queued, empatesDeclarados } = await allocateContention(
    candidates,
    (a, b) => deps.policy.compare(input.tenantId, a.salience, b.salience),
    (s, act) => deps.policy.focusBudgetAdmits(input.tenantId, s, act),
  )

  // [6] TRAZA (procedencia, no juicio) — metadata SIN salience/score/ranking
  for (const f of active) {
    await deps.audit.append({
      eventType: "atender.focus_ranked", actorType: "system", actorId: null, tenantId: input.tenantId,
      subjectType: f.origin.kind === "brecha" ? "mov_brecha" : "mov_perturbacion", subjectId: f.origin.entity.id,
      action: "atender.focus_ranked", requestId: deps.requestId, source: "atender-engine",
      metadata: { rol: f.rol, state: f.state }, // NO score/salience (no-juicio durable)
    })
  }
  return { active, queued, empatesDeclarados, requestId: deps.requestId }
  // NOTA: la PREEMPCIÓN de razonamientos en vuelo (decidePreemption) se ejerce vía arbitratePreemption(), que requiere
  // conocer el foco abierto del ritmo de juicio. Su entrega/recogida y persistencia cruzan la frontera con
  // DIAGNOSTICAR/JUZGAR → AQ-ATENDER-PREEMPCION-PROTOCOLO / AQ-ATENDER-HOGAR-FOCO (no construido aquí).
}
```

> El cuerpo de `scoreSalience` (mapear `magnitud/tendencia/urgencia/severidad/caracter` de la brecha y `clase/magnitud` de la perturbación a los cuatro factores ordinales) es **contenido calibrable** → `AQ-ATENDER-CALIBRACION`. La FORMA (cuatro factores como relación de orden) es fija. **El dominio no contiene ni un peso, ni un umbral, ni un techo, ni un margen** (ATENDER.INV-2): todos viven tras `SaliencePolicyPort`.

---

## 11. Pruebas unitarias (vitest `environment:node`, mockeando los puertos de C1)

> **Andamiaje (corrige los bugs de no-compilación señalados).** `setup` es **síncrona** (sin `await` en su cuerpo); el mock de `NormativeRepository` usa el método REAL **`listActiveConstraints`** (no `listConstraints`). El doble de `SaliencePolicyPort` devuelve un comparador y un umbral inyectados; ninguno se hardcodea en el dominio.

```ts
// modules/atender/application/use-cases/rank-attention.test.ts
import { describe, expect, it, vi } from "vitest"
const TENANT = "11111111-1111-1111-1111-111111111111"
const GAP_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", GAP_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const SUPERVISOR = "supervisor", GERENTE = "gerente", TECNICO = "tecnico"

function setup(opts: {
  gaps?: any[]; objetivos?: any[]; perturbaciones?: any[];
  policy?: Partial<SaliencePolicyPort>; roles?: RoleContext[];
}) {
  const listGaps = vi.fn().mockResolvedValue(opts.gaps ?? [])
  const listActiveObjectives = vi.fn().mockResolvedValue(opts.objetivos ?? [])
  const listActiveConstraints = vi.fn().mockResolvedValue([])          // método REAL de C1 (no "listConstraints")
  const listByType = vi.fn().mockResolvedValue(opts.perturbaciones ?? [])
  const updateGapObservedSide = vi.fn()                                // PROHIBIDO: debe quedar en 0
  const integrar = vi.fn(); const traverseUpstream = vi.fn()           // PROHIBIDOS: deben quedar en 0
  const normative = { listGaps, listActiveObjectives, listActiveConstraints, updateGapObservedSide } as any
  const mov = { listByType, getById: vi.fn(), listByAnchor: vi.fn(), integrar, deprecate: vi.fn() } as any
  const policy: SaliencePolicyPort = {
    scoreSalience: vi.fn(async () => SAL_DEFAULT),
    compare: vi.fn(async (_t, a, b) => (a === b ? 0 : 1)),
    crossesAttentionThreshold: vi.fn(async () => true),
    budgetFor: vi.fn(async () => ({ nivel: "somero", bajoTechoAbsoluto: true })),
    focusBudgetAdmits: vi.fn(async () => true),
    preemptionAdmits: vi.fn(async () => true),
    ...opts.policy,
  } as SaliencePolicyPort
  const audit = { append: vi.fn() } as any
  const deps = { normative, mov, dynamics: { listEpisodesBySignature: vi.fn() }, policy, audit,
    roles: opts.roles ?? [{ rol: SUPERVISOR, esferaDeAccion: ["visita"], horizonte: "horas", costoDeError: "medio" }],
    knowledgeNowMs: Date.parse("2026-06-29T00:00:00Z"), requestId: "44444444-4444-4444-4444-444444444444" }
  return { deps, integrar, updateGapObservedSide, traverseUpstream, audit, policy }
}
```

| # | Propiedad | Ancla canónica | Assert |
|---|---|---|---|
| U-1 | orden por salience (mayor primero) | ARQUITECTURA §3 acto 3; MOTOR §3.2 G0.5 | `active[0]` = el de mayor orden según `policy.compare` |
| U-2 | salience es ORDEN, no escalar; incomparables expuestos | MOTOR §9; MOV §5.2 | par con `compare→null` aparece en `empatesDeclarados`, no se fuerza orden |
| U-3 | relatividad de rol | CONSTITUCION §8; principio #5 | foco no accionable por TECNICO ausente para TECNICO, presente para GERENTE |
| U-4 | contención: presupuesto finito | MOTOR §3.2 G0.5; §8 Freno 3 | con `focusBudgetAdmits` que admite 1: `active.length===1`, `queued.length===1` |
| U-5 | cola con deuda viva (no descarta) | MOTOR §3.2 G0.5 | candidato fuera de presupuesto está en `queued`, no se pierde |
| U-6 | preempción suspender-y-marcar | MOTOR §3.2 G0.5 | `arbitratePreemption` con `preemptionAdmits` true ⇒ `outcome:"preempt"`, `suspended.liveDebtRef` preservado |
| U-7 | anti-bandazo | MOTOR §6.4 D2 | `preemptionAdmits` false ⇒ `keep_current` |
| U-8 | confianza no evaluada ⇒ incomparable, no 0 | MOV §5.2, §0.7 | factor con `evaluada:false` ⇒ `compare→null` |
| U-9 | presupuesto del costo-de-error, no de la salience | MOTOR §8 Freno 3 | `budgetFor` recibe el `RoleContext`; dos roles ⇒ presupuestos potencialmente distintos |
| U-10 | event-driven (Freno 1) | MOTOR §8 Freno 1 | sin candidatos: `active`/`queued` vacíos; ningún efecto |

```ts
it("U-3: un foco no accionable por el rol NO se le ofrece (CONSTITUCION §8, principio #5)", async () => {
  const { deps } = setup({
    gaps: [brecha({ id: GAP_A, referente: "obj-1" })],
    roles: [{ rol: TECNICO, esferaDeAccion: ["visita_hoy"], horizonte: "horas", costoDeError: "bajo" },
            { rol: GERENTE, esferaDeAccion: ["capacidad", "zona"], horizonte: "semanas", costoDeError: "alto" }],
    policy: { scoreSalience: vi.fn(async (_t, _o, role) =>
      role.rol === GERENTE ? SAL_ACCIONABLE : SAL_NO_ACCIONABLE),
      crossesAttentionThreshold: vi.fn(async (_t, s) => s !== SAL_NO_ACCIONABLE) },
  })
  const r = await rankAttention(deps, { tenantId: TENANT })
  expect(r.active.find(f => f.rol === TECNICO)).toBeUndefined()
  expect(r.active.find(f => f.rol === GERENTE)).toBeDefined() // misma realidad, distinta proyección
})

it("U-9: el presupuesto deriva del costo-de-error del rol, NO de la salience (MOTOR §8 Freno 3)", async () => {
  const { deps, policy } = setup({ gaps: [brecha({ id: GAP_A, referente: "obj-1" })] })
  await rankAttention(deps, { tenantId: TENANT })
  expect(policy.budgetFor).toHaveBeenCalledWith(TENANT, expect.anything(),
    expect.objectContaining({ costoDeError: expect.any(String) })) // recibe el rol, no solo la salience
})
```

---

## 12. Pruebas de falsación (DEBEN demostrar que el estado prohibido es inalcanzable)

| # | Estado prohibido | Por qué (canon) | Resultado exigido | Capa |
|---|---|---|---|---|
| F-AT-1 | ATENDER diagnostica (recorre el grafo causal hacia atrás) | DIAGNOSTICAR es G5 | `AtenderDeps` no inyecta `CausalGraphRepository`; `traverseUpstream` 0 invocaciones | dominio |
| F-AT-2 | ATENDER genera opción/intervención o se compromete | JUZGAR es G7/G8 | no escribe `intervencion`/`compromiso`; tope = `AttentionRanking` | dominio |
| F-AT-3 | salience colapsada a escalar / orden total fabricado entre incomparables | MOTOR §9 blindaje | `compare→null` para incomparables; dominio sin `value:number` | dominio |
| F-AT-4 | saliences multi-rol colapsadas a un índice único (`Math.max`) | CONSTITUCION §8; MOTOR §7 | orden por rol; ningún colapso a índice global | dominio |
| F-AT-5 | descartar una brecha simultánea de menor salience | MOTOR §3.2 G0.5 | el excedente está en `queued`, no se pierde | dominio |
| F-AT-6 | ATENDER inventa un peso/umbral no inyectado | MOTOR §9; regla dura 8 | sin política ⇒ `ATENDER_NO_POLICY` (abstención), nunca default | dominio |
| F-AT-7 | confianza no evaluada tratada como 0 | MOV §5.2 | `compare→null` (incomparable), no rank 0 | dominio |
| F-AT-8 | salience declara más certeza que su premisa | MOV §0.7 | `confianza` topada por `min`; eslabón débil | dominio |
| F-AT-9 | ATENDER escribe sustancia del MOV | reglas duras 2,4; C1 §3 | `integrar`/`updateGapObservedSide`/`writePerturbation` 0 invocaciones | dominio + RPC |
| F-AT-10 | preempción descarta el progreso del razonamiento viejo | MOTOR §3.2 G0.5 | `arbitratePreemption` conserva `suspended.liveDebtRef`; solo caducidad de frescura descarta | dominio |
| F-AT-11 | presupuesto igualado a la salience | MOTOR §8 Freno 3 | `budgetFor` recibe `RoleContext`; nunca `presupuesto := salience` | dominio |

```ts
it("F-AT-9: ATENDER NO escribe sustancia del MOV (es control, no mente — C1 §3)", async () => {
  const { deps, integrar, updateGapObservedSide } = setup({ gaps: [brecha({ id: GAP_A, referente: "obj-1" })] })
  await rankAttention(deps, { tenantId: TENANT })
  expect(integrar).not.toHaveBeenCalled()
  expect(updateGapObservedSide).not.toHaveBeenCalled() // recomputar la brecha es del OSE (INV-9)
})

it("F-AT-6: ATENDER se abstiene si el peso/umbral no fue inyectado (MOTOR §9, regla dura 8)", async () => {
  const { deps } = setup({ gaps: [brecha({ id: GAP_A, referente: "obj-1" })],
    policy: { scoreSalience: vi.fn(async () => { throw atenderError("ATENDER_NO_POLICY") }) } })
  await expect(rankAttention(deps, { tenantId: TENANT })).rejects.toMatchObject({ code: "ATENDER_NO_POLICY" })
})

it("F-AT-3: salience NO fabrica orden entre incomparables (MOTOR §9)", async () => {
  const { deps } = setup({ gaps: [brecha({ id: GAP_A, referente: "o" }), brecha({ id: GAP_B, referente: "o" })],
    policy: { compare: vi.fn(async () => null) } }) // incomparables
  const r = await rankAttention(deps, { tenantId: TENANT })
  expect(r.empatesDeclarados.length).toBeGreaterThan(0) // se EXPONEN, no se ordenan en silencio
})
```

---

## 13. Criterios de aceptación

El acto ATENDER está **terminado** (a nivel de esta spec; sujeto a las AQ aguas arriba) solo si TODOS son verdaderos:

- **CA-1 — Orden (posiblemente parcial) determinista.** `rankAttention` devuelve `active`/`queued` ordenados por `policy.compare`; los pares incomparables o de igual orden se exponen en `empatesDeclarados`, **no se fuerza un orden total**. U-1, U-2; F-AT-3, F-AT-5. *(ARQUITECTURA §3 acto 3; MOTOR §3.2 G0.5, §9.)*
- **CA-2 — Relatividad de rol sin colapso.** Un foco se ofrece a un rol solo si puede actuar; saliences multi-rol nunca se aplanan a un índice. U-3; F-AT-4. *(CONSTITUCION §8; MOTOR §7; principio #5.)*
- **CA-3 — Contención sin pérdida.** Presupuesto finito; el excedente a `queued` con deuda viva, nada se descarta. U-4, U-5; F-AT-5. *(MOTOR §3.2 G0.5; §8 Freno 3.)*
- **CA-4 — Preempción = suspender-y-marcar + anti-bandazo.** Mayor costo-de-error preempta conservando la deuda; ventaja sub-margen ⇒ cola. U-6, U-7; F-AT-10. *(MOTOR §3.2 G0.5; §6.4 D2.)*
- **CA-5 — Presupuesto del costo-de-error, bajo techo.** `presupuesto` deriva del `costoDeError` del rol, nunca de la salience, bajo techo absoluto. U-9; F-AT-11. *(MOTOR §8 Freno 3.)*
- **CA-6 — Forma fija, contenido inyectado, cero números en el dominio.** ATENDER recibe pesos/umbral/techo/margen vía `SaliencePolicyPort` (solo lectura) y se abstiene si faltan; el dominio no contiene ni un peso ni un techo. F-AT-6; ATENDER.INV-2. *(MOTOR §9; §10.4 punto 3.)*
- **CA-7 — Frontera de no-juicio intacta.** `integrar` 0, `updateGapObservedSide` 0, `writePerturbation` 0, `traverseUpstream` 0; sin diagnóstico, opción, articulación ni creación de brecha; traza sin score. F-AT-1, F-AT-2, F-AT-9. *(ARQUITECTURA §3 actos 4/5/6; C1 §3; OSE.INV-9.)*
- **CA-8 — Eslabón débil y event-driven.** `confianza` no excede la premisa más débil; `confianza_no_evaluada` incomparable; sin candidatos no hay foco. U-8, U-10; F-AT-7, F-AT-8. *(MOV §0.7, §5.2; MOTOR §8 Freno 1.)*
- **CA-9 — Cero conceptos nuevos.** Ningún tipo/acto/invariante fuera del canon; reusa los puertos REALES de C1 (`listGaps`/`listActiveObjectives`/`listActiveConstraints`/`listByType('perturbacion')`); no redefine el MOV ni modifica el OSE; **no añade tabla ni delta de esquema**. *(reglas duras 1–5; §Tabla de trazabilidad.)*
- **CA-10 — Ejecutabilidad condicionada.** U-1..U-10 y F-AT-1..F-AT-11 corren con el `vitest` actual mockeando los puertos de C1, **una vez que C1/C2 existan como TypeScript importable** (hoy `modules/mov` no existe → `AQ-ATENDER-PRECONDICION-C1C2`). Las pruebas que dependen del **predicado de accionabilidad por rol** y del **mapeo atributos→factores** dependen además de resolver `AQ-ATENDER-ACCIONABILIDAD-ROL` y `AQ-ATENDER-CALIBRACION` aguas arriba. La parte RPC/SQL (RLS, `mov.read`) hereda `AQ-ATENDER-TEST-INFRA`. *(C1 §11 nota de infraestructura.)*

---

## Tabla de trazabilidad

| Elemento de la spec | Traza canónica (verificada en disco) |
|---|---|
| Acto ATENDER, forma de la salience | ARQUITECTURA §3 acto 3 (literal: "control sobre **la sustancia**… impacto × urgencia × tratabilidad × relevancia-de-rol"); MOTOR §3.2 G0.5/G4 |
| G0.5 contención + cola con deuda viva + preempción suspender-y-marcar | MOTOR §3.2 G0.5 (literal) |
| G4 atender + presupuesto proporcional al stake | MOTOR §3.2 G4; §8 Freno 3 |
| "deja un candidato de foco… ATENDER asigna en G4" | MOTOR §2.3 Paso E (literal) |
| Anti-bandazo (margen + sostenido sobre >1 observación independiente) | MOTOR §6.4 Disparador 2 |
| Blindaje forma/contenido (relación de orden, no métrica numérica) | MOTOR §9 |
| Priores de atención calibrados por RECONCILIAR | MOTOR §10.4 punto 3 |
| Frenos 1 (event-driven) y 3 (techo absoluto del presupuesto) | MOTOR §8 |
| Conflicto inter-rol (expone, no colapsa; insatisfacible ⇒ escala) | MOTOR §7 |
| Supuesto monohilo / recurso de pensamiento = frente abierto | MOTOR §11; §12.3 |
| Relatividad de rol (4 coordenadas; "solo si puede actuar… es ruido") | CONSTITUCION §8 (literal); ARQUITECTURA principio irreducible #5 |
| Eslabón débil; confianza_no_evaluada incomparable; nunca colapso a índice | MOV §0.7; §5.2; §3.4 |
| Tipos priorizados: `brecha` D3, `objetivo` D1, `restriccion` D2, `perturbacion` E2 | MOV §1.5; §8 |
| Valor de la información = frente abierto | MOV §10 Clase 3; MOTOR §5 |
| `NormativeRepository.{listGaps, listActiveObjectives, listActiveConstraints, updateGapObservedSide}` | C1 `normative-repository.ts` (verificado) |
| `MovRepository.{getById, listByType, listByAnchor, integrar, deprecate}` | C1 `mov-repository.ts` (verificado) |
| `DynamicsRepository.{writePerturbation, writeEpisode, listEpisodesBySignature}` (lectura de E2 vía `listByType`) | C1 `dynamics-repository.ts` (verificado) |
| `CausalGraphRepository.{traverseUpstream,…}` — NO inyectado | C1 `causal-graph-repository.ts` (verificado) |
| `CHECK mov_perturbacion_no_juicio`; perturbación sin prioridad/score | C1 §7/§8.3; OSE POST-OUT-2, OSE.INV-6 |
| Delegación del OSE: "Rankear qué brecha merece foco; asignar salience/presupuesto → ATENDER" | C2 tabla de frontera (literal) |
| OSE recomputa solo el lado observado de la brecha; no la crea | OSE.INV-9; OSE AQ-OSE-AUTORIA-BRECHA |
| 1 perturbación con muchas `afectadas[]` por disparo | C2 POST-OUT-7; OSE AQ-OSE-CARDINALIDAD-PERTURBACION |
| `RelevanceThresholdPort` (solo lectura) — patrón de `SaliencePolicyPort` | C2 `relevance-threshold-port.ts` (verificado) |
| `AuditEvent`/`AuditRepository.append`/`listRecentByEventType` | `modules/audit/...` (verificado en disco) |
| Patrón `ScanDeps`/`nowMs`/`requestId`/per-tenant | `scan-overdue-work-orders.ts` (verificado) |

---

## Architectural Questions (NO resueltas — consolidadas, un id por vacío)

- **AQ-ATENDER-HOGAR-FOCO.** El canon permite a ATENDER "marcar prioridad/foco" pero NO nombra dónde vive el foco como dato. La `perturbacion` prohíbe estructuralmente prioridad/score (`CHECK mov_perturbacion_no_juicio`); el `urgencia` de la brecha es insumo normativo, no el ranking; los priores los escribe RECONCILIAR. Esta spec trata el foco como **proyección de lectura efímera** (valor de retorno) y **no construye tabla alguna**. Si la **deuda viva de un razonamiento preemptado** debe SOBREVIVIR y ser RETOMABLE entre invocaciones (MOTOR §3.2 G0.5), falta un hogar persistente que el canon no define y que esta spec **no resuelve ni construye**. *(Fusiona los antiguos HOGAR-DEL-FOCO / DONDE-VIVE-FOCO / DONDE-VIVE-EL-FOCO / PERSISTENCIA-FOCO.)* **No resuelta** (bloqueante para persistir la cola/preempción; no bloqueante para el ranking efímero).
- **AQ-ATENDER-CALIBRACION.** La FORMA de la salience (4 factores como relación de orden), el umbral suficiente/insuficiente, el techo absoluto de presupuesto y el margen de preempción son ley; su CUANTIFICACIÓN (pesos, umbral, magnitud del presupuesto, mapeo de `magnitud/tendencia/urgencia/severidad/caracter` de la brecha y `clase/magnitud` de la perturbación a los cuatro factores, margen anti-bandazo) es contenido calibrable por RECONCILIAR (MOTOR §9; §10.4). El canon NO fija tabla de persistencia, valor inicial (seed) ni acto provisionador antes de que RECONCILIAR exista. Aislada tras `SaliencePolicyPort` (solo lectura, análoga a AQ-OSE-UMBRAL de C2). *(Fusiona PESOS / PESOS-SALIENCE / PRESUPUESTO-COGNITIVO.)* **No resuelta.**
- **AQ-ATENDER-AUTORIA-BRECHA.** ATENDER prioriza brechas (D3) pero NO las crea. El OSE solo recomputa el lado observado (OSE.INV-9). El canon no nombra qué acto CREA la `brecha` por primera vez (hereda C1 AQ-AUTORIA-BRECHA / C2 AQ-OSE-AUTORIA-BRECHA, declarada operativamente bloqueante). Sin brecha viva, el conjunto atendible se reduce a perturbaciones. **No resuelta** (operativamente bloqueante).
- **AQ-ATENDER-LECTURA-PERTURBACION.** ATENDER lee las `perturbacion` (E2) vía `MovRepository.listByType('perturbacion',…)` —camino canónico único—, pero C1 no ofrece un cursor de "atendida vs pendiente". Sin él, el foco se recomputa idempotentemente cada barrido; añadir un cursor tocaría C1 (CERRADO). *(Fusiona PUERTO-PERTURBACIONES.)* **No resuelta.**
- **AQ-ATENDER-CARDINALIDAD-FOCO.** El OSE emite 1 `perturbacion` con N `afectadas[]` por disparo (POST-OUT-7); DIAGNOSTICAR opera sobre 1 brecha. ¿ATENDER produce 1 foco por perturbación, 1 por entidad afectada (leyendo aristas `afecta` de `mov_arista`), o 1 por brecha referida? La unidad de foco no está alineada por el canon. **No resuelta** (operativamente bloqueante para el flujo).
- **AQ-ATENDER-TRATABILIDAD-FUENTE.** `tratabilidad` y `relevancia-de-rol` presuponen el test de accionabilidad por rol (MOV §2.4/§5, dueño: Dimensión de Restricciones), que normalmente ejerce DIAGNOSTICAR recorriendo el grafo (PROHIBIDO a ATENDER). Esta spec lo compone SOLO de (a) el `caracter` corregible/gestionable de la brecha (vía `listGaps`) y (b) las `restriccion` D2 ya persistidas (vía `listActiveConstraints`), sin recorrer causalidad. La frontera exacta "leer tratabilidad ya modelada" vs "diagnosticarla" no la fija el canon. *(Fusiona TRATABILIDAD-vs-RESTRICCION.)* **No resuelta.**
- **AQ-ATENDER-ACCIONABILIDAD-ROL.** La relatividad de rol exige ofrecer un foco a un rol solo si puede actuar sobre el target. El canon NO define el catálogo de roles del tenant ni el PREDICADO de accionabilidad (cómo se decide que el rol X puede actuar sobre el target Y sin recorrer el grafo causal). `RolKey` es texto libre y el predicado vive en `SaliencePolicyPort.scoreSalience`/`crossesAttentionThreshold`. *(Fusiona CATALOGO-ROLES / RELEVANCIA-ROL-FUENTE.)* **No resuelta.**
- **AQ-ATENDER-CONTEXTO-ROL.** El `RoleContext` (esfera/horizonte/meta/costo-de-error, CONSTITUCION §8) es "valor de tenant, no esquema"; el canon no especifica QUIÉN provee el contexto ni cómo se determina qué rol pregunta/está disponible en una corrida. Hereda C1/C2 AQ-BINDING-OPERACIONAL y AQ-TENANT-vs-SUJETO. **No resuelta.**
- **AQ-ATENDER-VALOR-INFORMACION.** G0.5 extiende el ranking con "valor de la información", pero es frente declarado ABIERTO (MOV §10 Clase 3). El factor `valorInformacion` es un gancho con comportamiento de degradación (memoria primero vía `listEpisodesBySignature`, luego umbral fijo por consecuencia, MOTOR §5), NO una capacidad disponible; su cuantificación no se inventa. **No resuelta.**
- **AQ-ATENDER-SALIENCE-ORDINAL.** La salience es relación de orden, pero los sellos persisten confianza como escalar (C1 §8.2). Cuando un factor proviene de `tipo_incertidumbre` no conmensurable (p. ej. `ambiguedad_no_cuantificable` vs `reducible`, MOV §5.2), `compare` devuelve `null` (incomparable) y CA-1 admite orden parcial; el comparador total NO se fuerza. Hereda C1 AQ-CONFIANZA-ORDINAL y C2 AQ-OSE-MAGNITUD-ORDINAL. *(Fusiona CONFIANZA-ORDINAL-SALIENCE.)* **No resuelta.**
- **AQ-ATENDER-PREEMPCION-PROTOCOLO.** La deuda viva de un razonamiento preemptado (primer marco, diagnóstico parcial, presupuesto remanente) la producen DIAGNOSTICAR/JUZGAR, FUERA de ATENDER y aún no especificados. ATENDER DECIDE la cesión, pero el contrato de cómo se le entrega/devuelve la deuda (estructura, persistencia, quién la recoge al retomar) cruza una frontera no definida. Ligado a AQ-ATENDER-HOGAR-FOCO. *(Incluye PREEMPCION-ESTADO.)* **No resuelta.**
- **AQ-ATENDER-PREEMPCION-SOSTENIMIENTO.** El anti-bandazo exige superar el margen Y de forma sostenida sobre >1 observación independiente (MOTOR §6.4 D2). Esa condición vive en `SaliencePolicyPort.preemptionAdmits`; si la "independencia de observaciones" no es computable con los puertos reales de C1, queda sin mecanismo. **No resuelta.**
- **AQ-ATENDER-RECURSO-PENSAMIENTO.** La contención prohíbe asignar dos focos al mismo "recurso de pensamiento" sin orden, pero el supuesto monohilo / "un foco principal por episodio" es frente ABIERTO (MOTOR §11, §12.3). El canon no define qué es operativamente un recurso de pensamiento (hilo/episodio/concurrencia plena). Esta spec modela presupuesto finito y orden estricto; la concurrencia plena queda sin desarrollar. **No resuelta.**
- **AQ-ATENDER-DISPARO.** ATENDER es event-driven (Freno 1) y reacciona a perturbaciones del OSE o a una pregunta de rol (G0→G4). El canon NO nombra QUÉ del stack invoca `rankAttention` ni con qué cadencia (consumidor de `ose.perturbacion`, barrido cron, o petición de rol) sin violar "no se enciende a sí mismo". Hereda C2 AQ-OSE-RELOJ-MUNDO. **No resuelta.**
- **AQ-ATENDER-MULTI-SUJETO.** ATENDER es tenant-scoped (patrón `ScanDeps`), pero el canon define el foco como local a UN sujeto cognitivo (MOTOR §10.4 "local al sujeto modelado") y no presupone multi-inquilino. Si un tenant alberga >1 sujeto operacional, el presupuesto de foco y la contención deberían repartirse por sujeto, no por tenant. Hereda C1 AQ-TENANT-vs-SUJETO y C2 AQ-OSE-MULTI-SUJETO. **No resuelta.**
- **AQ-ATENDER-PRECONDICION-C1C2.** La afirmación "ejecutable hoy mockeando los puertos de C1" presupone que C1 (`modules/mov`) y C2 (`modules/ose`) existan como TypeScript importable. Hoy `modules/` no contiene `mov`/`ose`/`atender` (verificado en disco): ningún `import "@/modules/mov/..."` resuelve. Las pruebas de dominio/aplicación corren solo una vez que C1/C2 sean código, no `.md`. **No resuelta.**
- **AQ-ATENDER-TEST-INFRA.** El repo no tiene Postgres de test (vitest `environment:node`, Supabase mockeado). Las pruebas que tocan SQL/RLS (`mov.read`) no son ejecutables hoy; solo las de dominio/aplicación con puertos mockeados. Hereda C1 AQ-TEST-INFRA y C2 AQ-OSE-TEST-INFRA. **No resuelta.**
- **AQ-ATENDER-PERMISOS.** Un permiso `mov.read` para ATENDER debe existir en `permissions`/`role_permissions`/`tenant_features` (patrón de seed `20260625001_nlabs_permissions.sql`). Sin él, las lecturas fallan con `ATENDER_FORBIDDEN`. Hereda C1 AQ-PERMISOS. **No resuelta.**
