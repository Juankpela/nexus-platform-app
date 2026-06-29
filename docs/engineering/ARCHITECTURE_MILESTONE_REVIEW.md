# Architecture Milestone Review — Motor Cognitivo (C1–C4 FROZEN)

> **Naturaleza.** Revisión **transversal** del sistema tras congelar C1–C4. NO es una revisión componente-por-componente. NO modifica canon ni componentes congelados. Donde el sistema deja un vacío, se registra/clasifica como Architectural Question; **nunca se inventa solución**. Evidencia: inventarios verificados en disco de C1, C2, C3, C4 + los 5 docs de canon. Fecha: 2026-06-29. Repo sincronizado: `main = de4baa9` (verificado al iniciar y al cerrar este pase).

---

## 0. Veredicto ejecutivo

| Pregunta del criterio de éxito | Veredicto |
|---|---|
| ¿El Motor sigue siendo consistente como sistema? | **SÍ.** Grafo acíclico, fronteras de responsabilidad aisladas, sin APIs inventadas, citas al canon verbatim. |
| ¿La arquitectura sigue siendo válida? | **SÍ.** C1–C4 reusan exclusivamente lo que el componente anterior expone; cero conceptos nuevos; cero invariantes rotos. |
| ¿Las responsabilidades permanecen aisladas? | **SÍ**, con **3 responsabilidades huérfanas** correctamente registradas como AQ (no son fugas: son frontera no asignada por el canon). |
| ¿Hay ciclos arquitectónicos? | **NO.** DAG estricto `Canon → C1 → C2 → C3 → C4`. |
| ¿Puede empezar C5 sin poner en riesgo la arquitectura? | **SÍ**, una vez leída la Fase 3 (`C5_PREPARATION.md`). La frontera DIAGNOSTICAR↔JUZGAR es nítida. |

**Hallazgo rector (una frase).** C1–C4 constituyen un **núcleo de razonamiento/consulta completo y coherente, pero todavía NO un bucle operativo cerrado**: las "terminales sensorio-motoras" del Motor —quién crea la brecha, quién puebla el grafo causal, quién enciende el Motor y quién enlaza el MOV a las tablas operacionales— son **vacíos sistémicos no asignados** (la misma AQ replicada en los 4 componentes). Es un cerebro internamente sano cuyo cableado de entrada/salida está deliberadamente diferido a decisiones de binding/gobierno y a componentes futuros (COMPRENDER / RECONCILIAR / scheduler externo). **No es un defecto de los specs; es el límite real del milestone.**

---

## 1. Mapa de dependencias (grafo real)

```
                 ┌─────────────────────────────────────────────────┐
                 │  CANON (FROZEN): Constitución · MOV · OSE ·        │
                 │  Arquitectura Cognitiva · Motor Cognitivo          │
                 └───────────────────────┬─────────────────────────┘
                                         │ (cita por §, estable)
                                         ▼
        ┌────────────────────────────────────────────────────────────┐
        │ C1 — MOV Data Model  (BASE; ÚNICO con capacidad de escritura)│
        │ 6 puertos / 27 métodos · mov_integrar (RPC) · 18 CHECK ·     │
        │ sellos · 17 tipos · applyWeakLink · RLS mov.read/mov.write   │
        └───┬───────────────┬───────────────┬───────────────┬─────────┘
            │ R+W           │ R/O           │ R/O           │ R/O
            ▼               ▼               ▼               ▼
   ┌─────────────────┐     (C3, C4 y C5+ leen C1 directamente — radios al hub)
   │ C2 — OSE         │
   │ mantiene el MOV  │  Gates G0–G3 · P-IN/P-CLK/P-OUT · RelevanceThresholdPort
   │ ÚNICO escritor   │  consume 13 métodos de C1 (R+W) · produce `perturbacion` (E2)
   │ de sustancia     │  deja candidato de foco SIN firmar
   └───────┬─────────┘
           │ produce perturbacion (en C1) + deja candidato de foco
           ▼
   ┌─────────────────┐
   │ C3 — ATENDER     │  Gates G0.5 + G4 · SaliencePolicyPort (R/O)
   │ salience/foco    │  consume C1 R/O (listGaps, listByType, getById, …)
   │ R/O puro         │  define Focus/Salience/AttentionRanking/RoleContext/RolKey
   └───────┬─────────┘
           │ entrega brechaId (identidad) + RoleContext (import de tipo)
           ▼
   ┌─────────────────┐
   │ C4 — DIAGNOSTICAR│  Gate G5 · PlausibilityPolicyPort (R/O)
   │ abducción causal │  consume C1 R/O (traverseUpstream, getById, …) + applyWeakLink
   │ hacia atrás, R/O │  importa RoleContext de C3 · define Diagnostico/CausaCandidata/…
   └───────┬─────────┘
           ▼  (futuro)
        C5 JUZGAR → C6 ARTICULAR → C7 RECONCILIAR
```

