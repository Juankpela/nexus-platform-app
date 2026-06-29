# Componente 4 — DIAGNOSTICAR (Especificación de Ingeniería)

## Ficha de cierre

| Campo | Valor |
|---|---|
| **Estado** | ✅ **CERRADO** |
| **Fecha de cierre** | 2026-06-29 |
| **Falsification Gate** | **SURVIVED** (tras *targeted rework*) |
| **Refutadores** | 5 (independientes; presupuesto = el de construir) |
| **Claims auditados** | ≈80 (contra C1 · C3 · ARQUITECTURA · MOTOR · CONSTITUCION · MOV · código real) |
| **Claims refutados/ajustados** | 4 NEEDS_ADJUSTMENT (citas + pseudocódigo); **0 de lógica, 0 estructurales** |
| **APIs inventadas** | 0 |
| **Conceptos/actos nuevos** | 0 |
| **Invariantes rotos** | 0 |
| **AQ abiertas** | 25 (4 operativamente bloqueantes para la implementación) |
| **Ready for** | **C5 — JUZGAR** |

> Detalle del veredicto y de las 4 correcciones: ver bloque **Veredicto de Falsación (Gate, 2026-06-29)** al final del preámbulo. Panel comparativo: `docs/engineering/ENGINEERING_STATUS.md`.

---