### 1.1 Productores / consumidores / dependencias

| Componente | Depende de | Consume (lee) de | Produce | Consumido por |
|---|---|---|---|---|
| **C1** | Canon (MOV/OSE/Motor/Constitución) | — (es la base) | 5 familias de tablas selladas, 6 puertos, `mov_integrar`, `applyWeakLink`, tipos | C2 (R+W), C3 (R/O), C4 (R/O), C5–C7 (futuro) |
| **C2** | Canon, **C1** | 13 métodos de C1 (incl. escrituras `integrar`, `updateGapObservedSide`, `writePerturbation`, `appendObservation`, `setExpectationOutcome`, `writeDisjunctiveBelief`, `deprecate`) | `perturbacion` (E2) + candidato de foco sin firmar | C3 (consume la perturbación vía C1) |
| **C3** | Canon, **C1** | C1 R/O (`listGaps`, `listActiveObjectives/Constraints`, `getById`, `listByType`, `listByAnchor`, `listEpisodesBySignature`) + `AuditRepository.append` | `AttentionRanking` (efímero); define `RoleContext`/`RolKey` | C4 (importa `RoleContext`; consume `brechaId`) |
| **C4** | Canon, **C1**, **C3** (tipo `RoleContext` + `brechaId`) | C1 R/O (`traverseUpstream`, `getById`, `listByAnchor`, `listGaps`, `listActiveConstraints`, `listEpisodesBySignature`, `applyWeakLink`) + `AuditRepository.append` | `Diagnostico` (efímero) | C5 (futuro) |

### 1.2 Chequeo de ciclos — **NINGUNO**

DAG estricto verificado con evidencia en disco:
- **C2 ⇏ C3/C4**: C2 no importa, llama ni referencia a ATENDER/DIAGNOSTICAR; `CausalGraphRepository` NO está en `OseDeps`; `writeEpisode` excluido por `Pick<…>`. (Inventario C2 §8.)
- **C3 ⇏ C4**: C3 no conoce a C4. C4 es posterior.
- **C4 → C3** es **hacia adelante** (consumidor→productor previo): solo importa el *tipo* `RoleContext` y recibe el `brechaId`. No hay retorno C3←C4.
- **Ningún componente escribe en la spec/puertos de uno anterior.** C2 escribe **datos** en C1 (es su rol legítimo de mantenedor del MOV), no acopla el código de C1.

**Conclusión: acíclico. No se gatilla la parada.**

### 1.3 Acoplamientos — uno señalado

- **C1 es un hub universal** (todos los radios apuntan a C1). Esto es deseable y esperado: el MOV es la sustancia común. No es acoplamiento innecesario.
- **Acoplamiento C4→C3 por el tipo `RoleContext`** (decisión 7 de C4: "fuente única"). `RoleContext` modela las cuatro coordenadas de rol (CONSTITUCION §8) — un concepto **del canon**, no propio de ATENDER. Que viva físicamente en `modules/atender/application/ports/salience-policy-port` obliga a **C4, y obligará a C5/C6/C7**, a importar un tipo transversal desde C3. Es el único acoplamiento entre actos que no es estrictamente necesario por el dominio. **No se corrige (C3 congelado)** → se registra `AQ-SYS-ROLECONTEXT-HOME` (¿debería `RoleContext` vivir en un módulo kernel/compartido en vez de en C3?). **No bloqueante**; cosmético-estructural; resolver si C3 se reabre o al introducir un módulo compartido en Fase B.

---

## 2. Responsabilidades (una por componente; fronteras duras)

| Componente | Responsabilidad ÚNICA | Gates | Escribe sustancia | Recorre grafo |
|---|---|---|---|---|
| **C1** | Persistir el MOV y **garantizar invariantes** (no razona) | — | (es el sustrato) | — |
| **C2 / OSE** | **Mantener el MOV vivo**: percibir, anclar, medir sorpresa, integrar, emitir `perturbacion` | G0–G3 | **SÍ** (A/B/E; único escritor del bucle) | links de dependencia (no causal) |
| **C3 / ATENDER** | **Salience / foco / contención / preempción** | G0.5 + G4 | **NO** (R/O) | — |
| **C4 / DIAGNOSTICAR** | **Abducción causal HACIA ATRÁS** (el porqué) | G5 | **NO** (R/O) | `traverseUpstream` (solo atrás) |
| **C5 / JUZGAR** *(futuro)* | Suficiencia + proyección HACIA ADELANTE + decidir/abstener/escalar | G6/G7/G8 | (proyectado) `intervencion`/`compromiso` | `traverseDownstream` |
| **C6 / ARTICULAR** *(futuro)* | Proyectar al rol en su lenguaje | G9 | — | — |
| **C7 / RECONCILIAR** *(futuro)* | **Calibrar** confianzas/priores post-outcome | §10.4 | C/E (calibración) | — |

**Verificación de aislamiento:**
- **Sin responsabilidades duplicadas.** Cada gate pertenece a exactamente un componente. La separación "C2 escribe / C3,C4 leen" es limpia: el OSE mantiene el modelo, los actos lo consultan.
- **Sin componentes demasiado grandes.** C2 y C1 son los más densos (escritura + invariantes), pero su responsabilidad sigue siendo única.
- **Una dependencia compartida, no una fuga:** el **test de accionabilidad por rol** lo necesitan C3 (relevancia-de-rol) y C4 (causa vs restricción); **ambos lo DELEGAN** a la Dimensión de Restricciones (MOV §5) vía la misma AQ (`*-ACCIONABILIDAD-ROL`) y **ninguno lo re-deriva**. No es duplicación; es un predicado compartido aún sin dueño.

### 2.1 Responsabilidades HUÉRFANAS (frontera no asignada por el canon)

Estas NO son fugas entre componentes; son responsabilidades que **el canon no atribuye a ningún acto** y que los 4 specs registran honestamente como AQ. Son el límite real del milestone:

| # | Responsabilidad huérfana | AQ replicada en | Candidato natural (NO asignado por el canon) |
|---|---|---|---|
| H1 | **Crear la `brecha` (D3) por primera vez** | C1 `AUTORIA-BRECHA`, C2 `AUTORIA-BRECHA`, C3 `ATENDER-AUTORIA-BRECHA`, C4 `DIAG-AUTORIA-BRECHA` | COMPRENDER (acto pre-OSE) o una decisión de binding; el OSE solo recomputa el lado observado (`OSE.INV-9`) |
| H2 | **Poblar las `relacion_causal` (familia C)** | C4 `DIAG-POBLADO-GRAFO` / `AUTORIA-RELACION-CAUSAL`; C1 `NODO-CAUSAL` | Gobierno (abrir catálogo, MOTOR §10.5) + posiblemente RECONCILIAR; **nadie de ingeniería hoy** |
| H3 | **Encender el Motor / proveer el reloj de mundo** | C2 `RELOJ-MUNDO`, C3 `ATENDER-DISPARO`, C4 `DIAG-DISPARO` | Scheduler/evento externo; "el Motor no se enciende a sí mismo" (Freno 1) |
| H4 | **Enlazar tablas operacionales → observaciones del MOV** | C1 `BINDING-OPERACIONAL`, C2 `BINDING-PERCIBIR` | Adaptadores PERCIBIR (no construidos) |

**Impacto sistémico:** mientras H1–H4 no se resuelvan, el núcleo **se ejecuta pero se abstiene contra datos reales** (C3 sin brechas → solo perturbaciones; C4 con grafo vacío → abstención `grafo_vacio`). Es degradación honesta, no corrupción.

---

## 3. Mapa de interfaces

### 3.1 Puertos (Ports) — quién los implementa / consume