> **Naturaleza.** SPEC DE INGENIERÍA implementable, NO arquitectura. Convierte el acto **DIAGNOSTICAR** del diseño cognitivo CONGELADO en software sobre el stack real (Supabase/PostgreSQL + TypeScript + Next.js, hexagonal). **No introduce ni un concepto, acto, tipo ni invariante cognitivo nuevo.** Se apoya en **C1** (`engineering/01-mov-data-model.md`, CERRADO) y recibe su foco de **C3/ATENDER** (`engineering/03-atender.md`, CERRADO) y **no los redefine**: DIAGNOSTICAR **recibe** la `brecha` ATENDIDA (el FOCO de C3, G4→G5) y **LEE** el grafo causal de C1 (`relacion_causal` C1 vía `mov_explicacion`; aristas `causal` vía `mov_arista`) recorriéndolo **HACIA ATRÁS** con `CausalGraphRepository.traverseUpstream`. Todo se traza al canon **por nombre** (ver §Tabla de trazabilidad). Donde el canon calla, se registra **Architectural Question** y **no se resuelve por intuición**.
>
> **Decisiones de unificación (resuelven las contradicciones internas señaladas por los refutadores; este documento es la versión gobernante única — misma disciplina que C3, `03-atender.md` L5-12):**
> 1. **Módulo único:** `modules/diagnosticar/{domain, application/{ports,use-cases}, infrastructure}`. Los puertos de C1 viven en `modules/mov/application/ports/` (ruta verificada por C2/C3 en disco).
> 2. **Caso de uso primario único:** `diagnose`. No hay caso de uso secundario.
> 3. **Puerto de cuantificación único:** `PlausibilityPolicyPort` (SOLO LECTURA; análogo a `SaliencePolicyPort` de C3 y `RelevanceThresholdPort` del OSE). Se elimina todo rastro de `CausalScoringPort`.
> 4. **Tipo de dependencias único:** `DiagnoseDeps`. Se eliminan `DiagnosticarDeps` y `DiagDeps`.
> 5. **Tipo de salida único:** `Diagnostico` como **unión discriminada** `{ kind: "diagnostico" | "abstencion" }`. Se eliminan las variantes `Diagnosis {outcome:"DIAGNOSED"|...}` y el `Diagnostico {estado, derrotable:true}`.
> 6. **Papeles en minúscula:** `"sintoma" | "causa" | "restriccion"` (coherente con los enums SQL de C1: `'asociacion'`, `'corregible'`, `'gestionable'`).
> 7. **`RoleContext` se IMPORTA de C3** (`@/modules/atender/application/ports/salience-policy-port`, donde C3 **exporta el tipo `RoleContext`** con la forma `{ rol: RolKey, esferaDeAccion, horizonte, costoDeError }` — citado **por nombre de símbolo, no por línea** (las líneas de C3 se desplazan al editarse; las citas a C3 se hacen por símbolo/archivo). NO se redeclara localmente (rompería "fuente única").
> 8. **DIAGNOSTICAR es CONSULTA (lectura pura).** Su salida es **valor de retorno efímero** (igual que el `Focus` de C3, ARQUITECTURA §6: *"diagnosticar… son consultas a la estructura causal del Modelo; no son sustancias nuevas"*). `DiagnoseDeps` **NO inyecta ninguna escritura del MOV** (ni `integrar`, ni `writeDisjunctiveBelief`, ni `traverseDownstream`). Si la operación demostrara que el diagnóstico debe PERSISTIR, ese vacío es `AQ-DIAG-PERSISTENCIA-INFERENCIA` — **no resuelto, no construido**.
> 9. **Profundidad del recorrido:** se lee de `deps.policy.maxUpstreamDepth(tenantId, role)` (contenido calibrable). **El dominio no contiene ningún literal numérico** de profundidad/peso/umbral (DIAG.INV-10).
> 10. **Evento de auditoría único:** `diagnosticar.causa_inferida`, sin score/confianza/ranking en `metadata`.
>
> **Disciplina de citas.** ARQUITECTURA/MOTOR/MOV/CONSTITUCION tienen secciones verificadas en disco; el OSE (C2) declara no usar números de sección, así que toda cita a C2 es por nombre. Invariantes con prefijo de origen: `DIAG.INV-N`, `MOV.I-N`, `OSE.INV-N`, `MOTOR.G-N`, `ATENDER.INV-N`.
>
> **Convención de stack:** `tenantId: UUID` primer parámetro de toda firma (`UUID = string`, no branded, verificado en `types/shared.ts`). Patrón de orquestación pura idéntico a `scanTenantOverdue` / `rankAttention` (`knowledgeNowMs`/`requestId` inyectados, verificado en `modules/scheduling/application/use-cases/scan-overdue-work-orders.ts`).
>
> **Precondición de construcción (honestidad, regla dura 6).** Verificado en disco: `nexus-platform/modules/` contiene `api, audit, authorization, billing, calendar, crm, dispatch, field-execution, forecasting, identity, integrations, inventory, notifications, organizations, platform, request-context, scheduling, service, tenancy` — **NO existen** `mov`/`ose`/`atender`/`diagnosticar`. Ningún `import "@/modules/mov/..."` resuelve hoy; los puertos de C1 existen como **firmas en el .md de C1**, no como código. La ejecutabilidad de DIAGNOSTICAR (incluso mockeando puertos) depende de que C1/C3 existan como TypeScript importable → `AQ-DIAG-PRECONDICION-C1C3`.
>
> **Veredicto de Falsación (Gate, 2026-06-29) — `SURVIVED` (tras *targeted rework*).** Cinco refutadores independientes (presupuesto = el de construir) atacaron por separado cada API, cita y claim de esta spec contra C1, C3, ARQUITECTURA, MOTOR, CONSTITUCION, MOV y el código real. **Núcleo intacto:** las citas a MOTOR/ARQUITECTURA (G5 L115-116, G4 L113, G6 L118, invariante (a) L146, memoria Punto 1, Regla F §6.2, "cuatro cosas, solo cuatro" §10.4 con creación-de-enlace excluida, Frenos 1/3, blindaje §9) y a CONSTITUCION/MOV (§0.3/I-3, §0.7, §2.1 R1/R4/R5, §2.2, §2.3, §2.4/§2.5, §5.2, B2=`inferencia` `attrs.forma='atribucion_causal'`, I-1/I-4/I-6/I-7) se verificaron **verbatim**; la API de C1 (`traverseUpstream`/`traverseDownstream`, `mov_c1_no_hecho`, `nivel_causal` columna, `applyWeakLink`, grant de escritura C/D solo a RECONCILIAR) y el contrato de C3 (`FocusOrigin`/`AttentionRanking`/`RoleContext`) son correctos; `audit.append` compila (`subjectType` string libre). **0 APIs inventadas, 0 conceptos nuevos, 0 invariantes rotos, 0 problemas estructurales.** **Clasificación: NEEDS TARGETED REWORK → corregido en este pase** (defectos localizados, ninguno de lógica): (a) 4 citas a líneas de C3 desfasadas por la edición de C3 → convertidas a **citas por nombre de símbolo** (anti-recurrencia); (b) `getById` citado en C1 L194 (es `getTrajectory`) → corregido a C1 L156; (c) pseudocódigo leía `rel.attrs.nivel_causal` contra su propia prosa (es **columna**) → accesor `nivelCausalDe(rel)` marcado AQ-gated; (d) `relacionCausalIdDe`/`esAccionablePorRol`/`nivelCausalDe` se presentaban como resueltas → declaradas **placeholders AQ-gated** (TODO, no integraciones). Las **25 Architectural Questions** (4 operativamente bloqueantes para la implementación: `AUTORIA-BRECHA`, `POBLADO-GRAFO`, `NODO-CAUSAL`, `LECTURA-ENLACE-CAUSAL`) siguen **no resueltas** y bloquean la operación end-to-end, no esta spec.

---

## 1. Propósito

DIAGNOSTICAR es el **cuarto acto del Motor** (ARQUITECTURA §3, acto 4, literal en disco L104-105): *"para una brecha atendida, determinar **por qué**, trazando la estructura causal hacia atrás… de forma derrotable y fundamentada"*. Su razón de existir: *recomendar sin diagnosticar es tratar el síntoma; el diagnóstico es lo que hace que la acción ataque la causa.*

Su sede en la dinámica del Motor es **el gate G5** (MOTOR-COGNITIVO.md L115-116, literal): *"El foco es una `brecha` (síntoma). Se recorre el grafo causal en reversa, clasificando cada nodo en los tres papeles canónicos del Modelo (§0.3, invariante I-3): **SÍNTOMA** (la brecha que se ve) / **CAUSA** (origen corregible aguas arriba) / **RESTRICCIÓN** (límite estructural que se acata o se invierte en levantar). Lee: `relacion_causal` (C) + `episodio` (E1); cada arista por su nivel (asociación/intervención/contrafactual); la confianza hereda el eslabón causal más débil del camino. Recorrido: hacia atrás. Freno: si el grafo no distingue causa de mera asociación, el diagnóstico queda en HIPÓTESIS y arrastra esa incertidumbre."*

DIAGNOSTICAR se sitúa **después** de ATENDER (G4: *"hay un foco, con su presupuesto cognitivo asignado proporcional al stake"*, MOTOR L113) y **antes** de JUZGAR (G7, recorrido causal **hacia adelante**). El Motor separa físicamente los dos sentidos del recorrido (MOTOR §3.2 invariante (a), L146 literal): *"el grafo se recorre en dos sentidos opuestos —diagnosticar va aguas arriba (G5), proyectar aguas abajo (G7); confundirlos es razonar sobre el síntoma en vez de la causa; la escalera los separa físicamente."* DIAGNOSTICAR **solo recorre hacia atrás**.

El procedimiento materializa MOV §2.4/§2.5: *"trazar hacia atrás → filtrar por nivel ≥ 2 (lo asociativo es correlato sospechoso, no causa) → evaluar accionabilidad por rol (accionable = causa; no accionable = restricción) → descartar confusores"*. La distinción inviolable es MOV §0.3 / `MOV.I-3`: SÍNTOMA *(se observa)* / CAUSA *(se corrige)* / RESTRICCIÓN *(se gestiona o se invierte en levantar)*; *"tratar una restricción como causa es el error operativo más caro"* (ARQUITECTURA §2.1).

> **Frase de propósito (una línea).** DIAGNOSTICAR recibe la `brecha` ATENDIDA por C3 (el síntoma), recorre HACIA ATRÁS el grafo de `relacion_causal` (C1), abduce la(s) **causa(s) candidata(s)** más plausible(s) distinguiéndolas de síntoma y de restricción, exige evidencia y falsador para cada eslabón, **hereda la confianza por el eslabón débil del camino** (computándola él mismo desde las aristas, ver §8), y devuelve un **`Diagnostico` DERROTABLE** con su estatus epistémico — o se **abstiene** — **sin juzgar, sin generar intervenciones, sin recorrer hacia adelante, sin calibrar la confianza de las relaciones causales, sin escribir sustancia y sin promover nada a HECHO**.

### 1.1 Qué consume y de quién (sin reimplementar C1/C3)

- **De C3 (ATENDER):** el **FOCO** — un `Focus` cuyo `origin = { kind:"brecha", entity }` (tipo `FocusOrigin` en C3 `focus.ts`, verificado **por nombre**). C3 entrega `AttentionRanking { active: Focus[], queued, empatesDeclarados }`; DIAGNOSTICAR consume **un** `Focus` de `active` por invocación. El acoplamiento es por **identidad de brecha** (`brechaId: UUID`), no por la estructura interna de `Salience`/`AttentionRanking`, para no atar G5 a la proyección efímera de G4 (ver §4.3).
- **De C1 (MOV):** el **grafo causal** y la memoria, vía puertos de **solo lectura** (verificados en disco):
  - `CausalGraphRepository.traverseUpstream(tenantId, fromNodeId, maxDepth): Promise<AristaMov[]>` — el recorrido **hacia atrás** (C1 L192, anotado literal *"// DIAGNOSTICAR (hacia atrás)"*). DIAGNOSTICAR **nunca** llama `traverseDownstream` (C1 L193, *"// JUZGAR (hacia adelante)"*).
  - `MovRepository.getById` — para **hidratar** la entidad `relacion_causal` (`mov_explicacion`) que cada arista `causal` representa, y leer `nivel_causal` (columna) y `attrs.condicion_falsacion` (ver §8.1 y `AQ-DIAG-LECTURA-ENLACE-CAUSAL`).
  - `NormativeRepository.listGaps` / `listActiveConstraints` / `listActiveObjectives` — resolver la brecha-foco, reconocer restricciones ya modeladas (D2) sin re-derivarlas, y confirmar el referente (D1).
  - `MovRepository.listByAnchor` — leer las aristas `referente` de la brecha (confirmar que es síntoma con deber-ser, `MOV.I-6`).
  - `DynamicsRepository.listEpisodesBySignature` — memoria E1, consultada **solo en G5** (reconocimiento de patrón, MOTOR §4 Punto 1).

DIAGNOSTICAR **no implementa** el recorrido del grafo (es de C1), **no crea** la brecha (vacío de autoría heredado, `AQ-DIAG-AUTORIA-BRECHA`), **no puebla** las `relacion_causal` (`AQ-DIAG-POBLADO-GRAFO`) y **no mantiene** el Modelo (es C2). Es un **lector disciplinado** que produce una inferencia como valor de retorno.

---

## 2. Responsabilidades

Una sola responsabilidad indivisible — **para una brecha atendida, abducir POR QUÉ recorriendo el grafo causal hacia atrás, distinguiendo síntoma/causa/restricción, de forma derrotable y fundamentada, o abstenerse** (ARQUITECTURA §3 acto 4; MOTOR G5) — descompuesta en obligaciones ancladas al canon:

- **RD-1 — Recibir y anclar el foco (la brecha atendida).** Resolver el `brechaId` del `Focus` de C3 a su entidad `brecha` (D3) vigente vía `NormativeRepository.listGaps`, y anclarla a su `objetivo` (D1) referente vía `listByAnchor` (arista `referente`, `MOV.I-6`). El **síntoma** ES esa brecha (MOV §0.3). DIAGNOSTICAR **no construye** la brecha (PRE-1).
- **RD-2 — Recorrer el grafo causal HACIA ATRÁS (G5; MOV §2.5).** Invocar `traverseUpstream(tenantId, brechaNodeId, depth)` desde el nodo causal del síntoma, **una sola dirección**. `depth` se lee del puerto de plausibilidad; su **valor concreto** es contenido calibrable → `AQ-DIAG-PROFUNDIDAD`.
- **RD-3 — Filtrar por nivel y descartar correlato espurio (MOV §2.3/§2.4).** Conservar como candidata a **causa** solo lo que alcanza **nivel ≥ intervención**; *"lo asociativo es correlato sospechoso, no causa"* (MOV §2.3). Descartar confusores declarados. Si el grafo no distingue causa de asociación, *"el diagnóstico queda en HIPÓTESIS y arrastra esa incertidumbre"* (MOTOR G5).
- **RD-4 — Clasificar cada nodo en los tres papeles (`MOV.I-3`; §0.3; §2.4).** Etiquetar cada posición aguas arriba como **sintoma** (la brecha), **causa** (origen corregible, accionable por el rol) o **restriccion** (límite estructural ya modelado ∈ `listActiveConstraints`). El **test de accionabilidad** es dueño de la Dimensión de Restricciones (MOV §5) y su predicado concreto NO lo fija el canon → `AQ-DIAG-ACCIONABILIDAD-ROL`. Una `brecha` *"referencia su causa y su restricción como entidades distintas; nunca las fusiona"* (`MOV.I-3`).
- **RD-5 — Heredar la confianza por el ESLABÓN DÉBIL del camino (MOV §0.7, §2.2).** La confianza del diagnóstico = **MIN de los sellos de las aristas del camino** (MOV §2.2: *"confianza agregada ≤ la del eslabón más débil"*). **DIAGNOSTICAR computa este MIN él mismo** reusando `applyWeakLink` (C1 `weak-link.ts`, verificado L580-600), porque el puerto `traverseUpstream` devuelve `AristaMov[]` **crudo, sin** `confianzaAgregada` (ver §8.1, corrección). `confianza_no_evaluada` en un eslabón ⇒ `applyWeakLink` devuelve `{ abstain: "PREMISA_NO_EVALUADA" }` ⇒ **abstención** (incomparable, nunca 0; MOV §5.2).
- **RD-6 — Producir un diagnóstico DERROTABLE y FUNDAMENTADO (MOTOR §6.2; CONSTITUCION §4).** Cada causa candidata porta su **falsador pre-registrado** (`condicion_falsacion` del `relacion_causal`, MOV §2.2 R5; Regla F MOTOR §6.2: *"qué observación futura la confirmaría y cuál la refutaría"*). Sin falsador no es hipótesis admisible: es dogma → se descarta. El diagnóstico es **revisable** si llega evidencia contraria. Toda conclusión es **trazable** a las `observacion` (B1) raíz (`MOV.I-1`; CONSTITUCION §4).
- **RD-7 — Sostener pluralidad legítima de causas (MOTOR §6.3; MOV §5.2).** Cuando la evidencia no separa a las candidatas, devolver **varias candidatas vivas** ordenadas por soporte, con sus empates DECLARADOS — *"exactamente una es la real, no sé cuál"* (MOV §5.2). Colapsar a una antes de tiempo es la falla. DIAGNOSTICAR **expone** la disyunción como valor de retorno; **no la escribe** (`writeDisjunctiveBelief` es de C1 y NO está en `DiagnoseDeps`) → ver Límites y `AQ-DIAG-PERSISTENCIA-INFERENCIA`.
- **RD-8 — Abstenerse cuando la evidencia no alcanza (`MOV.I-7`; CONSTITUCION §4; MOTOR §6).** Si no hay enlace con falsador que alcance nivel ≥ intervención, o un eslabón es `confianza_no_evaluada`, o el grafo no distingue causa de asociación, devolver **abstención sellada** declarando **qué falta y qué la rescataría** (MOV §5.2). La abstención es *"salida de primera clase, no un fallo"* (CONSTITUCION §4). *(Frontera: el **umbral por consecuencia** que decide "suficiente para lo que está en juego" es el gate **G6 = DIAGNOSTICAR→JUZGAR**, MOTOR L118; DIAGNOSTICAR entrega la confianza heredada y se abstiene por **ausencia de causa fundamentable**, no por el umbral del consumidor — ver §3.1 y `AQ-DIAG-UMBRAL-ABSTENCION`.)*
- **RD-9 — Reconocer patrón en memoria SOLO cuando hay razón (MOTOR §4 Punto 1).** Consultar `listEpisodesBySignature` *"solo si (a) la sorpresa fue alta, o (b) el camino causal es opaco (varias candidatas con confianza similar)"*. El `episodio` aporta una **HIPÓTESIS, no un HECHO**: *"la memoria sugiere, el grafo del presente confirma o descarta"*. Una causa de memoria sin arista vigente que la soporte **no entra a `causas`**. La **firma de síntoma** con la que se consulta no la fija el canon → `AQ-DIAG-FIRMA-EPISODIO`. Si el `Focus` de C3 no transporta la magnitud de sorpresa, el disparo (a) no es evaluable aquí → `AQ-DIAG-SORPRESA-EN-FOCO`.

**Estado de control propio.** El `Diagnostico` es **valor de retorno efímero** (proyección de lectura), igual que el `Focus` de C3. DIAGNOSTICAR **no inventa estado en el MOV ni tabla nueva**. Si la **deuda epistémica viva** de un diagnóstico parcial debe **sobrevivir** a una preempción de C3 (MOTOR §3.2 G0.5), su hogar persistente cruza la frontera con C3/JUZGAR → `AQ-DIAG-HOGAR-DIAGNOSTICO` (hereda `AQ-ATENDER-HOGAR-FOCO`; no resuelto, no construido).

---

## 3. Límites — la frontera dura (qué DIAGNOSTICAR NO hace)

DIAGNOSTICAR es **consulta causal de lectura, hacia atrás, que produce una inferencia derrotable como valor de retorno**. Determina el *porqué* y se detiene. La frontera se traduce a prohibiciones de código verificables:

| Excluido de DIAGNOSTICAR | Acto/Componente dueño | Materialización del límite en el stack |
|---|---|---|
| Generar `intervencion`es (E3); proyectar consecuencias; **recorrer el grafo HACIA ADELANTE**; podar por restricción para decidir | **JUZGAR** (G7) | `DiagnoseDeps` inyecta **solo** `traverseUpstream`; **nunca** `traverseDownstream` (excluido por `Pick<…>`). |
| Elegir/comprometerse, abstención-como-juicio deliberativo, escalar; sembrar `expectativa` de resultado de palanca | **JUZGAR** (G8) | DIAGNOSTICAR **nunca** escribe `intervencion`/`compromiso`/`expectativa`. Su abstención es por *ausencia de causa fundamentable*, no la abstención deliberativa de G8. |
| Decidir suficiencia por **umbral del costo de error del rol** | **G6 = DIAGNOSTICAR→JUZGAR** (MOTOR L118) | DIAGNOSTICAR entrega la confianza heredada; el gate de suficiencia por consecuencia es del handoff → `AQ-DIAG-UMBRAL-ABSTENCION`. |
| Rankear salience; asignar foco/presupuesto; resolver preempción | **ATENDER** (G4/G0.5) | DIAGNOSTICAR **recibe** el `Focus`/`brechaId`; no inyecta `SaliencePolicyPort` ni computa `Salience`. |
| **Calibrar la confianza** de las `relacion_causal`; ajustar fuerza/palanca/priores/`trayectoria`; reclasificar papel post-outcome | **RECONCILIAR** (MOTOR §10.4) | DIAGNOSTICAR **solo LEE** el grafo; **nunca** escribe en `mov_explicacion` (C1) ni ajusta confianzas. |
| Medir sorpresa; integrar hechos; emitir `perturbacion`; recomputar el lado observado de la brecha | **COMPRENDER / OSE (C2)** | DIAGNOSTICAR **consume** la brecha ya recomputada; nunca llama `perceiveSignal`/`integrar`/`writePerturbation`/`updateGapObservedSide`. |
| Proyectar el diagnóstico a un rol en su lenguaje | **ARTICULAR** (G9) | DIAGNOSTICAR usa el rol solo para el test de accionabilidad; **no produce texto** ni pantalla. |
| **Escribir sustancia** (cualquier familia A/B/C/D/E); persistir la inferencia o la disyunción | **C1 / autoría sin dueño** | `DiagnoseDeps` **no inyecta `integrar` ni `writeDisjunctiveBelief`**. El `Diagnostico` se DEVUELVE; quién lo persiste para que JUZGAR lo recoja → `AQ-DIAG-PERSISTENCIA-INFERENCIA`. |
| Promover una causa (o un `episodio` recuperado) a **HECHO** | **Ningún acto** (prohibido) | El diagnóstico es siempre `INFERENCIA`/`HIPOTESIS`; una `relacion_causal` **nunca es HECHO** (MOV §2.1 R1; CHECK `mov_c1_no_hecho` de C1 L409). |

### 3.1 El límite más fino: DIAGNOSTICAR NO CALIBRA, NO ESCRIBE y NADA se promueve a HECHO

Tres confusiones son las más caras y se prohíben explícitamente:

1. **DIAGNOSTICAR ≠ RECONCILIAR (no calibra).** La confianza de una `relacion_causal` se ajusta **solo tras el outcome**, por RECONCILIAR (MOTOR §10.4 punto 1, verificado L315: *"Sube si la predicción se confirmó, baja si se refutó"*). DIAGNOSTICAR **lee** esa confianza sellada y la **propaga por el eslabón débil**; **no la modifica**. La reclasificación persistente de papel (*"el empuje no movió nada porque el límite era duro"*) también es de RECONCILIAR (MOTOR §10.4 punto 2). DIAGNOSTICAR clasifica **para esta consulta** (valor de retorno), no escribe la clasificación en el grafo.
2. **DIAGNOSTICAR es CONSULTA, no escritor.** ARQUITECTURA §6: *"diagnosticar… son consultas a la estructura causal del Modelo; no son sustancias nuevas"*. El `Diagnostico` se **devuelve**; `DiagnoseDeps` no expone ninguna escritura. (La tentación de escribir una `inferencia` B2 — camino canónico de familia B — se registra como `AQ-DIAG-PERSISTENCIA-INFERENCIA` y **no se construye**, porque el canon describe el acto como consulta y no nombra quién persiste el diagnóstico.)
3. **Nada se promueve a HECHO.** Toda atribución de causa es `inferencia` (B2) o estatus HIPÓTESIS; por la Ley del eslabón débil **nunca alcanza HECHO** (MOTOR §6.1; MOV §2.1 R1).

> **Criterio de fallo del componente.** Si DIAGNOSTICAR generara intervenciones o se comprometiera (JUZGAR), recorriera el grafo hacia adelante (G7), rankeara atención (ATENDER), articulara para un rol (ARTICULAR), **escribiera cualquier sustancia o calibrara una `relacion_causal`** (RECONCILIAR/C1), midiera sorpresa o integrara hechos (OSE), **promoviera una causa a HECHO**, o devolviera una causa sin falsador y sin estatus epistémico, dejaría de ser una consulta causal derrotable de lectura.

---

## 4. Interfaces públicas (caso de uso hexagonal)

DIAGNOSTICAR expone un único caso de uso de **orquestación pura** en `modules/diagnosticar/application/use-cases`, que **consume** los puertos de lectura de C1. **No existe puerto de escritura de DIAGNOSTICAR.**

### 4.1 Tipos de dominio (`modules/diagnosticar/domain/diagnostico.ts`)

```typescript
// modules/diagnosticar/domain/diagnostico.ts
// El DIAGNÓSTICO es proyección de lectura derrotable, NO entidad del MOV (decisión gobernante 8; ARQUITECTURA §6).
import type { EntidadMov } from "@/modules/mov/domain/entidad-mov"
import type { AristaMov } from "@/modules/mov/domain/arista-mov"
import type { UUID } from "@/types/shared"

/** Los tres papeles canónicos — MOV §0.3 / MOV.I-3. NO es un tipo nuevo: es clasificación de LECTURA. Minúscula (decisión 6). */
export type PapelCausal = "sintoma" | "causa" | "restriccion"

/** Nivel causal de la arista que sostiene la candidata — MOV.I-4 / §2.3. Para ser 'causa' exige nivel ≥ 'intervencion'. */
export type NivelCausal = "asociacion" | "intervencion" | "contrafactual"

/** Estatus epistémico — CONSTITUCION §4; MOV §2.1 R1. El tipo NO admite "HECHO" (DIAG.INV-2). */
export type EstatusDiagnostico = "INFERENCIA" | "HIPOTESIS"

/**
 * Falsador pre-registrado — Regla F (MOTOR §6.2) / MOV §2.1 R5. Sin él NO es hipótesis viva: es dogma (RD-6).
 * 'refutaSi'/'confirmaSi' se LEEN de relacion_causal.attrs.condicion_falsacion (entidad mov_explicacion, §8.1).
 */
export type Falsador = {
  readonly refutaSi: string          // qué observación futura la REFUTARÍA
  readonly confirmaSi: string        // qué observación futura la CONFIRMARÍA
  readonly relacionCausalId: UUID    // la relacion_causal (mov_explicacion) que porta la condicion_falsacion
}

/**
 * Una CAUSA CANDIDATA derrotable — hipótesis viva (MOTOR §6.1: estado de uso de tipos existentes, NO tipo nuevo).
 * Solo entidades con papel 'causa' entran aquí; las 'restriccion' viven en `nodos`, nunca en `causas` (DIAG.INV-4).
 */
export type CausaCandidata = {
  readonly nodoCausalId: UUID                 // nodo aguas arriba (dimensión de variación, MOV §2.2; ver AQ-DIAG-NODO-CAUSAL)
  readonly papel: "causa"                     // por construcción: las candidatas son causa; síntoma=brecha, restriccion=nodos
  readonly nivelMin: NivelCausal              // nivel del eslabón MÁS DÉBIL del camino (no se presenta más alto, MOV §2.3)
  readonly camino: readonly AristaMov[]       // aristas 'causal' recorridas HACIA ATRÁS (procedencia del diagnóstico)
  readonly estatus: EstatusDiagnostico        // INFERENCIA | HIPOTESIS — jamás HECHO
  /** Confianza agregada = MIN de los sellos del camino, computado por DIAGNOSTICAR vía applyWeakLink (RD-5; §8.1).
   *  null = confianza_no_evaluada en algún eslabón (INCOMPARABLE, MOV §5.2) — dispara abstención de ese camino. */
  readonly confianza: number | null
  readonly falsador: Falsador                 // RD-6: sin esto la candidata se descarta antes de devolver
  readonly viaMemoria: boolean                // true si un episodio (E1) SUGIRIÓ esta candidata (MOTOR §4 Punto 1)
  readonly procedencia: readonly UUID[]       // observaciones raíz (B1) que la fundan (trazable, MOV.I-1; CONSTITUCION §4)
}

/** Clasificación de LECTURA de un nodo recorrido (no entra a `causas` salvo papel 'causa'). Expone síntoma y restricciones. */
export type NodoClasificado = {
  readonly nodoId: UUID
  readonly papel: PapelCausal
}

/** Pares de candidatas incomparables o de igual soporte — pluralidad viva DECLARADA (MOV §3.4; MOTOR §6.3). */
export type EmpateDeclarado = readonly [UUID, UUID]

/** Abstención sellada — MOV.I-7 / §5.2 trazabilidad: declara QUÉ FALTA y qué la rescataría (RD-8). */
export type Abstencion = {
  readonly motivo:
    | "sin_causa_sobre_umbral_de_nivel"   // todo aguas arriba es asociación (nivel < intervención), MOV §2.5
    | "premisa_no_evaluada"               // applyWeakLink devolvió { abstain } (confianza_no_evaluada, MOV §5.2)
    | "grafo_no_distingue_causa"          // causa ≡ correlato; queda HIPOTESIS sin separar (MOTOR G5)
    | "grafo_vacio"                       // no hay aristas causales con falsador hacia el síntoma
    | "brecha_sin_referente"              // la brecha no es síntoma (sin deber-ser), PRE-2
  readonly faltaObservacion: string       // qué observación/relación concreta falta (§5.2)
  readonly rescatariaSi: string           // qué la resolvería (§5.2)
}

/**
 * Salida ÚNICA de diagnose: unión discriminada (decisión 5). NO porta opción, intervención, recomendación ni score.
 * Valor de retorno efímero: DIAGNOSTICAR no escribe sustancia (decisión 8).
 */
export type Diagnostico =
  | {
      readonly kind: "diagnostico"
      readonly tenantId: UUID
      readonly brechaId: UUID                          // el SÍNTOMA atendido (foco de C3)
      readonly estatus: EstatusDiagnostico             // INFERENCIA | HIPOTESIS — jamás HECHO
      readonly causas: readonly CausaCandidata[]       // ordenadas por soporte; >1 ⇒ pluralidad viva
      readonly nodos: readonly NodoClasificado[]       // todos los nodos recorridos (incluye síntoma y restricciones)
      readonly empatesDeclarados: readonly EmpateDeclarado[]
      readonly confianza: number | null                // = MIN del camino de la mejor candidata (eslabón débil)
      readonly esDisyuntiva: boolean                   // >1 candidata viva sin separar (RD-7)
      readonly requestId: UUID
    }
  | {
      readonly kind: "abstencion"
      readonly tenantId: UUID
      readonly brechaId: UUID
      readonly abstencion: Abstencion
      readonly requestId: UUID
    }
```

### 4.2 Puerto de cuantificación calibrable (`PlausibilityPolicyPort`)

```typescript
// modules/diagnosticar/application/ports/plausibility-policy-port.ts
import type { CausaCandidata } from "@/modules/diagnosticar/domain/diagnostico"
import type { RoleContext } from "@/modules/atender/application/ports/salience-policy-port" // decisión 7: fuente única (C3)
import type { UUID } from "@/types/shared"

/**
 * ÚNICO puerto de cuantificación de DIAGNOSTICAR (decisión 3). La FORMA es ley del canon:
 *   - plausibilidad = relación de ORDEN por soporte evidencial (fuerza × confianza descontada por retardo, MOV §2.5);
 *   - profundidad del recorrido = un límite DEBE existir (Freno 3, MOTOR §8), su valor es contenido.
 * La CUANTIFICACIÓN es contenido calibrable por RECONCILIAR (MOTOR §9 blindaje forma/contenido; §10.4).
 * DIAGNOSTICAR lo LEE; NUNCA lo escribe. Análogo a SaliencePolicyPort (C3) y RelevanceThresholdPort (OSE), de SOLO LECTURA.
 */
export interface PlausibilityPolicyPort {
  /** Orden por SOPORTE: -1 (a<b) | 0 (empate declarado) | 1 (a>b) | null (INCOMPARABLE: confianza_no_evaluada o
   *  niveles no conmensurables, MOV §5.2). NUNCA fabrica orden entre incomparables → AQ-DIAG-PLAUSIBILIDAD. */
  compareSupport(tenantId: UUID, a: CausaCandidata, b: CausaCandidata): Promise<-1 | 0 | 1 | null>
  /** Profundidad máxima del recorrido hacia atrás (acota la abducción; Freno 3 MOTOR §8). Su VALOR es contenido
   *  calibrable → AQ-DIAG-PROFUNDIDAD. El dominio NO contiene este número (DIAG.INV-10). */
  maxUpstreamDepth(tenantId: UUID, role: RoleContext): Promise<number>
}
```

> **Frontera deliberada con G6.** `PlausibilityPolicyPort` **NO** incluye `meetsSufficiency`/`crossesAbstentionThreshold`. El gate de suficiencia por consecuencia es **G6 = DIAGNOSTICAR→JUZGAR** (MOTOR L118), del lado del consumidor; DIAGNOSTICAR solo entrega la confianza heredada y se abstiene por **ausencia de causa fundamentable** (RD-8). Esta frontera la registra `AQ-DIAG-UMBRAL-ABSTENCION`.

### 4.3 Dependencias inyectadas (`DiagnoseDeps`) — puertos de C1 que DIAGNOSTICAR CONSUME

```typescript
// modules/diagnosticar/application/use-cases/deps.ts
import type {
  CausalGraphRepository, // C1: traverseUpstream (HACIA ATRÁS); traverseDownstream NO se usa (G7, JUZGAR)
  NormativeRepository,   // C1: listGaps, listActiveConstraints, listActiveObjectives (LECTURA; updateGapObservedSide NO)
  MovRepository,         // C1: getById (hidrata relacion_causal), listByAnchor (LECTURA; integrar/deprecate NO)
  DynamicsRepository,    // C1: listEpisodesBySignature (memoria E1 para G5; writeEpisode/writePerturbation NO)
} from "@/modules/mov/application/ports"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PlausibilityPolicyPort } from "@/modules/diagnosticar/application/ports/plausibility-policy-port"
import type { RoleContext } from "@/modules/atender/application/ports/salience-policy-port" // decisión 7
import type { UUID } from "@/types/shared"

/**
 * SOLO LECTURA del MOV (C1) + plausibilidad calibrada (solo lectura) + auditoría + reloj/correlación.
 * Pick<…> EXCLUYE por construcción TODA escritura y, crucialmente, EXCLUYE traverseDownstream:
 * estructuralmente DIAGNOSTICAR no puede proyectar hacia adelante, ni escribir sustancia, ni calibrar.
 * NO integrar, NO writeDisjunctiveBelief, NO updateGapObservedSide, NO writeEpisode, NO writePerturbation (decisión 8).
 */
export type DiagnoseDeps = {
  readonly causal: Pick<CausalGraphRepository, "traverseUpstream">            // traverseDownstream AUSENTE a propósito
  readonly normative: Pick<NormativeRepository, "listGaps" | "listActiveConstraints" | "listActiveObjectives">
  readonly mov: Pick<MovRepository, "getById" | "listByAnchor">              // getById HIDRATA la relacion_causal (§8.1)
  readonly dynamics: Pick<DynamicsRepository, "listEpisodesBySignature">     // memoria E1, solo en G5 (RD-9)
  readonly policy: PlausibilityPolicyPort
  readonly role: RoleContext                                                  // rol consumidor; quién lo provee → AQ-DIAG-CONTEXTO-ROL
  readonly audit: AuditRepository
  readonly knowledgeNowMs: number   // instante de CONOCIMIENTO de la corrida (determinismo), igual que ScanDeps.nowMs
  readonly requestId: UUID
}
```

### 4.4 Firma del caso de uso primario `diagnose`

```typescript
// modules/diagnosticar/application/use-cases/diagnose.ts
import type { DiagnoseDeps } from "./deps"
import type { Diagnostico } from "@/modules/diagnosticar/domain/diagnostico"
import type { UUID } from "@/types/shared"

/**
 * G5 del Motor: para la BRECHA ATENDIDA (foco de C3), abduce la(s) causa(s) recorriendo el grafo de C1 HACIA ATRÁS,
 * distingue síntoma/causa/restricción, hereda confianza por eslabón débil, y devuelve un Diagnostico DERROTABLE —
 * o se abstiene declarando qué falta. NO juzga, NO proyecta, NO calibra, NO escribe sustancia.
 *
 * Acoplamiento con C3: se recibe la brecha por IDENTIDAD (brechaId), no la estructura interna de Focus/Salience.
 * El brechaId proviene de un Focus en AttentionRanking.active (FocusOrigin.kind==='brecha') que C3 produjo;
 * la fuente de verdad de la brecha es C1 (listGaps), no el foco efímero de C3.
 */
export async function diagnose(
  deps: DiagnoseDeps,
  input: { tenantId: UUID; brechaId: UUID },
): Promise<Diagnostico>
```

> **Por qué `brechaId` y no el `Focus` de C3.** C3 entrega *"un foco priorizado"* que es **proyección de lectura efímera** (C3 decisión gobernante 5). Acoplar G5 a la estructura `Focus`/`Salience`/`AttentionRanking` ataría DIAGNOSTICAR a la representación interna de G4. La brecha es una entidad **persistida** del MOV (D3); su identidad (`brechaId`) es el contrato estable C3→C4. La **pregunta de rol** que se posa directamente en G5 (MOTOR §3.1) entra por la misma firma con el `brechaId` interrogado.

### 4.5 Nota de lectura del grafo (contrato con C1, sin redefinirlo)

- **El recorrido es de C1.** `traverseUpstream(tenantId, fromNodeId, maxDepth)` devuelve `AristaMov[]` selladas (C1 L192, verificado). DIAGNOSTICAR **compone** la lectura en candidatas; **no** recorre el grafo en SQL.
- **`fromNodeId` es un NODO CAUSAL, no la entidad A1/D3.** MOV §2.2 distingue *"la carga del recurso R, no R"*. Cómo se obtiene el `nodoCausalId` del síntoma desde la `brecha` **no lo fija el canon** y C1 lo dejó abierto → `AQ-DIAG-NODO-CAUSAL` (hereda C1 `AQ-NODO-CAUSAL`, operativamente bloqueante).
- **`nivel_causal` y `condicion_falsacion` NO viven en la arista.** Verificado en disco: la arista `causal` lleva `attrs: fuerza/polaridad/direccion/masa` (C1 L466), mientras `nivel_causal` es **columna** de `mov_explicacion` (C1 L407) y `condicion_falsacion` vive en `relacion_causal.attrs` (C1 L413). Por tanto DIAGNOSTICAR debe **hidratar la entidad** con `getById` por cada arista (ver §8.1) → `AQ-DIAG-LECTURA-ENLACE-CAUSAL`.
- **Ciclos.** El grafo admite bucles de primera clase (MOV §2.2/§2.5). `maxDepth` acota la iteración; la detección/representación del bucle es de C1 → `AQ-DIAG-CICLOS` (hereda C1 `AQ-CICLOS-GRAFO`).

---

## 5. Contratos de entrada

```typescript
export async function diagnose(
  deps: DiagnoseDeps,
  input: { tenantId: UUID; brechaId: UUID },
): Promise<Diagnostico>
```

La entrada **no es una brecha cualquiera**: es el `brechaId` del **foco priorizado que ATENDER entregó** (G4→G5). `deps.role` es el rol consumidor cuyo costo-de-error contextualiza la accionabilidad y (aguas abajo, en G6) el umbral; DIAGNOSTICAR lo usa solo para el test de accionabilidad causa/restricción.

### 5.1 Precondiciones (las garantiza el llamante = el ritmo de juicio del Motor)

- **PRE-1 — Existe una brecha ATENDIDA (foco de C3).** `brechaId` corresponde a un `Focus.origin` con `kind:"brecha"` que C3 puso en `active` (C3 POST). DIAGNOSTICAR **no rankea salience** (eso es G4): consume el foco ya priorizado. Sin foco no hay disparo legítimo (Freno 1, MOTOR §8: event-driven).
- **PRE-2 — La brecha tiene referente.** La `brecha` (D3) referencia su `objetivo` (arista `referente`, `MOV.I-6`). Sin referente no es síntoma (no hay "distancia a lo debido") ⇒ **abstención** `brecha_sin_referente`, nunca diagnóstico.
- **PRE-3 — El grafo causal de C1 es legible.** `relacion_causal` (`mov_explicacion`) y `mov_arista` (relación `causal`) existen y se recorren con `traverseUpstream`. **DIAGNOSTICAR no puebla el grafo** → `AQ-DIAG-POBLADO-GRAFO` (operativamente bloqueante; con grafo vacío se abstiene `grafo_vacio`, degradación honesta alineada con MOV §2.1 R4).
- **PRE-4 — Política de plausibilidad presente.** `PlausibilityPolicyPort` provee orden de soporte y profundidad. Si falta ⇒ **abstención**/error `DIAG_NO_POLICY`; **nunca un umbral/profundidad hardcodeado** (MOTOR §9; regla dura 8; DIAG.INV-10).
- **PRE-5 — Solo lectura (estructural).** `DiagnoseDeps` no expone escritura de sustancia ni `traverseDownstream`: el tipo `Pick<…>` lo prohíbe por construcción (PRE estructural de DIAG.INV-7/-8/-9).
- **PRE-6 — Contexto de rol explícito.** `deps.role` declara `costoDeError` y `esferaDeAccion` (CONSTITUCION §8). Sin él no hay test de accionabilidad computable → `AQ-DIAG-CONTEXTO-ROL`.

### 5.2 Origen del disparo (combustible)

DIAGNOSTICAR **duerme por defecto** (Freno 1, event-driven). Corre **solo** cuando el ritmo de juicio del Motor recoge un `Focus.active` de C3 (G4→G5) o una **pregunta de rol** se posa directamente en G5 (MOTOR §3.1). **Qué del stack invoca `diagnose`** **no lo fija el canon** → `AQ-DIAG-DISPARO` (hereda `AQ-ATENDER-DISPARO`). Auto-invocarse violaría *"el Motor no se enciende a sí mismo"* (Freno 1).

### 5.3 Errores

| Error | Causa | Disposición |
|---|---|---|
| `DIAG_GAP_NOT_FOUND` | `brechaId` no resuelve a una `brecha` viva en `listGaps` (viola PRE-1) | rechazo: sin síntoma no hay disparo |
| `DIAG_NO_POLICY` | `PlausibilityPolicyPort` no provee orden/profundidad (viola PRE-4) | rechazo — nunca default hardcodeado (MOTOR §9) |
| `DIAG_EMPTY_ROLE_CONTEXT` | `deps.role` sin `costoDeError`/`esferaDeAccion` (viola PRE-6) | rechazo: sin rol no hay test de accionabilidad |
| `DIAG_FORBIDDEN` | sin `has_tenant_permission(tenant,'mov.read')` | rechazo (RLS de C1, errcode 42501) → `AQ-DIAG-PERMISOS` |

*(La brecha sin referente y el grafo sin causa fundamentable NO son errores: son **abstenciones** de primera clase, ver §6.)*

---

## 6. Contratos de salida

La salida máxima de DIAGNOSTICAR es `Diagnostico`: un **diagnóstico derrotable** (causas ordenadas por soporte) **o una abstención**. JUZGAR (G7) lo recogerá *después* para generar palancas **contra la causa, no contra el síntoma**. No es compromiso, no genera intervención, no se proyecta al rol, no calibra el grafo, no se escribe.

- **POST-1 — Causa fundamentada, jamás juicio.** Devuelve `{ kind:"diagnostico", causas, nodos, empatesDeclarados }` o `{ kind:"abstencion", abstencion }`. **Nunca** contiene `intervencion` (E3), `compromiso` (A2), opción, recomendación, score ni texto para el rol (G7/G8/G9).
- **POST-2 — Etiqueta epistémica obligatoria (INFERENCIA | HIPÓTESIS, jamás HECHO).** `estatus ∈ {INFERENCIA, HIPOTESIS}` (CONSTITUCION §4; MOV §2.1 R1). Una causa recuperada de un `episodio` entra como **HIPÓTESIS** y se confirma contra las `relacion_causal` vigentes (MOTOR §4 punto 1).
- **POST-3 — Cada causa es trazable a evidencia.** `CausaCandidata.procedencia` lista las observaciones raíz (B1) que sostienen su camino (`MOV.I-1`). **Si está vacía, la candidata se descarta antes de devolverla** (DIAG.INV-1).
- **POST-4 — Derrotabilidad explícita.** Cada `CausaCandidata` porta su `Falsador` (la `condicion_falsacion` del enlace, MOV §2.2 R5; Regla F MOTOR §6.2). Una candidata sin falsador **no se emite**.
- **POST-5 — Distinción síntoma/causa/restricción intacta.** El síntoma es la `brecha`; cada nodo aguas arriba se clasifica `causa` (corregible, accionable por el rol) o `restriccion` (∈ `listActiveConstraints`). **Una restricción NUNCA aparece en `causas`** (DIAG.INV-4): aparece en `nodos` con `papel:"restriccion"`. Confundirlas es *"el error operativo más caro"* (ARQUITECTURA §2.1).
- **POST-6 — Eslabón débil.** `confianza` (del diagnóstico y de cada candidata) = **MIN de los sellos de las aristas del camino**, computado por DIAGNOSTICAR con `applyWeakLink` (MOV §0.7, §2.2). `confianza_no_evaluada` en cualquier eslabón ⇒ `applyWeakLink` devuelve `{ abstain }` ⇒ se abstiene ese camino (`null` incomparable, no 0; MOV §5.2).
- **POST-7 — Orden por soporte, empates expuestos.** `causas` ordenadas por `policy.compareSupport`; incomparables/igual soporte se exponen en `empatesDeclarados` como **pluralidad viva** (MOTOR §6.3). **Nunca se colapsa a una sola antes de tiempo** (MOV §3.4).
- **POST-8 — Abstención fundamentada de primera clase.** Si no hay causa con falsador sobre nivel ≥ intervención, o el grafo no distingue causa de asociación, o un eslabón es no-evaluado, devuelve `{ kind:"abstencion" }` con `faltaObservacion` y `rescatariaSi` **sin inventar causa** (`MOV.I-7`; CONSTITUCION §4). *(El umbral por consecuencia que decide "suficiente para el stake" es G6, del consumidor → `AQ-DIAG-UMBRAL-ABSTENCION`.)*
- **POST-9 — Nada se promueve a HECHO; nada se calibra; nada se escribe.** La salida es lectura + clasificación + orden. DIAGNOSTICAR **no escribe** A/B/C/D/E, **no recomputa** la brecha (OSE), **no ajusta** confianza de ninguna `relacion_causal` (RECONCILIAR, MOTOR §10.4). El `Diagnostico` es **valor de retorno efímero**.
- **POST-10 — Traza (procedencia, no juicio).** `audit.append({ eventType:"diagnosticar.causa_inferida", actorType:"system", actorId:null, tenantId, subjectType:"mov_brecha", subjectId: brechaId, action:"diagnosticar.causa_inferida", requestId: deps.requestId, source:"diagnosticar-engine", metadata:{ rol, estatus, kind, esDisyuntiva } })` — **sin** confianza/score/ranking de candidatas en `metadata` (la durabilidad del juicio causal es de RECONCILIAR vía `episodio`, no de DIAGNOSTICAR). El `AuditEvent` y `append` están verificados en `modules/audit` en disco.

---

## 7. Invariantes (cada uno → guard de aplicación; ninguno redefine C1/C2/C3)

| Invariante (origen) | Enunciado verificable | Guard | Centinela |
|---|---|---|---|
| **DIAG.INV-1 — Fundamentación** (CONSTITUCION §4; `MOV.I-1`) | Toda `CausaCandidata` traza a ≥1 observación raíz; sin evidencia, se descarta antes de devolver | `procedencia.length === 0 ⇒ filtrada` | F-DG-4 |
| **DIAG.INV-2 — Etiqueta epistémica** (CONSTITUCION §4; MOV §2.1 R1) | `estatus ∈ {INFERENCIA, HIPOTESIS}`; un diagnóstico **jamás** es HECHO | el tipo `EstatusDiagnostico` no admite `"HECHO"` | F-DG-1 |
| **DIAG.INV-3 — Derrotabilidad** (MOV §2.2 R5; MOTOR §6.2 Regla F) | Toda candidata porta `Falsador`; sin él no se emite | candidata sin falsador ⇒ se descarta | F-DG-7 |
| **DIAG.INV-4 — Distinción síntoma/causa/restricción** (ARQUITECTURA §2.1; `MOV.I-3`, §2.4) | Una `restriccion` NUNCA aparece en `causas`; vive en `nodos` | clasificación por accionabilidad antes de ordenar | F-DG-10 |
| **DIAG.INV-5 — Eslabón débil** (MOV §0.7, §2.2) | `confianza` = MIN de sellos del camino (vía `applyWeakLink`); no-evaluado ⇒ abstención, no 0 | DIAGNOSTICAR compone el MIN; `{abstain}` ⇒ abstención | F-DG-5, F-DG-9 |
| **DIAG.INV-6 — Abstención de primera clase** (`MOV.I-7`, §5.2; CONSTITUCION §4) | Sin causa fundamentable ⇒ `{kind:"abstencion"}` con `faltaObservacion`; nunca inventa causa | rama abstención con motivo+falta+rescate | F-DG-6 |
| **DIAG.INV-7 — No juzga, no atiende, no articula** (frontera G4/G7/G8/G9) | La salida es causa candidata; jamás intervención/opción/ranking/texto | `DiagnoseDeps` no inyecta `traverseDownstream`; tope = `Diagnostico` | F-DG-2 |
| **DIAG.INV-8 — No calibra `relacion_causal` ni escribe MOV** (frontera RECONCILIAR/OSE/C1) | Cero escrituras; no `integrar`/`updateGapObservedSide`/`writeEpisode`/`writeDisjunctiveBelief` | `Deps` solo lecturas + auditoría | F-DG-3, F-DG-8 |
| **DIAG.INV-9 — Recorrido hacia atrás** (MOTOR §3.2 invariante (a); MOV §2.4) | Recorre `traverseUpstream`; nunca `traverseDownstream` | `Deps.causal` excluye `traverseDownstream` por `Pick` | F-DG-2 |
| **DIAG.INV-10 — Sin cuantificación en el dominio** (MOTOR §9; regla dura 8) | El dominio no contiene umbral/peso/profundidad mágicos; todo pasa por `PlausibilityPolicyPort` | grep al dominio: cero literales numéricos | F-DG-11 |
| **DIAG.INV-11 — No degradación de nivel** (MOV §2.3 R3; §2.4) | Una causa exige nivel ≥ `intervencion`; lo asociativo no es candidata | nodo de nivel `asociacion` ⇒ no entra a `causas` | F-DG-12 |

> **Criterio de fallo del componente.** Si DIAGNOSTICAR generara intervenciones o se comprometiera (JUZGAR), rankeara salience (ATENDER), redactara para el rol (ARTICULAR), ajustara la confianza de una `relacion_causal` o escribiera cualquier sustancia (RECONCILIAR/C1), promoviera un diagnóstico a HECHO, devolviera una causa sin evidencia o sin falsador, confundiera una restricción con una causa, o recorriera el grafo hacia adelante, dejaría de ser el acto de diagnosticar.

---

## 8. Modelo de datos (delta sobre C1)

### 8.0 Tesis del delta: DIAGNOSTICAR NO crea tablas — LEE el grafo de C1 y devuelve una inferencia efímera

> **Decisión gobernante (v1).** DIAGNOSTICAR **NO añade ninguna tabla, enum, RLS, CHECK ni columna a C1.** Lee `relacion_causal` (familia C, `mov_explicacion`), `episodio` (E1, `mov_dinamica`), `brecha`/`restriccion`/`objetivo` (familia D, `mov_normativa`), y recorre `mov_arista` (relación `causal`) HACIA ATRÁS vía `CausalGraphRepository.traverseUpstream`. **Su producto es un valor de retorno `Diagnostico`** (decisión gobernante 8). **No escribe en ninguna familia del MOV.**

#### Dónde se registra el diagnóstico (lo más fino del delta)

El canon describe DIAGNOSTICAR como **consulta** (ARQUITECTURA §6: *"son consultas a la estructura causal del Modelo; no son sustancias nuevas"*). En coherencia, esta spec **NO escribe el diagnóstico en el MOV**: lo devuelve. Existe una sede natural de persistencia — la `inferencia` (B2, `mov_creencia`, `attrs.forma='atribucion_causal'`, MOV §1.3 B2, verificado) — y la familia B **sí es escribible** por actos con su permiso (la prohibición `OSE.INV-6` es del OSE sobre C/D, C1 L279). **Pero el canon NO nombra quién persiste el diagnóstico para que JUZGAR lo recoja**, y describir el acto como consulta apunta a un valor de retorno. Por tanto:

> **`AQ-DIAG-PERSISTENCIA-INFERENCIA` (NO resuelta, NO construida).** ¿DIAGNOSTICAR escribe una `inferencia` B2 con su disyunción, o solo la devuelve? El canon describe el acto como consulta de lectura (ARQUITECTURA §6) y trata el foco análogo de C3 como proyección efímera (C3 decisión 5); pero JUZGAR (G7) consume el diagnóstico *después*, lo que sugiere algún hogar persistente cuando el razonamiento se preempta (G0.5). Esta spec adopta la lectura canon-fiel: **el `Diagnostico` se devuelve, no se escribe; `DiagnoseDeps` no inyecta `integrar` ni `writeDisjunctiveBelief`.** Si la operación demostrara que debe persistir, el dueño de escritura y la sede (B2 vs hogar de deuda viva) no los fija el canon. (Hereda `AQ-DIAG-HOGAR-DIAGNOSTICO` y C3 `AQ-ATENDER-HOGAR-FOCO`.)

> **`AQ-DIAG-AUTORIA-CAUSAS-CANDIDATAS` (NO resuelta).** El atributo `causas_candidatas` de la `brecha` (D3) son, en C1, **aristas `causal` cuyo destino es la brecha** (C1 L426 literal: *"causas → aristas 'causal'"*). El canon NO nombra qué acto es dueño de escritura de esas aristas: `OSE.INV-9` solo recomputa el lado observado de la brecha (`updateGapObservedSide`: `magnitud`, `tendencia`); `OSE.INV-6` prohíbe al OSE escribir C/D; C1 abre la escritura de C/D solo a *"RECONCILIAR con su propio permiso"*, **sin nombrar a DIAGNOSTICAR**. Mientras no se conceda ese grant, DIAGNOSTICAR **solo lee** las aristas `causal`; **no las crea ni puebla**.

### 8.1 Qué LEE de C1/C3 (verificado en disco) — y la corrección de dos miscitaciones

| Necesidad de DIAGNOSTICAR | Pieza de C1/C3 (reuso, NO redefinición) | Cita (verificada) |
|---|---|---|
| Recibir la brecha ATENDIDA (el foco) | `Focus.origin = { kind:"brecha", entity }` de `rankAttention` (C3) | C3 `focus.ts` → tipos `FocusOrigin` / `Focus` (por nombre) |
| Recorrer el grafo causal **HACIA ATRÁS** | `CausalGraphRepository.traverseUpstream(tenantId, fromNodeId, maxDepth): Promise<AristaMov[]>` | C1 L192 |
| **Hidratar el enlace** para leer su `nivel_causal` | `MovRepository.getById` sobre la `relacion_causal` (`nivel_causal` es **columna** de `mov_explicacion`, fuera de `attrs`) | C1 L407 (columna); `getById` C1 L156 → `AQ-DIAG-LECTURA-ENLACE-CAUSAL` |
| **Hidratar el enlace** para leer su falsador | `relacion_causal.attrs.condicion_falsacion` (vía `getById`) | C1 L413 |
| Resolver la brecha y su referente | `NormativeRepository.listGaps`; `listByAnchor` (arista `referente`) | C1 L199; `MOV.I-6` |
| Restricciones ya modeladas (clasificar `restriccion`) | `NormativeRepository.listActiveConstraints` | C1; MOV §4, §5, §2.4 |
| Reconocimiento de patrón (acortar el recorrido) | `DynamicsRepository.listEpisodesBySignature` | C1 L210; MOTOR §4 Punto 1 |
| Componer confianza por eslabón débil | `applyWeakLink` (`modules/mov/domain/weak-link.ts`) | C1 L580-600; MOV §0.7 |
| Reloj/correlación (determinismo) | `knowledgeNowMs` + `requestId` inyectados | patrón `ScanDeps` (verificado en `scan-overdue-work-orders.ts`) |
| Traza/procedencia | `AuditRepository.append` sobre `audit_events.metadata` | `audit-repository.ts` (verificado) |

**Corrección 1 (`AQ-DIAG-CONFIANZA-AGREGADA`, antes miscitada).** El **puerto público** `traverseUpstream` devuelve `Promise<AristaMov[]>` **crudo, sin `confianzaAgregada`** (verificado, C1 L192). La forma `{ path, confianzaAgregada = min de sellos }` pertenece a `traverseCausal`, **pseudocódigo ilustrativo INTERNO de C1** (C1 L670-672), NO al puerto inyectado. Por tanto **DIAGNOSTICAR compone el MIN él mismo** desde `AristaMov[].confianza` reusando `applyWeakLink` (que trata `confianza_no_evaluada` como `{ abstain }`, no 0). NUNCA se afirma que C1 lo agrega.

**Corrección 2 (`AQ-DIAG-LECTURA-ENLACE-CAUSAL`, gap nuevo registrado).** `nivel_causal` y `condicion_falsacion` **NO viven en la arista**: la arista `causal` lleva `attrs: fuerza/polaridad/direccion/masa` (C1 L466). `nivel_causal` es **columna** de la entidad `relacion_causal` (`mov_explicacion`, C1 L407) y `condicion_falsacion` vive en `relacion_causal.attrs` (C1 L413). Como `traverseUpstream` devuelve aristas, **DIAGNOSTICAR debe hidratar la entidad** `relacion_causal` con `getById` para leer nivel y falsador. C1 no expone un puerto explícito arista→relacion_causal; el mapeo (¿la arista referencia el `id` de la `relacion_causal`, o se resuelve por `origenId`/`destinoId`?) **no lo fija el canon** → registrado como AQ. **NO se extiende C1** (regla dura 2). Hasta resolverlo, el filtro por nivel (RD-3) y la derrotabilidad (RD-6) leen de un lugar que el puerto quizá no provee directamente.

### 8.2 Frontera de escritura (espejo del corte fino del OSE/ATENDER)

| Excluido de DIAGNOSTICAR | Acto dueño | Materialización del límite |
|---|---|---|
| Generar `intervencion`; proyectar HACIA ADELANTE; comprometerse | **JUZGAR** (G7/G8) | `DiagnoseDeps` **nunca** inyecta `traverseDownstream`; **nunca** escribe `intervencion`/`compromiso`. |
| Rankear salience; asignar foco | **ATENDER** (G4) | DIAGNOSTICAR **consume** el `brechaId`; no inyecta `SaliencePolicyPort`. |
| Proyectar al rol | **ARTICULAR** (G9) | no produce texto ni pantalla. |
| **CALIBRAR** confianza causal; escribir `episodio`; reclasificar papel post-outcome | **RECONCILIAR** (MOTOR §10.4) | **nunca** escribe C ni `episodio`; solo LEE. |
| Medir sorpresa; integrar; emitir `perturbacion`; recomputar lado observado | **OSE** (C2) | no llama `perceiveSignal`/`writePerturbation`/`updateGapObservedSide`. |
| Persistir el modelo / escribir cualquier familia | **C1 / autoría sin dueño** | `DiagnoseDeps` no inyecta `integrar` ni `writeDisjunctiveBelief` (decisión 8). |

---

## 9. Flujo interno (G5 — recorrido causal hacia atrás, gated por evidencia)

DIAGNOSTICAR es orquestación pura sobre los puertos de lectura de C1, idéntico en forma a `scanTenantOverdue`/`rankAttention`. **No tiene impulsor interno** (Freno 1): corre solo cuando el ritmo de juicio le entrega un foco.

```
   FOCO (brechaId) que el ritmo de juicio recoge de AttentionRanking.active de C3   ── MOTOR (G4 → G5)
        │  (o pregunta de rol que se posa en G5, MOTOR §3.1)
        ▼
 [1] CARGAR EL SÍNTOMA  normative.listGaps ∋ brechaId  (PRE-1)
        confirmar referente: mov.listByAnchor(brechaId, ["objetivo"]) no vacío  (PRE-2, MOV.I-6)
        sin referente ⇒ ABSTENCIÓN motivo:"brecha_sin_referente"
        │
 [2] (CONDICIONAL) MEMORIA — Punto 1 (MOTOR §4): solo si sorpresa alta / camino opaco:
        dynamics.listEpisodesBySignature(firma) → causa pasada como HIPÓTESIS; la memoria sugiere, el grafo confirma.
        (firma → AQ-DIAG-FIRMA-EPISODIO; sorpresa en el foco → AQ-DIAG-SORPRESA-EN-FOCO)
        │
 [3] PROFUNDIDAD  depth ← policy.maxUpstreamDepth(tenantId, role)   (NO hardcodeada; DIAG.INV-10)
        │
 [4] RECORRER HACIA ATRÁS  causal.traverseUpstream(tenantId, brechaNodeId, depth): AristaMov[]   (MOTOR G5, inv (a))
        (brechaNodeId desde la brecha → AQ-DIAG-NODO-CAUSAL; ciclos acotados por depth → AQ-DIAG-CICLOS)
        │
 [5] POR CADA ARISTA 'causal' → HIDRATAR el enlace y CLASIFICAR:
        rel ← mov.getById(tenantId, <relacion_causal de la arista>)   (lee nivel_causal + condicion_falsacion; §8.1, AQ-DIAG-LECTURA-ENLACE-CAUSAL)
        nivel < intervencion (asociación) → correlato sospechoso, NO causa (MOV §2.3; DIAG.INV-11) → nodo, no candidata
        confusor declarado → descartar (MOV §2.2; AQ-DIAG-DETECCION-CONFUSOR)
        accionable por el rol → papel 'causa'    (corregible)
        ∈ listActiveConstraints / no accionable → papel 'restriccion'  (gestionable; nunca a `causas`, DIAG.INV-4)
        EXIGIR falsador (condicion_falsacion); sin él ⇒ no admisible (Regla F; DIAG.INV-3)
        EXIGIR procedencia (rootObservationIds); vacía ⇒ descartar (DIAG.INV-1)
        │
 [6] CONFIANZA POR ESLABÓN DÉBIL  applyWeakLink(declared, premisas del camino)   (MOV §0.7; DIAG.INV-5)
        { abstain:"PREMISA_NO_EVALUADA" } ⇒ ABSTENCIÓN motivo:"premisa_no_evaluada"  (incomparable, no 0; MOV §5.2)
        │
 [7] ORDENAR POR SOPORTE  policy.compareSupport; incomparables/igual ⇒ empatesDeclarados (pluralidad viva, MOTOR §6.3)
        │
 [8] ¿HAY ALGUNA CAUSA FUNDAMENTABLE (nivel ≥ intervencion, con falsador y procedencia)?
        NO ⇒ ABSTENCIÓN { motivo: "grafo_vacio" | "sin_causa_sobre_umbral_de_nivel" | "grafo_no_distingue_causa",
                          faltaObservacion, rescatariaSi }   (MOV.I-7; NO se rellena el grafo, R4)
        SÍ ⇒ DIAGNÓSTICO DERROTABLE { kind:"diagnostico", causas, nodos, empatesDeclarados,
                          estatus, confianza=MIN del mejor camino, esDisyuntiva }
        │
 [9] TRAZA  audit.append('diagnosticar.causa_inferida')  — sin score/confianza en metadata
        │
        └──► JUZGAR (G7, FUERA de DIAGNOSTICAR) recoge el diagnóstico; G6 decide suficiencia por consecuencia;
             JUZGAR proyecta HACIA ADELANTE contra la CAUSA (NO el síntoma)
```

**Invariantes del flujo:** la salida es valor de retorno, NO escritura en `mov_*`; DIAGNOSTICAR nunca llama `integrar`/`updateGapObservedSide`/`writeEpisode`/`writeDisjunctiveBelief`/`traverseDownstream`; la confianza nunca excede el MIN del camino (computado vía `applyWeakLink`); lo asociativo nunca entra a `causas`; ninguna causa sin falsador ni procedencia sobrevive al paso [5]; la abstención es salida de primera clase.

---

## 10. Pseudocódigo

> **Placeholders AQ-gated (honestidad — el pseudocódigo NO compila tal cual; es ilustrativo).** Tres símbolos NO están resueltos por el canon y aparecen como **funciones-marcador**, no como código definible hoy: `relacionCausalIdDe(arista)` (mapeo arista→`relacion_causal`, `AQ-DIAG-LECTURA-ENLACE-CAUSAL`), `nivelCausalDe(rel)` (accesor a la **columna** `nivel_causal`, mismo AQ) y `esAccionablePorRol(role, nodoId)` (predicado de accionabilidad, `AQ-DIAG-ACCIONABILIDAD-ROL`). Mientras esas AQ no se resuelvan, estas tres llamadas son **TODO declarados**, no integraciones reales — coherente con CA-10 ("esqueleto con puertos mockeados, NO operable end-to-end"). No se inventan sus cuerpos.

### 10.1 `classifyRole` — síntoma / causa / restricción (función pura)

```typescript
// modules/diagnosticar/domain/classify-role.ts
import type { PapelCausal, NivelCausal } from "./diagnostico"

/**
 * MOV §2.4: nivel ≥ intervencion (lo asociativo NO es causa) → accionabilidad por rol (accionable=causa;
 * no accionable / ya modelado como restricción = restriccion) → descartar confusores. La POSICIÓN la da el grafo;
 * el TEST de accionabilidad lo da la Dimensión de Restricciones (listActiveConstraints). NO se re-deriva accionabilidad.
 * Función PURA: NO recorre el grafo, NO calibra, NO juzga. El predicado de accionabilidad → AQ-DIAG-ACCIONABILIDAD-ROL.
 */
export function classifyRole(
  nodoId: string,
  nivel: NivelCausal,
  activeConstraintIds: ReadonlySet<string>,  // restricciones YA modeladas (listActiveConstraints)
  esAccionablePorRol: boolean,               // predicado de accionabilidad por rol (AQ-DIAG-ACCIONABILIDAD-ROL)
  isConfusor: boolean,                        // confusor declarado (MOV §2.2; AQ-DIAG-DETECCION-CONFUSOR)
): PapelCausal | "DESCARTADO" {
  if (isConfusor) return "DESCARTADO"                     // asociación espuria (MOV §2.2)
  if (nivel === "asociacion") return "sintoma"            // correlato sospechoso, NO causa (MOV §2.3; DIAG.INV-11)
  if (activeConstraintIds.has(nodoId) || !esAccionablePorRol) return "restriccion" // límite estructural (MOV §2.4, §5)
  return "causa"                                          // origen corregible aguas arriba accionable por el rol
}
```

### 10.2 `abduceUpstream` — abducción / recorrido hacia atrás (orquestación)

```typescript
// modules/diagnosticar/application/use-cases/abduce.ts (orquesta lecturas; el recorrido lo hace el puerto de C1)
import type { DiagnoseDeps } from "./deps"
import type { CausaCandidata, NodoClasificado, NivelCausal } from "@/modules/diagnosticar/domain/diagnostico"
import { classifyRole } from "@/modules/diagnosticar/domain/classify-role"
import type { UUID } from "@/types/shared"

/**
 * Recorre el grafo causal HACIA ATRÁS desde el síntoma y devuelve { candidatas, nodos }. NO puntúa plausibilidad
 * (eso es policy.compareSupport), NO decide suficiencia (eso es G6/JUZGAR), NO escribe nada, NO calibra.
 */
export async function abduceUpstream(
  deps: DiagnoseDeps, tenantId: UUID, brechaNodeId: UUID, depth: number,
  activeConstraintIds: ReadonlySet<string>,
): Promise<{ candidatas: CausaCandidata[]; nodos: NodoClasificado[] }> {
  // 1) recorrido HACIA ATRÁS — la única llamada al grafo causal (MOTOR §3.2 inv (a)); depth = freno anti-bucle
  const aristas = await deps.causal.traverseUpstream(tenantId, brechaNodeId, depth) // AristaMov[] CRUDO (sin confianzaAgregada, §8.1)
  const candidatas: CausaCandidata[] = []
  const nodos: NodoClasificado[] = []
  for (const arista of aristas) {                          // cada arista 'causal' viene sellada (MOV.I-0)
    // HIDRATAR el enlace: nivel_causal y condicion_falsacion viven en la ENTIDAD relacion_causal, no en la arista (§8.1)
    const rel = await deps.mov.getById(tenantId, relacionCausalIdDe(arista)) // mapeo arista→relacion_causal → AQ-DIAG-LECTURA-ENLACE-CAUSAL
    if (!rel) continue
    const nivel = nivelCausalDe(rel) ?? "asociacion"    // AQ-DIAG-LECTURA-ENLACE-CAUSAL: nivel_causal es COLUMNA de mov_explicacion (C1 L407), NO attrs; el accesor exacto en EntidadMov<TAttrs> NO lo fija C1
    const nodoId = arista.origenId
    const papel = classifyRole(
      nodoId, nivel, activeConstraintIds,
      esAccionablePorRol(deps.role, nodoId),               // AQ-DIAG-ACCIONABILIDAD-ROL
      rel.attrs.confusor === true,                         // AQ-DIAG-DETECCION-CONFUSOR
    )
    if (papel === "DESCARTADO") continue                   // confusor: no contamina el diagnóstico
    nodos.push({ nodoId, papel })
    if (papel !== "causa") continue                        // restriccion/sintoma no entran a candidatas (DIAG.INV-4/11)
    const falsacion = rel.attrs.condicion_falsacion as { refutaSi: string; confirmaSi: string } | undefined
    if (!falsacion) continue                               // sin falsador ⇒ dogma, inadmisible (Regla F; DIAG.INV-3)
    const procedencia = rel.sello.procedencia.rootObservationIds
    if (procedencia.length === 0) continue                 // sin evidencia ⇒ no es causa (DIAG.INV-1)
    candidatas.push({
      nodoCausalId: nodoId, papel: "causa", nivelMin: nivel,
      camino: [arista], estatus: nivel === "contrafactual" ? "INFERENCIA" : "HIPOTESIS",
      confianza: arista.confianza,                         // se reagrega por eslabón débil en diagnose (applyWeakLink)
      falsador: { refutaSi: falsacion.refutaSi, confirmaSi: falsacion.confirmaSi, relacionCausalId: rel.id },
      viaMemoria: false, procedencia,
    })
  }
  return { candidatas, nodos }
}
```

### 10.3 `diagnose` — el gate de diagnóstico (caso de uso)

```typescript
// modules/diagnosticar/application/use-cases/diagnose.ts
import type { DiagnoseDeps } from "./deps"
import type { Diagnostico, EmpateDeclarado } from "@/modules/diagnosticar/domain/diagnostico"
import { abduceUpstream } from "./abduce"
import { applyWeakLink } from "@/modules/mov/domain/weak-link"  // C1 L580 — reuso, NO redefinición
import type { UUID } from "@/types/shared"

export async function diagnose(
  deps: DiagnoseDeps,
  input: { tenantId: UUID; brechaId: UUID },
): Promise<Diagnostico> {
  const { tenantId, brechaId } = input
  const base = { tenantId, brechaId, requestId: deps.requestId }

  // PRE-1: la brecha está viva (foco de C3)
  const gaps = await deps.normative.listGaps(tenantId)
  const brecha = gaps.find(g => g.id === brechaId)
  if (!brecha) throw diagnoseError("DIAG_GAP_NOT_FOUND")

  // PRE-2: la brecha es SÍNTOMA — tiene referente (MOV.I-6)
  const referente = await deps.mov.listByAnchor(tenantId, brechaId, ["objetivo"])
  if (referente.length === 0)
    return { kind: "abstencion", ...base, abstencion: {
      motivo: "brecha_sin_referente", faltaObservacion: "objetivo de referencia de la brecha",
      rescatariaSi: "declarar el objetivo (deber-ser) de la brecha" } }

  // restricciones YA modeladas → clasificar 'restriccion' sin re-derivar (MOV §2.4)
  const constraints = await deps.normative.listActiveConstraints(tenantId)
  const activeConstraintIds = new Set(constraints.map(c => c.id))

  // profundidad: LEÍDA del puerto, NUNCA hardcodeada (DIAG.INV-10; AQ-DIAG-PROFUNDIDAD)
  const depth = await deps.policy.maxUpstreamDepth(tenantId, deps.role)

  // RECORRIDO HACIA ATRÁS + clasificación + derrotabilidad + fundamentación
  const { candidatas, nodos } = await abduceUpstream(deps, tenantId, brecha.id, depth, activeConstraintIds)

  if (candidatas.length === 0)
    return { kind: "abstencion", ...base, abstencion: {
      motivo: nodos.some(n => n.papel === "sintoma") ? "sin_causa_sobre_umbral_de_nivel" : "grafo_vacio",
      faltaObservacion: "enlace causal (nivel ≥ intervencion) con falsador y evidencia hacia el síntoma",
      rescatariaSi: "poblar la relacion_causal (la crea RECONCILIAR/gobierno, no DIAGNOSTICAR — AQ-DIAG-POBLADO-GRAFO)" } }

  // ORDENAR POR SOPORTE (relación de orden; incomparables ⇒ empate)
  const empatesDeclarados: EmpateDeclarado[] = []
  const ranked = [...candidatas]
  // ordenamiento estable por compareSupport; null ⇒ empate declarado, NO orden fabricado (MOV §5.2)
  for (let i = 0; i < ranked.length; i++)
    for (let j = i + 1; j < ranked.length; j++) {
      const cmp = await deps.policy.compareSupport(tenantId, ranked[i], ranked[j])
      if (cmp === null || cmp === 0) empatesDeclarados.push([ranked[i].nodoCausalId, ranked[j].nodoCausalId])
      if (cmp === -1) { const t = ranked[i]; ranked[i] = ranked[j]; ranked[j] = t }
    }
  const best = ranked[0]

  // CONFIANZA POR ESLABÓN DÉBIL — computada AQUÍ (el puerto no la agrega, §8.1)
  const linked = applyWeakLink(
    { estatus: best.estatus, confianza: best.confianza, frescura: 1 },
    best.camino.map(a => ({
      estatus: "INFERENCIA", confianza: a.confianza,
      confianzaNoEvaluada: a.confianza === null, frescura: 1,
    })),
  )
  if ("abstain" in linked)                                 // premisa no evaluada ⇒ incomparable, no 0 (MOV §5.2)
    return { kind: "abstencion", ...base, abstencion: {
      motivo: "premisa_no_evaluada", faltaObservacion: "confianza no evaluada en un eslabón del camino",
      rescatariaSi: "calibrar el enlace (RECONCILIAR, post-outcome)" } }

  const esDisyuntiva = empatesDeclarados.length > 0
  await deps.audit.append({
    eventType: "diagnosticar.causa_inferida", actorType: "system", actorId: null, tenantId,
    subjectType: "mov_brecha", subjectId: brechaId, action: "diagnosticar.causa_inferida",
    requestId: deps.requestId, source: "diagnosticar-engine",
    metadata: { rol: deps.role.rol, estatus: linked.estatus, kind: "diagnostico", esDisyuntiva }, // SIN score/confianza
  })

  return {
    kind: "diagnostico", tenantId, brechaId, estatus: linked.estatus,
    causas: ranked, nodos, empatesDeclarados, confianza: linked.confianza, esDisyuntiva, requestId: deps.requestId,
  }
}
```

> **Por qué esto es G5 fiel y no JUZGAR.** (a) recorre **solo** hacia atrás (`traverseUpstream`); (b) clasifica los tres papeles; (c) exige `condicion_falsacion` por eslabón (Regla F); (d) ordena por soporte como **relación de orden**, no escalar, con empates declarados; (e) **se abstiene** por ausencia de causa fundamentable o premisa no evaluada; (f) emite un **`Diagnostico` derrotable** como valor de retorno, nunca una `intervencion` ni recomendación; (g) **no escribe sustancia** ni toca `relacion_causal`/`episodio` (no calibra). Termina donde G6→G7 entrega el control a JUZGAR. El umbral por consecuencia (G6) es del consumidor.

### 10.4 Quién POBLA las `relacion_causal` — Architectural Question

> **`AQ-DIAG-POBLADO-GRAFO` (NO resuelto).** DIAGNOSTICAR **LEE** `relacion_causal` hacia atrás, pero el canon **NO nombra qué acto las CREA/PUEBLA**. C1 abre la familia C a *"RECONCILIAR con su propio permiso"* (calibra confianza post-outcome, MOTOR §10.4 punto 1 — verificado: cambia *"cuatro cosas, solo cuatro"*, y **crear un enlace no está entre ellas**; §10.5: *"abrir el catálogo es acto de gobierno, fuera del bucle automático"*). **Ningún componente de ingeniería tiene asignada la creación inicial de `relacion_causal`.** Con grafo vacío, DIAGNOSTICAR **se abstiene** (`grafo_vacio`) — degradación honesta, alineada con MOV §2.1 R4 (*"no se rellena el grafo por completitud"*). **NO se resuelve aquí.**

---

## 11. Pruebas unitarias (vitest `environment:node`, mockeando los puertos de C1)

> **Naturaleza.** Verifican que `diagnose` (orquestación pura) ejerce DIAGNOSTICAR según ARQUITECTURA §3 acto 4 y MOTOR G5. **Mockean los puertos de C1 que DIAGNOSTICAR LEE** —`traverseUpstream` (recorrido hacia atrás), `getById` (hidratar el enlace), `listGaps`/`listActiveConstraints`/`listByAnchor`, `listEpisodesBySignature`— y `PlausibilityPolicyPort` (cuantificación calibrable). `setup` es síncrona. El mock de `CausalGraphRepository` expone **solo** `traverseUpstream` (no hay `traverseDownstream` en `DiagnoseDeps`). Los dobles de escritura del MOV **no existen en `DiagnoseDeps`** (decisión 8): su ausencia estructural se verifica por tipo, no por contador. **Ningún umbral/peso/profundidad se hardcodea en el dominio** (DIAG.INV-10): la profundidad viene de `policy.maxUpstreamDepth`.

```ts
// modules/diagnosticar/application/use-cases/diagnose.test.ts
import { describe, expect, it, vi } from "vitest"
const TENANT = "11111111-1111-1111-1111-111111111111"
const GAP    = "99999999-9999-9999-9999-999999999999"   // la brecha ATENDIDA (foco de C3), síntoma raíz
const CAUSE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"  // candidata, nivel ≥ intervencion
const CAUSE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"  // candidata rival
const ASSOC   = "cccccccc-cccc-cccc-cccc-cccccccccccc"  // nivel 'asociacion' (correlato sospechoso)
const LIMIT   = "dddddddd-dddd-dddd-dddd-dddddddddddd"  // restricción no accionable por el rol
const OBJ     = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"  // objetivo referente de la brecha
const SUPERVISOR = "supervisor"

function setup(opts: {
  aristas?: any[]; relById?: Record<string, any>; gaps?: any[]; constraints?: any[];
  referente?: any[]; episodes?: any[]; policy?: any; role?: any
}) {
  const traverseUpstream = vi.fn().mockResolvedValue(opts.aristas ?? [])
  const getById = vi.fn(async (_t: string, id: string) => opts.relById?.[id] ?? null)
  const listByAnchor = vi.fn().mockResolvedValue(opts.referente ?? [{ id: OBJ }])
  const listGaps = vi.fn().mockResolvedValue(opts.gaps ?? [{ id: GAP }])
  const listActiveConstraints = vi.fn().mockResolvedValue(opts.constraints ?? [])
  const listEpisodesBySignature = vi.fn().mockResolvedValue(opts.episodes ?? [])
  const policy = {
    compareSupport: vi.fn(async (_t, a, b) => (a.nodoCausalId === CAUSE_A ? 1 : -1)),
    maxUpstreamDepth: vi.fn(async () => 8), // el NÚMERO vive en el puerto/mock, NUNCA en el dominio (DIAG.INV-10)
    ...opts.policy,
  }
  const deps = {
    causal: { traverseUpstream },
    normative: { listGaps, listActiveConstraints, listActiveObjectives: vi.fn() },
    mov: { getById, listByAnchor },
    dynamics: { listEpisodesBySignature },
    policy,
    role: opts.role ?? { rol: SUPERVISOR, esferaDeAccion: ["zona", "capacidad"], horizonte: "semanas", costoDeError: "alto" },
    audit: { append: vi.fn() },
    knowledgeNowMs: Date.parse("2026-06-29T00:00:00Z"),
    requestId: "44444444-4444-4444-4444-444444444444",
  } as any
  return { deps, traverseUpstream, getById, policy }
}
```

| # | Propiedad verificada | Ancla canónica (por nombre) | Assert |
|---|---|---|---|
| **U-1** | causa bien soportada ⇒ candidata top | MOV §2.4/§2.5; MOTOR G5 | `r.kind==="diagnostico"`; `r.causas[0].nodoCausalId===CAUSE_A`; `papel==="causa"` |
| **U-2** | recorre HACIA ATRÁS, nunca adelante | MOTOR §3.2 inv (a) | `traverseUpstream` llamado con `(TENANT, GAP, expect.any(Number))`; `DiagnoseDeps` no tiene `traverseDownstream` |
| **U-3** | restricción → `nodos` con `papel:"restriccion"`, nunca `causas` | MOV §0.3/§2.4; ARQUITECTURA §2.1 | `r.nodos.find(n=>n.nodoId===LIMIT)?.papel==="restriccion"`; `r.causas.find(c=>c.nodoCausalId===LIMIT)` undefined |
| **U-4** | nodo `asociacion` no es candidata | MOV §2.3/§2.4 | `ASSOC` no en `r.causas`; aparece en `r.nodos` con `papel:"sintoma"` |
| **U-5** | evidencia insuficiente ⇒ ABSTENCIÓN con qué-falta | MOV §2.6/§5.2; `MOV.I-7` | `r.kind==="abstencion"`; `r.abstencion.faltaObservacion` no vacío; (no hay `causas`) |
| **U-6** | dos rivales ⇒ ambas vivas, ordenadas, disyuntiva | MOV §5.2; MOTOR §6.3 | `r.causas.length===2`; `r.esDisyuntiva===true`; `r.empatesDeclarados.length>0` |
| **U-7** | derrotable: porta su falsador | MOV §2.1 R5; MOTOR §6.2 | `r.causas[0].falsador.refutaSi` no vacío; `falsador.relacionCausalId` presente |
| **U-8** | confianza = MIN del camino (eslabón débil), computado por DIAGNOSTICAR | MOV §0.7, §2.2 | con sellos 0.9/0.4 ⇒ `r.confianza<=0.4` |
| **U-9** | nada a HECHO | MOV §2.1 R1 | `r.causas.every(c=>c.estatus!=="HECHO")` (el tipo no admite "HECHO") |
| **U-10** | brecha sin referente ⇒ abstención | `MOV.I-6`; PRE-2 | `listByAnchor`→[] ⇒ `r.kind==="abstencion"`, `motivo==="brecha_sin_referente"` |
| **U-11** | confianza_no_evaluada ⇒ abstención (no 0) | MOV §5.2; §0.7 | arista `confianza:null` ⇒ `r.kind==="abstencion"`, `motivo==="premisa_no_evaluada"` |
| **U-12** | la profundidad sale del puerto, no del dominio | MOTOR §9; DIAG.INV-10 | `policy.maxUpstreamDepth` llamado; ningún literal en `abduce`/`diagnose` |

```ts
it("U-1: causa aguas arriba bien soportada es la candidata top (MOV §2.4/§2.5; MOTOR G5)", async () => {
  const REL = "rel-a"
  const { deps, traverseUpstream } = setup({
    aristas: [arista({ destino: GAP, origen: CAUSE_A, relId: REL, confianza: 0.82 })],
    relById: { [REL]: relacionCausal({ id: REL, nivel: "intervencion", confianza: 0.82,
      condicionFalsacion: { refutaSi: "si X y persiste", confirmaSi: "si X y desaparece" }, rootObs: ["obs-1"] }) },
  })
  const r = await diagnose(deps, { tenantId: TENANT, brechaId: GAP })
  expect(traverseUpstream).toHaveBeenCalledWith(TENANT, GAP, expect.any(Number))
  expect(r.kind).toBe("diagnostico")
  if (r.kind === "diagnostico") { expect(r.causas[0].nodoCausalId).toBe(CAUSE_A); expect(r.causas[0].papel).toBe("causa") }
})

it("U-3: una restricción se etiqueta 'restriccion', nunca aparece en causas (MOV §0.3/§2.4)", async () => {
  const REL = "rel-l"
  const r = await diagnose(setup({
    aristas: [arista({ destino: GAP, origen: LIMIT, relId: REL, confianza: 0.9 })],
    relById: { [REL]: relacionCausal({ id: REL, nivel: "intervencion", confianza: 0.9,
      condicionFalsacion: { refutaSi: "...", confirmaSi: "..." }, rootObs: ["obs-1"] }) },
    constraints: [{ id: LIMIT, modalidad: "dura" }], // ya modelada como restricción
  }).deps, { tenantId: TENANT, brechaId: GAP })
  if (r.kind === "diagnostico") {
    expect(r.nodos.find(n => n.nodoId === LIMIT)?.papel).toBe("restriccion")
    expect(r.causas.find(c => c.nodoCausalId === LIMIT)).toBeUndefined()
  }
})

it("U-5: evidencia insuficiente ⇒ ABSTENCIÓN declarando qué falta (MOV §2.6/§5.2; I-7)", async () => {
  const REL = "rel-c"
  const r = await diagnose(setup({
    aristas: [arista({ destino: GAP, origen: ASSOC, relId: REL, confianza: 0.2 })],
    relById: { [REL]: relacionCausal({ id: REL, nivel: "asociacion", confianza: 0.2 }) }, // sin nivel suficiente
  }).deps, { tenantId: TENANT, brechaId: GAP })
  expect(r.kind).toBe("abstencion")
  if (r.kind === "abstencion") expect(r.abstencion.faltaObservacion).toBeTruthy()
})

it("U-11: confianza_no_evaluada ⇒ abstención, nunca 0 (MOV §5.2)", async () => {
  const REL = "rel-n"
  const r = await diagnose(setup({
    aristas: [arista({ destino: GAP, origen: CAUSE_A, relId: REL, confianza: null })], // no evaluada
    relById: { [REL]: relacionCausal({ id: REL, nivel: "intervencion", confianza: null,
      condicionFalsacion: { refutaSi: "...", confirmaSi: "..." }, rootObs: ["obs-1"] }) },
  }).deps, { tenantId: TENANT, brechaId: GAP })
  expect(r.kind).toBe("abstencion")
  if (r.kind === "abstencion") expect(r.abstencion.motivo).toBe("premisa_no_evaluada")
})
```

> El cuerpo de `compareSupport` y `maxUpstreamDepth` (mapear `fuerza/confianza/retardo/nivel_causal` al orden y a la profundidad) es **contenido calibrable** → `AQ-DIAG-PLAUSIBILIDAD` / `AQ-DIAG-PROFUNDIDAD`. La **forma** (trazar hacia atrás → filtrar nivel ≥ intervención → accionabilidad por rol → descartar confusores → abstención por defecto → derrotabilidad) es fija. **El dominio no contiene ni un peso ni un umbral ni una profundidad** (DIAG.INV-10).

---

## 12. Pruebas de falsación (DEBEN demostrar que el estado prohibido es INALCANZABLE por construcción)

> Cada prueba intenta llevar a DIAGNOSTICAR a un estado prohibido. El diseño es correcto solo si el estado es **estructuralmente imposible** (el tipo no lo permite, el puerto no está inyectado) o **rechazado** (abstención/error).

| # | Estado PROHIBIDO | Por qué (canon, por nombre) | Resultado exigido | Capa |
|---|---|---|---|---|
| **F-DG-1** | promueve una causa a **HECHO** | MOV §2.1 R1; §0.7; §0.3 | `r.causas.every(c=>c.estatus!=="HECHO")`; el tipo `EstatusDiagnostico` no admite `"HECHO"` | dominio |
| **F-DG-2** | produce intervención/recomendación o recorre hacia adelante | ARQUITECTURA §3 acto 5; MOTOR §3.2 inv (a) | **imposible por construcción**: `DiagnoseDeps.causal` es `Pick<…,"traverseUpstream">` (sin `traverseDownstream`); `Diagnostico` no tiene campo de intervención/recomendación/score | dominio (tipo) |
| **F-DG-3** | **CALIBRA** la confianza de una `relacion_causal` | RECONCILIAR (MOTOR §10.4 punto 1) | `DiagnoseDeps` no inyecta ninguna escritura de C; `PlausibilityPolicyPort` es solo lectura | dominio (tipo) |
| **F-DG-4** | emite una causa sin evidencia trazable | MOV §2.6 R4; §5.2; CONSTITUCION §4 | candidata con `procedencia.length===0` ⇒ descartada en `abduceUpstream`; sin candidata ⇒ abstención | dominio |
| **F-DG-5** | declara confianza > su premisa más débil | MOV §0.7, §2.2 | `r.confianza <= min(confianzas del camino)`; computado por `applyWeakLink` | dominio |
| **F-DG-6** | inventa causa de relleno bajo evidencia escasa | MOV §2.6 R4; `MOV.I-7` | sin enlace con falsador y nivel ≥ intervención ⇒ `{kind:"abstencion"}` con `faltaObservacion` | dominio |
| **F-DG-7** | emite una causa sin falsador (dogma) | MOV §2.1 R5; MOTOR §6.2 Regla F | candidata sin `condicion_falsacion` ⇒ descartada antes de devolver | dominio |
| **F-DG-8** | **escribe sustancia** del MOV (es consulta) | ARQUITECTURA §6; MOTOR §3.1 | `DiagnoseDeps` no expone `integrar`/`writeEpisode`/`updateGapObservedSide`/`writePerturbation`/`writeDisjunctiveBelief` | dominio (tipo) |
| **F-DG-9** | trata `confianza_no_evaluada` como 0 | MOV §5.2; §0.7 | arista `confianza:null` ⇒ `applyWeakLink` `{abstain}` ⇒ abstención `premisa_no_evaluada`, nunca rank 0 | dominio |
| **F-DG-10** | trata una RESTRICCIÓN como causa corregible | MOV §0.3/§2.4; ARQUITECTURA §2.1 | nodo ∈ `listActiveConstraints` / no accionable ⇒ `nodos` con `papel:"restriccion"`, fuera de `causas` | dominio |
| **F-DG-11** | inventa un número (umbral/peso/profundidad) | MOTOR §9; regla dura 8; DIAG.INV-10 | sin `policy` ⇒ rechazo `DIAG_NO_POLICY`; profundidad SIEMPRE de `policy.maxUpstreamDepth`; grep al dominio: cero literales | dominio |
| **F-DG-12** | promueve una HIPÓTESIS de memoria sin confirmarla contra el grafo | MOTOR §4 punto 1 | causa de `episodio` sin arista vigente que la soporte ⇒ no entra a `causas` | dominio |

```ts
it("F-DG-2: NO recorre hacia adelante ni produce intervención (eso es JUZGAR — ARQUITECTURA §3)", async () => {
  const REL = "rel-a"
  const { deps } = setup({
    aristas: [arista({ destino: GAP, origen: CAUSE_A, relId: REL, confianza: 0.8 })],
    relById: { [REL]: relacionCausal({ id: REL, nivel: "intervencion", confianza: 0.8,
      condicionFalsacion: { refutaSi: "...", confirmaSi: "..." }, rootObs: ["obs-1"] }) },
  })
  const r = await diagnose(deps, { tenantId: TENANT, brechaId: GAP })
  expect((deps.causal as any).traverseDownstream).toBeUndefined() // estructural: no está en DiagnoseDeps
  expect(r).not.toHaveProperty("intervencion"); expect(r).not.toHaveProperty("recomendacion")
})

it("F-DG-8: NO escribe sustancia del MOV (es consulta — ARQUITECTURA §6)", async () => {
  const { deps } = setup({ aristas: [] })
  await diagnose(deps, { tenantId: TENANT, brechaId: GAP })
  // estructural: ninguna escritura está en DiagnoseDeps
  expect((deps.mov as any).integrar).toBeUndefined()
  expect((deps.normative as any).updateGapObservedSide).toBeUndefined()
  expect((deps.dynamics as any).writeEpisode).toBeUndefined()
  expect((deps as any).belief).toBeUndefined()
})

it("F-DG-5: confianza NO excede la premisa más débil (MOV §0.7)", async () => {
  // camino A: dos aristas, la más débil = 0.4 ⇒ techo 0.4
  const R1 = "rel-1", R2 = "rel-2"
  const { deps } = setup({
    aristas: [
      arista({ destino: GAP, origen: "mediador", relId: R1, confianza: 0.9 }),
      arista({ destino: "mediador", origen: CAUSE_A, relId: R2, confianza: 0.4 }),
    ],
    relById: {
      [R1]: relacionCausal({ id: R1, nivel: "intervencion", confianza: 0.9, condicionFalsacion: { refutaSi:"x", confirmaSi:"y" }, rootObs:["o1"] }),
      [R2]: relacionCausal({ id: R2, nivel: "intervencion", confianza: 0.4, condicionFalsacion: { refutaSi:"x", confirmaSi:"y" }, rootObs:["o2"] }),
    },
  })
  const r = await diagnose(deps, { tenantId: TENANT, brechaId: GAP })
  if (r.kind === "diagnostico") expect(r.confianza ?? 1).toBeLessThanOrEqual(0.4)
})

it("F-DG-11: NO inventa profundidad/umbral — el número vive en el puerto (MOTOR §9, DIAG.INV-10)", async () => {
  const { deps, policy } = setup({ aristas: [] })
  await diagnose(deps, { tenantId: TENANT, brechaId: GAP })
  expect(policy.maxUpstreamDepth).toHaveBeenCalled()
  // centinela de CI: grep -RnE "[^a-zA-Z_][0-9]+" modules/diagnosticar/{domain,application} ⇒ cero literales de control
})
```

---

## 13. Criterios de aceptación

El acto DIAGNOSTICAR está **terminado** (a nivel de esta spec; sujeto a las AQ aguas arriba, en particular `AQ-DIAG-PRECONDICION-C1C3`, `AQ-DIAG-AUTORIA-BRECHA`, `AQ-DIAG-POBLADO-GRAFO` y `AQ-DIAG-NODO-CAUSAL`) solo si TODOS son verdaderos:

- **CA-1 — Recorrido HACIA ATRÁS, jamás hacia adelante.** `diagnose` invoca `traverseUpstream` y **nunca** `traverseDownstream` (ausente de `DiagnoseDeps`). U-2; F-DG-2. *(ARQUITECTURA §3 acto 4; MOTOR §3.2 inv (a).)*
- **CA-2 — Tres papeles correctamente ubicados.** Cada nodo se clasifica síntoma/causa/restricción (nivel ≥ intervención + accionabilidad + descarte de confusores); una restricción nunca aparece en `causas`; un nodo asociativo nunca es candidata. U-3, U-4; F-DG-10. *(MOV §0.3, §2.3, §2.4; ARQUITECTURA §2.1.)*
- **CA-3 — Abducción priorizada y derrotable.** Causa bien soportada ⇒ candidata top; rivales ⇒ ambas vivas con empates declarados; cada candidata porta su falsador. U-1, U-6, U-7. *(MOV §2.5, §5.2, §2.1 R5; MOTOR §6.2, §6.3.)*
- **CA-4 — Abstención de primera clase con qué-falta.** Sin causa fundamentable ⇒ `kind:"abstencion"` con `faltaObservacion`/`rescatariaSi`; no se rellena el grafo. U-5, U-10, U-11; F-DG-4, F-DG-6. *(MOV §2.6, §5.2; `MOV.I-7`; CONSTITUCION §4.)*
- **CA-5 — Etiqueta epistémica honesta, eslabón débil computado por DIAGNOSTICAR.** Ninguna candidata es HECHO; `confianza` = MIN del camino vía `applyWeakLink`; `confianza_no_evaluada` ⇒ abstención, no 0. U-8, U-9, U-11; F-DG-1, F-DG-5, F-DG-9. *(MOV §0.7, §2.1 R1, §5.2.)*
- **CA-6 — Frontera de no-juicio / no-calibración / no-atención / no-escritura intacta.** Cero escrituras de sustancia (no están en `DiagnoseDeps`); sin intervención/recomendación/proyección; sin calibrar `relacion_causal`; sin rankear salience; recibe el `brechaId` ya dado por C3. F-DG-2, F-DG-3, F-DG-8. *(ARQUITECTURA §3 actos 3/5/7, §6; MOTOR §3.1, §10.4.)*
- **CA-7 — Memoria solo cuando hay razón, subordinada al grafo.** `listEpisodesBySignature` solo ante sorpresa alta o camino opaco; causa de memoria sin arista vigente que la soporte no entra a `causas`. F-DG-12. *(MOTOR §4 punto 1; sujeto a `AQ-DIAG-FIRMA-EPISODIO`, `AQ-DIAG-SORPRESA-EN-FOCO`.)*
- **CA-8 — Forma fija, contenido inyectado, cero números en el dominio.** Plausibilidad y profundidad se leen de `PlausibilityPolicyPort`; sin él, rechazo; el dominio no contiene ni un peso ni un umbral ni una profundidad. F-DG-11; DIAG.INV-10. *(MOTOR §9; §10.4.)*
- **CA-9 — Cero conceptos nuevos.** Ningún tipo/acto/invariante fuera del canon; reusa puertos REALES de C1 (`traverseUpstream`, `getById`, `listActiveConstraints`, `listEpisodesBySignature`, `applyWeakLink`); importa `RoleContext` de C3 (fuente única); no redefine el MOV, no modifica el OSE ni ATENDER; no añade tabla ni delta de esquema. *(reglas duras 1-7.)*
- **CA-10 — Ejecutabilidad condicionada (honestidad).** U-1..U-12 y F-DG-1..F-DG-12 corren con `vitest` actual mockeando los puertos de C1, **una vez que C1 (`modules/mov`) y C3 (`modules/atender`) existan como TypeScript importable** (hoy no existen → `AQ-DIAG-PRECONDICION-C1C3`). **Contra DATOS REALES, el componente se abstiene SIEMPRE** hasta resolver tres AQ operativamente bloqueantes aguas arriba: `AQ-DIAG-AUTORIA-BRECHA` (nadie crea la brecha), `AQ-DIAG-POBLADO-GRAFO`/`AQ-DIAG-AUTORIA-RELACION-CAUSAL` (nadie puebla `relacion_causal`) y `AQ-DIAG-NODO-CAUSAL` (sin punto de entrada inequívoco al recorrido). "Construible YA" = **esqueleto con puertos mockeados, NO operable end-to-end**. La parte RPC/SQL (RLS, `mov.read`) hereda `AQ-DIAG-TEST-INFRA`/`AQ-DIAG-PERMISOS`.

> **Nota de honestidad (regla dura 6/8).** Verificado en disco: `docs/engineering/` contiene `01-mov-data-model.md`, `02-operational-state-engine.md`, `03-atender.md`. `nexus-platform/modules/` **no contiene** `mov`/`ose`/`atender`/`diagnosticar`. `traverseUpstream`/`traverseDownstream`/`getTrajectory` están **definidos como firmas en C1** (L192-194), no como código. `applyWeakLink` (C1 L580-600) y `AuditRepository.append` (`modules/audit`) están verificados. La afirmación "ejecutable hoy" depende de esa precondición.

---

## Tabla de trazabilidad (todo al canon, por nombre — verificado en disco)

| Elemento de la spec | Ancla canónica (verificada) |
|---|---|
| Acto DIAGNOSTICAR (propósito) | ARQUITECTURA §3 acto 4 (ARQUITECTURA-COGNITIVA.md L104-105) |
| Gate G5 (recorrido hacia atrás, tres papeles, freno asociación→HIPÓTESIS) | MOTOR-COGNITIVO.md L115-116 |
| Gate G6 = DIAGNOSTICAR→JUZGAR (umbral por consecuencia) | MOTOR-COGNITIVO.md L118 → `AQ-DIAG-UMBRAL-ABSTENCION` |
| Invariante (a): grafo en dos sentidos, separados físicamente | MOTOR-COGNITIVO.md L146 |
| `traverseUpstream(tenantId, fromNodeId, maxDepth): Promise<AristaMov[]>` | C1 `01-mov-data-model.md` L192 |
| `traverseDownstream` = JUZGAR (excluido por `Pick`) | C1 L193 |
| `nivel_causal` = columna de `mov_explicacion`; `condicion_falsacion` ∈ `relacion_causal.attrs`; arista `causal` lleva `fuerza/polaridad/direccion/masa` | C1 L407, L413, L466 → `AQ-DIAG-LECTURA-ENLACE-CAUSAL` |
| `AristaMov { estatus, confianza, attrs }` (sin `confianzaAgregada`) | C1 L526-537 → corrección §8.1 |
| `applyWeakLink` (MIN del camino; `{abstain:"PREMISA_NO_EVALUADA"}`) | C1 L580-600; MOV §0.7, §5.2 |
| `relacion_causal` nunca HECHO (CHECK) | C1 L409; MOV §2.1 R1 |
| `brecha` D3: causas → aristas `causal`; referente → arista `referente` | C1 L426; `MOV.I-3`, `MOV.I-6` |
| RECONCILIAR calibra ("cuatro cosas, solo cuatro"; no crea enlaces) | MOTOR-COGNITIVO.md L313-318 → `AQ-DIAG-POBLADO-GRAFO` |
| Tres papeles síntoma/causa/restricción; "el error operativo más caro" | MOV §0.3; ARQUITECTURA §2.1 |
| Niveles asociación/intervención/contrafactual; "asociativo = correlato sospechoso" | MOV §2.3; `MOV.I-4` |
| Procedimiento de diagnóstico (trazar atrás → nivel → accionabilidad → confusores) | MOV §2.4/§2.5 |
| Abstención de primera clase (qué falta / qué la rescataría) | MOV §5.2; `MOV.I-7`; CONSTITUCION §4 |
| Memoria Punto 1 ("la memoria sugiere, el grafo confirma") | MOTOR §4 punto 1 |
| `Focus.origin = {kind:"brecha", entity}`; `AttentionRanking.active` | C3 `focus.ts` → `FocusOrigin` / `Focus` / `AttentionRanking` (por nombre) |
| `RoleContext` (fuente única, importado) | C3 `salience-policy-port.ts` → tipo `RoleContext` (por nombre) |
| Blindaje forma/contenido (cuantificación calibrable, solo lectura) | MOTOR §9; §10.4; análogo a `SaliencePolicyPort` (C3) / `RelevanceThresholdPort` (OSE) |
| Patrón orquestación pura (`knowledgeNowMs`/`requestId`) | `scan-overdue-work-orders.ts` (verificado) |
| `AuditRepository.append` / `AuditEvent` | `modules/audit/...` (verificado) |

---

## Architectural Questions (NO resueltas — registradas, no resueltas por intuición)

- **AQ-DIAG-PRECONDICION-C1C3** — Hoy `modules/mov` (C1), `modules/ose` (C2) y `modules/atender` (C3) NO existen como TypeScript en disco (verificado: `modules/` contiene `audit/scheduling/crm/...` pero no `mov/ose/atender/diagnosticar`). Los puertos que `diagnose` consume existen solo como firmas en los .md. La ejecutabilidad (incluso mockeando) depende de que C1/C3 sean código importable. Precondición de construcción. NO resuelta.
- **AQ-DIAG-AUTORIA-BRECHA** (operativamente bloqueante) — DIAGNOSTICAR consume la `brecha` (D3) pero NO la crea; el OSE solo recomputa su lado observado (`OSE.INV-9`). El canon no nombra qué acto CREA la entidad `brecha` por primera vez. Sin creador, no hay síntoma que diagnosticar. Hereda C1 `AQ-AUTORIA-BRECHA` y C3 `AQ-ATENDER-AUTORIA-BRECHA`. NO resuelta.
- **AQ-DIAG-POBLADO-GRAFO / AQ-DIAG-AUTORIA-RELACION-CAUSAL** (operativamente bloqueante) — El canon NO asigna a ningún componente la CREACIÓN inicial de las `relacion_causal`. RECONCILIAR solo CALIBRA enlaces existentes (MOTOR §10.4 "cuatro cosas, solo cuatro"); abrir el catálogo es "acto de gobierno, fuera del bucle automático" (MOTOR §10.5), sin dueño de ingeniería. Con grafo vacío, DIAGNOSTICAR se abstiene (`grafo_vacio`), degradación honesta (MOV §2.1 R4). NO resuelta.
- **AQ-DIAG-NODO-CAUSAL** (operativamente bloqueante para el recorrido) — `traverseUpstream` parte de un NODO CAUSAL (dimensión de variación, MOV §2.2: "la carga del recurso R, no R"), distinto de la entidad A1/D3. Cómo se obtiene el `nodoCausalId`/`brechaNodeId` del síntoma desde la `brecha` no lo fija el canon. Hereda C1 `AQ-NODO-CAUSAL`. NO resuelta.
- **AQ-DIAG-LECTURA-ENLACE-CAUSAL** (gap nuevo, verificado en disco) — `nivel_causal` es columna de `mov_explicacion` (C1 L407) y `condicion_falsacion` vive en `relacion_causal.attrs` (C1 L413), NO en la arista (cuyo `attrs` es `fuerza/polaridad/direccion/masa`, C1 L466). `traverseUpstream` devuelve `AristaMov[]`; C1 no expone un puerto explícito arista→`relacion_causal`. DIAGNOSTICAR debe hidratar la entidad con `getById`, pero el mapeo (¿la arista referencia el `id` de la `relacion_causal` o se resuelve por `origenId`/`destinoId`?) no está fijado. NO se extiende C1 (regla dura 2). Hasta resolverlo, el filtro por nivel (RD-3) y la derrotabilidad (RD-6) leen de un origen no garantizado por el puerto. NO resuelta.
- **AQ-DIAG-PROCEDENCIA-LECTURA** (registrada en el pase de falsación) — El pseudocódigo lee `rel.sello.procedencia.rootObservationIds` para la fundamentación (DIAG.INV-1; POST-3). El tipo `EntidadMov.sello.procedencia.rootObservationIds` está DEFINIDO en C1 (cadena de tipos correcta), pero su **binding de almacenamiento/poblado en tiempo de lectura** es el vacío C1 `AQ-PROCEDENCIA-SCHEMA` (¿dentro de `audit_events.metadata` jsonb o tabla puente?). Si el seed no lo puebla, la lectura devuelve vacío y la candidata se descarta por DIAG.INV-1 (degradación honesta, no crash de spec). Hereda C1 `AQ-PROCEDENCIA-SCHEMA`. NO resuelta.
- **AQ-DIAG-CONFIANZA-AGREGADA** (corrección de miscitación) — El puerto `traverseUpstream` devuelve `AristaMov[]` CRUDO, sin `confianzaAgregada`; la forma `{path, confianzaAgregada=min}` es pseudocódigo INTERNO de C1 (`traverseCausal`, L670-672), no el puerto público. DIAGNOSTICAR compone el MIN él mismo vía `applyWeakLink`. Esta spec NO afirma que C1 lo agrega. Registrada como corrección; no pide cambio a C1.
- **AQ-DIAG-PLAUSIBILIDAD** — La FORMA (trazar hacia atrás, filtrar nivel ≥ intervención, descartar confusores, ordenar por soporte = fuerza×confianza descontado por retardo, MOV §2.5) es ley; CÓMO se PUNTÚA numéricamente (el comparador `compareSupport`) es contenido calibrable que el canon no fija. Aislado tras `PlausibilityPolicyPort` (solo lectura). Origen/seed/tabla no fijados; calibrarla es de RECONCILIAR. NO resuelta.
- **AQ-DIAG-PROFUNDIDAD** — El recorrido necesita una cota (`maxUpstreamDepth`); el canon exige que EXISTA un límite (Freno 3, MOTOR §8), no su VALOR. El valor es contenido calibrable; vive en `PlausibilityPolicyPort.maxUpstreamDepth`, nunca en el dominio (DIAG.INV-10). NO resuelta.
- **AQ-DIAG-UMBRAL-ABSTENCION** — DIAGNOSTICAR se abstiene por AUSENCIA de causa fundamentable; pero el "umbral por consecuencia" que decide si la confianza alcanza lo que el costo de error del rol exige es el gate G6 = DIAGNOSTICAR→JUZGAR (MOTOR L118), del lado del consumidor. La frontera exacta "DIAGNOSTICAR entrega confianza" vs "JUZGAR/G6 decide suficiencia" la fija el canon en el handoff; esta spec adopta que DIAGNOSTICAR NO ejecuta el gate de suficiencia (no inyecta `meetsSufficiency`). La distinción abstenerse-vs-reobservar (valor de la información) es frente abierto del MOV (§10 Clase 3). NO resuelta.
- **AQ-DIAG-ACCIONABILIDAD-ROL** — Distinguir CAUSA (accionable) de RESTRICCIÓN (no accionable) exige el test de accionabilidad por rol (MOV §2.4) cuyo dueño es la Dimensión de Restricciones (MOV §5); el canon no fija el PREDICADO concreto (cómo se decide que el rol X puede actuar sobre el nodo Y) ni el catálogo de roles. Hereda C3 `AQ-ATENDER-ACCIONABILIDAD-ROL`. Esta spec lo compone de (a) `listActiveConstraints` (restricciones ya modeladas) y (b) un predicado `esAccionablePorRol` sin re-derivar. NO resuelta.
- **AQ-DIAG-DETECCION-CONFUSOR** — MOV §2.4 exige "descartar confusores" (nodo que influye a la vez en presunto origen y destino, fabricando asociación espuria). El canon dice que el confusor "debe representarse explícitamente" (MOV §2.2) pero NO fija cómo DIAGNOSTICAR lo detecta con los puertos reales de C1 (¿atributo del enlace, lectura adicional, vista derivada?). Ligado a `AQ-DIAG-NODO-CAUSAL`. NO resuelta.
- **AQ-DIAG-FIRMA-EPISODIO** — La consulta de memoria en G5 (`listEpisodesBySignature`, RD-9) requiere una "firma de síntoma"; el canon no especifica qué atributos de la brecha/entidad la componen ni cómo se mide la similitud. Sin ella, el reconocimiento de patrón no es invocable de forma determinista. NO resuelta.
- **AQ-DIAG-SORPRESA-EN-FOCO** — El disparo de memoria (a) "sorpresa alta" (MOTOR §4 punto 1) requiere la magnitud de sorpresa, que mide el OSE/COMPRENDER. El canon no fija si DIAGNOSTICAR la recibe en el `Focus` de C3 o la re-lee. Si el `Focus` no la transporta, el disparo (a) no es evaluable aquí. Frontera C3→C4/C5 no especificada. NO resuelta.
- **AQ-DIAG-CONFIANZA-ORDINAL** — La confianza agregada es "min de sellos" (MOV §2.2), pero el blindaje (MOTOR §9) trata la confianza como relación de orden; un eslabón con `tipo_incertidumbre` no conmensurable (ambiguedad_no_cuantificable vs reducible, MOV §5.2) hace el `min()` un escalar potencialmente falso. `confianza: number | null` (null=no evaluada→abstención) cubre el caso degenerado, pero el orden parcial entre incertidumbres no conmensurables no está resuelto. Hereda C1 `AQ-CONFIANZA-ORDINAL` y C3 `AQ-ATENDER-SALIENCE-ORDINAL`. NO resuelta.
- **AQ-DIAG-CICLOS** — El grafo admite bucles de primera clase (MOV §2.2/§2.5: "detecta el lazo como objeto en vez de iterar"). `maxUpstreamDepth` acota la iteración, pero cómo C1 detecta/representa el bucle (en vez de truncarlo) sin delegar razonamiento al repositorio queda abierto. Hereda C1 `AQ-CICLOS-GRAFO`. NO resuelta.
- **AQ-DIAG-NIVEL-AGREGADO-INDIVIDUO** — MOV §2.3 advierte de la falacia ecológica: saltar de un enlace de nivel poblacional a una atribución contrafactual de un caso individual exige degradación de confianza. Una brecha atendida puede ser individual mientras las `relacion_causal` sean poblacionales. El canon exige la degradación pero no fija el MECANISMO de cómputo con los puertos reales de C1. NO resuelta.
- **AQ-DIAG-PERSISTENCIA-INFERENCIA** — ¿DIAGNOSTICAR escribe una `inferencia` B2 (con su disyunción) o solo la devuelve? El canon describe el acto como CONSULTA (ARQUITECTURA §6) y trata el foco análogo de C3 como proyección efímera; pero JUZGAR (G7) consume el diagnóstico después. Esta spec adopta la lectura canon-fiel: se DEVUELVE, no se escribe (`DiagnoseDeps` no inyecta `integrar`/`writeDisjunctiveBelief`). Si debe persistir, el dueño de escritura y la sede no los fija el canon. NO resuelta, NO construida.
- **AQ-DIAG-AUTORIA-CAUSAS-CANDIDATAS** — El canon NO nombra dueño de escritura de `brecha.causas_candidatas` (D3), que en C1 son aristas `causal` (C1 L426). `OSE.INV-9` solo recomputa el lado observado; `OSE.INV-6` prohíbe al OSE escribir C/D; C1 abre C/D solo a "RECONCILIAR con su propio permiso", sin nombrar a DIAGNOSTICAR. Mientras no se conceda el grant, DIAGNOSTICAR solo LEE esas aristas. NO resuelta.
- **AQ-DIAG-HOGAR-DIAGNOSTICO** — El diagnóstico es proyección efímera. Pero la deuda epistémica viva de un diagnóstico PARCIAL debe sobrevivir a una preempción de C3 (MOTOR §3.2 G0.5) y ser retomable. Su hogar persistente cruza la frontera con C3/JUZGAR y el canon no lo define. Hereda C3 `AQ-ATENDER-HOGAR-FOCO` y `AQ-ATENDER-PREEMPCION-PROTOCOLO`. NO resuelta (no construido; no bloqueante para el diagnóstico efímero).
- **AQ-DIAG-DISPARO** — DIAGNOSTICAR es event-driven (Freno 1); corre cuando el ritmo de juicio recoge un `Focus.active` (G4→G5) o una pregunta de rol se posa en G5. El canon NO nombra qué del stack invoca `diagnose` sin violar "el Motor no se enciende a sí mismo". Hereda `AQ-ATENDER-DISPARO`. NO resuelta.
- **AQ-DIAG-CARDINALIDAD-FOCO** — Hereda `AQ-ATENDER-CARDINALIDAD-FOCO`: el OSE emite 1 `perturbacion` con N afectadas; C3 puede producir focos por brecha/por entidad/por perturbación. DIAGNOSTICAR asume UNA brecha por invocación (1 síntoma → recorrido hacia atrás, coherente con G5), pero el mapeo de un foco multi-afectada a una o varias invocaciones de `diagnose` no está alineado por el canon. NO resuelta.
- **AQ-DIAG-CONTEXTO-ROL** — El `RoleContext` (esfera/horizonte/meta/costo-de-error, CONSTITUCION §8) es valor de tenant, no esquema; el canon no especifica QUIÉN provee el contexto del rol consumidor en una corrida de diagnóstico. Hereda `AQ-ATENDER-CONTEXTO-ROL` y C1 `AQ-BINDING-OPERACIONAL`. NO resuelta.
- **AQ-DIAG-INVALIDACION-CAUSAL** — "Caducidad por revisión causal" (MOV §7.3): cuando RECONCILIAR recalibra una `relacion_causal`, ¿el diagnóstico que la invocó como premisa se re-evalúa, se marca "a revalidar", o queda obsoleto? El mecanismo de propagación de invalidación a las inferencias derivadas no está especificado. Hereda C1 `AQ-INVALIDACION-CAUSAL`. NO resuelta.
- **AQ-DIAG-TEST-INFRA / AQ-DIAG-PERMISOS** — El repo no tiene Postgres de test (vitest `environment:node`, Supabase mockeado); las pruebas que tocan SQL/RLS del grafo (`mov.read` sobre `mov_explicacion`) no son ejecutables hoy. Un permiso `mov.read` para DIAGNOSTICAR debe existir en `permissions/role_permissions/tenant_features` (patrón `20260625001_nlabs_permissions.sql`); sin él las lecturas fallan. Hereda C1/C3 `AQ-TEST-INFRA`/`AQ-PERMISOS`. NO resuelta.