| Puerto | Dueño | Naturaleza | Implementa | Consume |
|---|---|---|---|---|
| `MovRepository` (5 métodos) | C1 | R/W | infraestructura C1 (Supabase) | C2 (R+W), C3 (R/O), C4 (R/O) |
| `SubstanceRepository` (2) | C1 | R/O | infra C1 | C2 |
| `BeliefRepository` (5) | C1 | R/W | infra C1 | C2 |
| `CausalGraphRepository` (3: upstream/downstream/trajectory) | C1 | R/O | infra C1 | **C4** (solo `traverseUpstream`); C5 futuro (`traverseDownstream`); C2 difiere `getTrajectory` |
| `NormativeRepository` (4) | C1 | R/W | infra C1 | C2 (`updateGapObservedSide` W), C3 (R/O), C4 (R/O) |
| `DynamicsRepository` (3) | C1 | R/W | infra C1 | C2 (`writePerturbation` W), C3/C4 (`listEpisodesBySignature` R/O) |
| `AuditRepository.append` | módulo `audit` (real, en disco) | W (traza) | infra audit | C2, C3, C4 |
| `RelevanceThresholdPort` | C2 | R/O (política) | calibración (RECONCILIAR futuro) | C2 |
| `SaliencePolicyPort` (6 métodos) | C3 | R/O (política) | calibración (RECONCILIAR futuro) | C3 |
| `PlausibilityPolicyPort` (2 métodos) | C4 | R/O (política) | calibración (RECONCILIAR futuro) | C4 |

**Patrón de política coherente y repetido:** cada acto cuantificador (C2/C3/C4) expone **un puerto de SOLO LECTURA** (`*ThresholdPort` / `*PolicyPort`) que aísla la cuantificación calibrable; **ninguno escribe su propia política** (la calibra RECONCILIAR). Es el mismo molde tres veces — buena señal de consistencia arquitectónica.

### 3.2 Tipos de dominio / value objects (quién los define)

| Definidos por | Tipos |
|---|---|
| **C1** | `SelloEpistemico`, `SelloTemporal`, `Procedencia`, `EntidadMov`, `AristaMov`, `FamiliaMov`, `TipoMov` (17), `RelacionMov` (11), `EstatusEpistemico`, `TipoIncertidumbre`, `Granularidad`, `ModoCierreValidez` |
| **C2** | `RawSignal`, `Surprise`, `IngestAck`, `SweepReport`, `PerturbationOut`, `ThresholdContext`, `OseDeps` |
| **C3** | `Focus`, `Salience`, `OrdinalSignal`, `FocusOrigin`, `AttentionRanking`, `PresupuestoForma`, **`RoleContext`**, **`RolKey`** |
| **C4** | `Diagnostico`, `CausaCandidata`, `NodoClasificado`, `PapelCausal`, `NivelCausal`, `EstatusDiagnostico`, `Falsador`, `Abstencion`, `EmpateDeclarado` |

**Acoplamiento de tipos entre actos:** uno solo — `RoleContext`/`RolKey` (C3) importado por C4 (→ `AQ-SYS-ROLECONTEXT-HOME`). Todo lo demás se acopla a **C1** (sustancia común), que es lo correcto.

### 3.3 RPC / Value objects de persistencia
- `mov_integrar` (C1, security definer, guard `has_tenant_permission`) — **único punto de escritura** del MOV; usado por C2 (G3) y RECONCILIAR (futuro).
- 18 CHECK constraints + 4 triggers (C1) materializan los invariantes en SQL.
- `applyWeakLink` (C1, función de dominio) — reusada por C2 y C4; ley del eslabón débil.

---

## 4. Complejidad y riesgo

| Comp | Compl. conceptual | Compl. técnica | Interfaces propias | Métodos C1 consumidos | Invariantes propios | AQs | Riesgo de implementación |
|---|---|---|---|---|---|---|---|
| **C1** | Alta (sellos epistémico+temporal, 17 tipos, eslabón débil) | **Muy alta** (RPC atómica, 18 CHECK, 4 triggers, RLS, FK polimórfica) | 6 puertos / 27 métodos | — | 9 (MOV.I-*) | **20** | **Alta — radio de impacto total** (es la base) |
| **C2** | Alta (sorpresa, dos relojes, conflicto disyuntivo) | **Muy alta** (cascada de 5 escrituras en G3 sin scope transaccional acotado) | 4 puertos | 13 | ~11 (OSE.INV-1..9 +8a/8b +cierre) | 17 | **Alta — atomicidad de G3** |
| **C3** | Media (salience como orden, relatividad de rol) | Baja-media (orquestación R/O pura) | 1 puerto / 6 métodos | 7 (R/O) | 11 (ATENDER.INV-*) | 17 | Media |
| **C4** | **Alta** (abducción causal, derrotabilidad, 3 papeles, pluralidad) | Media (orquestación R/O + hidratación de entidad) | 1 puerto / 2 métodos | 6 (R/O) | 11 (DIAG.INV-*) | **25** | **Alta — el más bloqueado por dependencias** |

### 4.1 ¿Cuál representa el MAYOR riesgo para la implementación?

Tres ejes distintos, tres "ganadores":

1. **Mayor riesgo TÉCNICO: C2 (OSE).** El paso G3 ejecuta **cinco escrituras** (sustancia, recompute de brecha, expectativa, perturbación, auditoría) sin un scope transaccional acotado por el canon (`AQ-OSE-ATOMICIDAD-MULTIESCRITURA` + C1 `AQ-19 BLOQUEO-SUBGRAFO`). Una escritura parcial **corrompe el MOV** y viola la Regla de cierre. Es el peligro de integridad #1.
2. **Mayor riesgo de RADIO/blast-radius: C1.** Es la base; `AQ-5 PERMISOS` (seed `mov.read/write` ausente → todo falla para no-`service_role`), `AQ-6 TEST-INFRA` (invariantes SQL no probables hoy) y `AQ-19` gatean **todo lo demás**. Tractables, pero hasta resolverlos nada corre end-to-end.
3. **Mayor riesgo de PREPARACIÓN/bloqueo: C4.** 25 AQs, **4 operativamente bloqueantes**, y **depende de un grafo causal que NADIE puebla** (H2). C4 está completo como spec pero **no operable** hasta resolver AUTORIA-BRECHA + POBLADO-GRAFO + NODO-CAUSAL + LECTURA-ENLACE-CAUSAL.

**Síntesis:** el riesgo no está en la coherencia (impecable) sino en (a) la **atomicidad de escritura de C2/C1** y (b) las **4 responsabilidades huérfanas** que impiden cerrar el bucle.

---

## 5. Architectural Questions — clasificadas

Se clasifican los **vacíos raíz** (de-duplicados: la misma AQ replicada en varios componentes se cuenta una vez como cadena). Categorías: **A** bloquea implementación inmediata · **B** bloquea producción · **C** bloquea escalabilidad · **D** investigación futura.

### Categoría A — Bloquean implementación inmediata

| Vacío raíz | Componente(s) dueño(s) | Impacto | Resolución (fase) |
|---|---|---|---|
| **PRECONDICION-C1C2C3** — specs aún no son TypeScript | proceso de build | Nada corre (ni mockeado) hasta tener código importable | **Fase B** (arranque de dominio) |
| **PERMISOS** (`mov.read/write` sin seed) | C1 | `mov_integrar`/lecturas fallan para todo no-`service_role` | **Fase B/C** (migración de seed — trivial) |
| **TEST-INFRA** (sin Postgres de test) | build | Invariantes SQL/RPC no probables (CA-2/CA-9 de C1) | **Fase B** |
| **AUTORIA-BRECHA** (H1) | sin dueño | Sin brechas → C3/C4 solo ven perturbaciones; bucle normativo inerte | **Fase D** (o antes; decisión de binding) |
| **NODO-CAUSAL** (punto de entrada del recorrido) | C1/C4 | `traverseUpstream` sin nodo de arranque inequívoco | **Fase B** (decisión de modelado) |
| **LECTURA-ENLACE-CAUSAL** (arista→`relacion_causal`, accesor `nivel_causal`) | C4/C1 | C4 no puede leer nivel/falsador sin una ruta que C1 no expone | **Fase B/D** (posible extensión de C1 vía gobierno) |
| **ACCIONABILIDAD-ROL** (predicado rol-puede-actuar) | Dimensión de Restricciones (MOV §5) | C3 (relevancia) y C4 (causa/restricción) no clasifican sin él | **Fase B/D** |

### Categoría B — Bloquean producción (no la implementación del esqueleto)

| Vacío raíz | Dueño | Impacto | Resolución |
|---|---|---|---|
| **POBLADO-GRAFO / AUTORIA-RELACION-CAUSAL** (H2) | gobierno + RECONCILIAR | C4 se abstiene siempre hasta tener grafo causal | **Fase D/F** |
| **DISPARO / RELOJ-MUNDO** (H3) | scheduler externo | El Motor no arranca sin ignición legítima | **Fase D** |
| **BINDING-OPERACIONAL / PERCIBIR** (H4) | adaptadores PERCIBIR | Sin observaciones reales no hay sustancia | **Fase D** |
| **ATOMICIDAD-MULTIESCRITURA / BLOQUEO-SUBGRAFO** | C2/C1 | Escrituras parciales corrompen el MOV | **Fase C** (scoping transaccional) |
| **CALIBRACION** (UMBRAL, SALIENCE-pesos, PLAUSIBILIDAD, PROFUNDIDAD, MEDICION-SORPRESA) | RECONCILIAR (C7) | El Motor corre con cuantificación placeholder hasta calibrar | **Fase F** |
| **HOGAR-FOCO / HOGAR-DIAGNOSTICO / PERSISTENCIA-INFERENCIA / PREEMPCION-PROTOCOLO** | C3/C4/C5 | El razonamiento preemptado no sobrevive ni se retoma | **Fase D** (al definir C5 + protocolo) |
| **CARDINALIDAD-PERTURBACION / -FOCO** (1 perturbación N afectadas → cuántos focos/diagnósticos) | C2/C3/C4 | Mapeo de flujo ambiguo | **Fase D** |
| **PROCEDENCIA-SCHEMA** (`rootObservationIds` en `audit_events`) | C1 | Lectura de procedencia depende del binding | **Fase C** |
| **INVALIDACION-CAUSAL** (recompute en cascada cuando RECONCILIAR cambia C) | C1/C7 | Derivados no se re-evalúan al recalibrar | **Fase F** |

### Categoría C — Bloquean escalabilidad

| Vacío raíz | Dueño | Impacto | Resolución |
|---|---|---|---|
| **TENANT-vs-SUJETO / MULTI-SUJETO / PROPAGACION-CRUZA-SUJETO** | C1 | Rompe si un tenant alberga >1 sujeto operacional | validar supuesto en **piloto** |
| **PARTICION-RETENCION** (MOV crece sin cota) | C1 | Sin particionado/archivado a 6–12 meses | **Fase G** |
| **GRANULARIDAD-ESQUEMA** (5 tablas vs `mov_entity` único) | C1 | Coste de JOINs de grafo a escala | reabrir solo si caro |

### Categoría D — Investigación futura

| Vacío raíz | Dueño | Nota |
|---|---|---|
| **CONFIANZA-ORDINAL / MAGNITUD-ORDINAL** (escalar vs orden parcial entre incertidumbres no conmensurables) | transversal | caso degenerado ya cubierto por `null`; reabrir si el piloto observa tensión |
| **CICLOS-GRAFO** (detectar el lazo como objeto) | C1 | acotado hoy por `maxDepth` |
| **NIVEL-AGREGADO-INDIVIDUO** (falacia ecológica) | C4 | canon exige degradación; mecanismo no fijado |
| **FK-POLIMORFICA, VALIDACION-ATTRS, CLASE-PERTURBACION, CONFLICTO-DETECCION, IDENTIDAD-HECHO, MEMBRESIA-POBLACION, DISYUNTIVA-FISICA, DECAIMIENTO, FIRMA-EPISODIO, SORPRESA-EN-FOCO, DETECCION-CONFUSOR** | varios | decisiones de implementación/detalle; ninguna bloquea el esqueleto |

> **Observación de gobierno:** la mayoría de las Categoría A/B son **una sola decisión de binding/gobierno replicada** (H1–H4). Resolver las 4 huérfanas + atomicidad + permisos + test-infra **desbloquea el grueso del sistema**. No son 79 problemas; son ~12 vacíos raíz, de los cuales ~7 son Categoría A.

---

## 6. Trazabilidad (Canon → Specs → Puertos → Modelo → Código)

| Eslabón | Estado | Evidencia |
|---|---|---|
| **Canon → Specs** | ✅ ALINEADO | C3 y C4 falsificados verbatim contra MOTOR/ARQ/CONST/MOV (gates de 5 refutadores, 2026-06-29); C1/C2 citan canon por § verificado |
| **Specs → Puertos** | ✅ ALINEADO | Cada puerto consumido existe con la firma citada (C1 6 puertos/27 métodos verificados en disco) |
| **Puertos → Modelo** | ✅ ALINEADO | Tipos/tablas/CHECK trazados a MOV §8 y a los invariantes |
| **Modelo → Código** | ⚠️ **NO EXISTE AÚN** | `modules/mov`,`ose`,`atender`,`diagnosticar` **no existen como TypeScript** (`AQ-*-PRECONDICION`). Hay specs `.md`, no código |

### 6.1 Referencias frágiles detectadas

| Tipo de referencia | Dónde | Riesgo | Estado |
|---|---|---|---|
| **Cita por número de línea C4→C3** | C4 (orig.) | **Se rompió** al editar C3 (ficha de cierre desplazó ~20 líneas) | ✅ **ya corregido** este sesión → citas por nombre de símbolo |
| Cita por número de línea C4→C1 (`C1 L192/L407/L413/L466`…) | C4 | Frágil si C1 se reabre (hoy bajo, C1 congelado) | ⚠️ pendiente de política |
| Cita por número de línea C2→C1 | C2 | Igual | ⚠️ pendiente de política |
| Citas a canon por `§` | C1/C2/C3/C4 | **Estables** (canon congelado, secciones numeradas) | ✅ ok |

### 6.2 Propuesta: Política de Citas Estables (NO se aplica a congelados sin autorización)

> **Regla propuesta (vigente para C5+ y para cualquier componente que se reabra):** toda referencia **interna entre componentes** se hace por **identificador estable**, nunca por número de línea:
> - a **canon** → por nombre de sección (`MOTOR §3.2 G5`, `MOV §0.7`),
> - a **puertos/métodos** → por nombre (`CausalGraphRepository.traverseUpstream`),
> - a **tipos** → por nombre (`EntidadMov`, `RoleContext`),
> - a **invariantes** → por id (`MOV.I-3`, `OSE.INV-9`, `DIAG.INV-5`).
>
> **No se editan C1/C2/C3 congelados** para re-hardening de sus citas por línea (regla: no modificar congelados). Se registra `AQ-SYS-CITAS-FRAGILES`: si algún componente congelado se reabre por otra razón, se aprovecha para convertir sus citas por línea a nombre. C4 ya nació endurecido (corregido en su pase de falsación).

---

## 7. Estado del repositorio (Fase 1.7)

| Verificación | Resultado |
|---|---|
| `ENGINEERING_STATUS.md` presente y coherente | ✅ (C1–C4 = CERRADO/FROZEN) |
| Component status vs dashboard | ✅ consistente |
| Commits en `main` | ✅ `49c1efb`(canon+C1+C2) → `cd221d8`(C3) → `7f7f253`(dashboard) → `bb87361`(C4 report) → `de4baa9`(freeze C4) |
| Repo sincronizado (HEAD == origin/main) | ✅ `de4baa9` == `de4baa9` (verificado al iniciar este pase) |
| Diferencia GitHub vs local | ✅ ninguna (solo `scripts/seed-cinco.mjs` sin trackear, ajeno al Motor) |

**No se detecta discrepancia. No se gatilla la parada.**

---

## 8. Conclusión — criterio de éxito

| Criterio | ✓/✗ |
|---|---|
| El Motor Cognitivo sigue siendo consistente como sistema | ✅ |
| La arquitectura continúa siendo válida | ✅ |
| Las responsabilidades permanecen aisladas (3 huérfanas registradas como AQ, no fugas) | ✅ |
| Las AQ están clasificadas y priorizadas (A/B/C/D, por vacío raíz, con dueño/impacto/fase) | ✅ |
| Existe un roadmap claro hacia la implementación | ✅ → `ROADMAP_TO_CODE.md` |
| C5 puede comenzar sin poner en riesgo la arquitectura | ✅ → `C5_PREPARATION.md` |

**Recomendación:** el milestone está **APROBADO**. C1–C4 son un núcleo de razonamiento sano y acíclico. Antes de C5, el founder debe tomar nota de que **el camino a producto pasa por resolver ~7 vacíos Categoría A** (sobre todo las 4 responsabilidades huérfanas + atomicidad + permisos + test-infra), que son **decisiones de binding/gobierno**, no de razonamiento. C5 puede especificarse en paralelo porque su frontera con C4 es nítida (ver `C5_PREPARATION.md`).
