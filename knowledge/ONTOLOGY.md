---
urn: nexus:metodo:ontologia
title: Ontología Oficial de NEXUS — el Canon (vocabulario semántico del ecosistema)
plane: metodo
stratum: meta
type: ontology
owner: N-LABS (custodio)
lifecycle_state: canonical
confidence: normative
evidence: NCA aprobada (2026-06-25) + 6 deltas cognitivos
provenance: founder-approved
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,     why: "la semántica opera bajo la identidad invariante", date: 2026-06-25 }
  - { rel: especifica,      target_urn: nexus:metodo:memory-os,   why: "da significado a los valores que el esquema permite", date: 2026-06-25 }
  - { rel: delega-en,       target_urn: nexus:metodo:gobernanza,  why: "la mecánica epistémica de confianza/contradicción vive allá", date: 2026-06-25 }
  - { rel: define,          target_urn: nexus:metodo:cognicion,   why: "los tipos del bucle de aprendizaje se definen aquí, su dinámica allá", date: 2026-06-25 }
---

# Ontología Oficial de NEXUS — el Canon

> **Qué es este documento.** El vocabulario oficial del ecosistema: el **significado canónico** de
> cada concepto. Todo documento, Skill, Goal, ADR o LLM futuro DEBE usar **exclusivamente** este
> lenguaje. No describe comportamiento ni implementación; describe **significado**.
>
> **Fronteras (anti-duplicación).** Esquema de nodo → `nexus:metodo:memory-os`. Contenido de la
> identidad → `nexus:identidad:core`. Dinámica epistémica (confianza, contradicción, decaimiento)
> → `nexus:metodo:gobernanza`. Aquí solo: **semántica de planos, estratos, tipos y relaciones.**

---

## A. Los Planos (eje de naturaleza)

Un nodo pertenece a **exactamente un** plano.

- **`identidad`** (Plano 0) — lo invariante: qué somos, qué nunca rompemos. Restringe a los otros tres. *Territorio, Mapa y Método operan dentro de él.*
- **`territorio`** (Operational Graph) — lo que NEXUS *es y hace*: capacidades, dominios, módulos, mecanismos, operación. **El territorio se describe; no describe.**
- **`mapa`** (Knowledge Graph) — lo que NEXUS *sabe* sobre su territorio: decisiones, patrones, investigación, lecciones. **El mapa describe y justifica al territorio.**
- **`metodo`** (Meta) — *cómo* se produce y gobierna el conocimiento: ontología, gobernanza, N-LABS, el sistema de memoria.

---

## B. Los Estratos (eje de abstracción)

Un nodo de Territorio vive en un estrato; el Mapa puede engancharse a cualquiera.

`telos` (propósito) › `estrategia` › `capacidad` (intención durable, sin tecnología) › `dominio` (áreas y entidades del negocio) › `realizacion` (cómo se encarna: módulos, features) › `mecanismo` (piezas concretas: APIs, jobs) › `operacion` (verdad en runtime) · `meta` (el sistema hablando de sí mismo).

Regla canónica: **Capacidad ≠ Feature ≠ Módulo.** Capacidad = intención; Feature = superficie de valor; Módulo = unidad de realización. Nunca se usan como sinónimos.

---

## C. El Canon de Tipos

Formato de cada entrada: **Es / No es / Usar cuando / Produce / Consume / Relaciones permitidas / Prohibidas / Ciclo de vida / Abstracción / Significado canónico.**

### Plano IDENTIDAD

**Identity** — *plano identidad · telos · máxima abstracción.*
Es: el núcleo invariante del ecosistema (un único nodo: `nexus:identidad:core`). No es: estrategia ni roadmap (eso cambia). Usar cuando: se afirma algo que no debe cambiar sin ADR. Produce: founder. Consume: todos. Permitidas: `gobierna`→cualquier nodo. Prohibidas: ser `superseded` salvo por ADR del founder; `deriva-de` algo del Mapa (la identidad no se deriva de evidencia). Ciclo: `canonical` permanente. Significado: lo que NEXUS es y nunca rompe.

**Principle** — *identidad · telos.*
Es: una regla rectora permanente (p. ej. "reusar > crear"). No es: una decisión puntual (eso es DecisionRecord). Usar cuando: se enuncia un criterio que gobierna muchas decisiones. Produce: founder. Consume: todos. Permitidas: `gobierna`→Decisión/Patrón/Capacidad. Prohibidas: contradecir Identity. Ciclo: estable; cambia por ADR. Significado: criterio que no se negocia caso a caso.

**Value** — *identidad · telos.* Es: un Principle de naturaleza cultural/ética. Se rige idéntico a Principle. (Subtipo de Principle; no se modela aparte salvo necesidad.)

### Plano TERRITORIO

**Capability** — *territorio · capacidad.*
Es: una habilidad operativa durable en lenguaje de negocio ("cobrar a un cliente"). No es: módulo, feature ni API. Usar cuando: se nombra *qué puede hacer* NEXUS, sin tecnología. Produce: Product. Consume: cliente (como valor), N-LABS (mide madurez). Permitidas: `realizada-por`→Módulo; `expone`→Feature; `medida-por`←Métrica; `gobernada-por`←Principle. Prohibidas: `depende-de`→Mecanismo (una capacidad no depende de una pieza concreta). Ciclo: latente→activada→optimizada; rara vez muere. Significado: intención de valor durable.

**Domain** — *territorio · dominio.*
Es: un área conceptual del negocio (Revenue, Service, Business Ops). No es: un módulo. Usar cuando: se agrupan entidades/procesos afines. Produce: Product+Arquitecto. Consume: todos. Permitidas: `contiene`→Entity/Process. Prohibidas: `contiene`→Módulo (los módulos realizan dominios, no los componen). Ciclo: estable. Significado: subdivisión conceptual del negocio.

**Entity** — *territorio · dominio.*
Es: un objeto del negocio con identidad e historia (Cliente, Orden de Trabajo, Cotización, Factura, Pago, Activo, Técnico). No es: una tabla ni un tipo de datos (eso es Mecanismo). Usar cuando: se nombra un sustantivo del negocio. Produce: Product+Arquitecto. Consume: todos. Permitidas: `participa-en`→Process; `polimórfica-con`→Entity. Prohibidas: `depende-de`→Mecanismo. Ciclo: por máquina de estados explícita. Significado: el concepto, no su persistencia.

**Process** — *territorio · dominio.*
Es: un flujo del negocio con estados (Golden Path, ciclo de vida de una WO). No es: un job técnico (eso es Mecanismo·Automation). Usar cuando: se describe una secuencia de negocio. Produce: Product. Consume: Actor. Permitidas: `opera-sobre`→Entity; `dispara`→Event. Prohibidas: vivir en `mecanismo`. Ciclo: versionado. Significado: cómo fluye el negocio.

**Module** — *territorio · realizacion.*
Es: una unidad de realización con frontera (crm, service, billing…). No es: una capacidad ni una carpeta. Usar cuando: se nombra *dónde* se encarna una capacidad. Produce: Arquitecto. Consume: devs, LLM. Permitidas: `realiza`→Capability; `depende-de`→Module; `gobernado-por`←DecisionRecord; `restringido-por`←QualityAttribute. Prohibidas: `realiza`→Feature (los módulos realizan capacidades; las features son superficies). Ciclo: refactor libre; frontera/contrato → ADR. Significado: unidad reemplazable de implementación.

**Feature** — *territorio · realizacion.*
Es: una superficie de valor visible (pantalla, flujo, acción). No es: una capacidad (intención) ni un módulo (estructura). Usar cuando: se nombra algo que el usuario ve/usa. Produce: Product. Consume: cliente. Permitidas: `expuesta-por`←Capability; `realizada-en`→Module. Prohibidas: `gobierna`→Capability (invierte la jerarquía). Ciclo: nace/cambia/retira. Significado: la cara visible de una capacidad.

**Mechanism** — *territorio · mecanismo.* (subtipos: API, Integration, Automation, Job/Cron, RPC)
Es: una pieza concreta que produce efectos en runtime. No es: una capacidad (intención). Usar cuando: se nombra un contrato técnico concreto. Produce: Arquitecto. Consume: Módulos. Permitidas: `pertenece-a`→Module; `realiza`→parte de Capability. Prohibidas: `gobierna` cualquier nodo del Mapa. Ciclo: por contrato + ADR. Significado: el cómo concreto.

**Actor** — *territorio · transversal.*
Es: un rol que interactúa con NEXUS (Provider, Tenant-admin, Técnico, Cliente final). No es: una persona (instancia). Usar cuando: se define quién hace/ve algo. Produce: Product. Consume: permisos, vistas. Permitidas: `ejecuta`→Process; `consume`→Feature. Prohibidas: tener datos (los datos son del Tenant). Ciclo: estable. Significado: arquetipo de interacción.

**Tenant** — *territorio · operacion.*
Es: la organización cliente y su grafo de instancia. No es: un Actor. Usar cuando: se habla de un cliente concreto y sus datos. Produce: el propio cliente. Consume: Capabilities. Permitidas: `instancia-de`→Capability; `genera`→Event/Metric. **Prohibidas: enlazar DIRECTO a Pattern** (debe pasar por anonimización/abstracción — protege la frontera). Ciclo: por contrato comercial. Significado: instancia operativa privada (ver Customer Graph en `nexus:metodo:cognicion`).

**QualityAttribute** — *territorio · transversal (restricción).*
Es: una propiedad transversal exigida (Seguridad, Performance, UX, Accesibilidad). No es: una feature. Usar cuando: se impone una restricción no-funcional. Produce: Arquitecto/Diseño. Consume: Módulos. Permitidas: `restringe`→Module/Mechanism. Prohibidas: ser `realizada-por`. Ciclo: por política. Significado: constraint no-funcional.

**Event** — *territorio · operacion.*
Es: un hecho ocurrido en runtime (algo pasó). No es: una métrica (agregado). Usar cuando: algo sucede que el sistema registra. Cuando dispara aprendizaje, juega el rol de **Señal**. Produce: Operación. Consume: Métrica, Problem. Permitidas: `disparado-por`←Process; `alimenta`→Metric/Problem. Prohibidas: portar creencia. Ciclo: inmutable (append-only). Significado: el átomo factual del runtime.

**Metric** — *territorio · operacion.*
Es: una medición agregada (utilización, SLA, revenue). No es: un Outcome de experimento (eso es Mapa). Usar cuando: se cuantifica el estado operacional. Produce: Operación. Consume: Capability (la mide), Recommendation. Permitidas: `mide`→Capability/Process. Prohibidas: justificar decisiones por sí sola sin Outcome. Ciclo: serie temporal. Significado: el termómetro del territorio.

### Plano MAPA (conocimiento)

**Problem** — *mapa · cualquier estrato.*
Es: una dificultad que vale resolver, derivada de Señales. No es: una solución ni una hipótesis. Usar cuando: se enmarca *qué* hay que resolver. Produce: cualquiera; curado por N-LABS. Consume: Hypothesis. Permitidas: `derivado-de`←Event; `origina`→Hypothesis. Prohibidas: saltar directo a Pattern sin Hypothesis/Experiment. Ciclo: abierto→entendido→resuelto. Significado: el inicio del bucle de aprendizaje.

**Hypothesis** — *mapa.*
Es: una afirmación **falsable** aún no probada. No es: una conclusión ni un patrón. Usar cuando: se postula "creemos que X causa Y". Produce: N-LABS. Consume: Experiment. Permitidas: `responde-a`→Problem; `probada-por`→Experiment. Prohibidas: **alcanzar `canonical`** (una hipótesis no es verdad: gradúa a Lesson/Pattern). Ciclo: propuesta→en-prueba→confirmada→refutada. Abstracción: creencia de baja confianza. Significado: una apuesta explícita y verificable.

**Experiment** — *mapa.*
Es: la prueba diseñada para confirmar/refutar una Hipótesis. No es: una Investigación (más amplia). Usar cuando: se ejecuta una validación con criterio. Produce: N-LABS. Consume: Outcome. Permitidas: `prueba`→Hypothesis; `produce`→Outcome; `corre-en`→Tenant (con consentimiento). Prohibidas: producir Pattern directamente (pasa por Outcome→Lesson). Ciclo: diseñado→corriendo→concluido. Significado: el acto de poner a prueba una creencia.

**Outcome** — *mapa.*
Es: el resultado **medido** de un Experimento (incluye ROI/impacto). No es: una Metric operacional. Usar cuando: se cierra el lazo evidencia↔creencia. Produce: N-LABS. Consume: Lesson, Pattern (sube/baja confianza). Permitidas: `producido-por`←Experiment; `confirma`/`refuta`→Hypothesis; `evidencia`→Pattern. Prohibidas: existir sin Experiment de origen. Ciclo: inmutable. Significado: la verdad empírica que alimenta la confianza.

**DecisionRecord (ADR)** — *mapa · cualquier estrato.*
Es: una elección justificada, fechada e inmutable (contexto, opciones, consecuencias). No es: documentación de cómo funciona algo. Usar cuando: se decide algo arquitectónicamente significativo. Produce: Arquitecto (founder si toca Identidad/Estrategia). Consume: futuros LLM/humanos. Permitidas: `justifica`→(Module/Capability/Mechanism); `supersede`→DecisionRecord; `deriva-de`←Research/Audit; `respeta`→Principle. Prohibidas: editarse (se supersede). Ciclo: propuesto→aceptado→superseded. Significado: una decisión con memoria.

**Pattern** — *mapa · realizacion/mecanismo.*
Es: una forma de solución reutilizable, probada ≥2 veces, con contexto de aplicabilidad y confianza. No es: una decisión puntual ni una librería. Usar cuando: una solución se repite y se valida. Produce: N-LABS (curador), Arquitecto (aprobador). Consume: Playbook, Recommendation. Permitidas: `evidenciado-por`←Outcome/CaseStudy; `aplicado-en`→Capability; `contradice`→AntiPattern; `madura-a`→Principle. **Prohibidas: `depende-de`→Module concreto** (un patrón es abstracto). Ciclo: emergente→validado→(principio candidato); puede degradar a AntiPattern. Significado: conocimiento reutilizable que compone.

**AntiPattern** — *mapa.* Es: una forma que parece buena y falla. Se rige como Pattern invertido; relación clave `contradice`→Pattern. Significado: trampa documentada.

**Research (Inquiry)** — *mapa · método-adyacente.*
Es: una línea de investigación con preguntas y hallazgos. No es: una conclusión cerrada (al concluir emite Lesson/ADR). Usar cuando: se explora un espacio amplio. Produce: N-LABS. Consume: Lesson, Pattern candidato. Permitidas: `investiga`→Problem; `produce`→Lesson/DecisionRecord. Prohibidas: quedar sin producir conocimiento reutilizable. Ciclo: abierta→investigando→concluida. Significado: exploración que deja activo.

**Lesson** — *mapa.*
Es: un aprendizaje destilado (de Outcome/Research/Incidente). No es: un patrón (más general/reutilizable). Usar cuando: se captura "qué aprendimos". Produce: N-LABS. Consume: Pattern, Playbook. Permitidas: `deriva-de`←Outcome/Audit; `refina`→Pattern/Playbook. Prohibidas: contradecir sin registrar la contradicción. Ciclo: acumulativa. Significado: experiencia convertida en conocimiento.

**CaseStudy** — *mapa.*
Es: la narrativa anonimizada de un cliente (problema→solución→resultado). No es: el dato del cliente. Usar cuando: se evidencia un patrón o se vende. Produce: N-LABS + Ventas. Consume: Pattern (evidencia), Marketing. Permitidas: `evidencia`→Pattern; `deriva-de`←Tenant **solo vía anonimización**. Prohibidas: contener PII o dato identificable. Ciclo: versionado. Significado: prueba de valor reutilizable.

**Prompt** — *mapa.*
Es: un activo de instrucción para IA (Prompt Library), versionado por evaluación. No es: un Playbook (proceso humano+sistema). Usar cuando: se reutiliza una instrucción a un LLM. Produce: N-LABS. Consume: LLMs/Skills. Permitidas: `aplica`→Pattern; `evaluado-por`←Outcome. Prohibidas: alcanzar `canonical` sin evaluación. Ciclo: versionado. Significado: conocimiento operativo para modelos.

**Framework** — *mapa · meta-adyacente.* Es: una lente conceptual (el filtro de 5 preguntas, esta ontología es meta). No es: un patrón de implementación. Significado: modelo mental reutilizable.

**GlossaryTerm** — *mapa.* Es: la definición canónica de una palabra del ecosistema. Permitidas: `define`→Entity/Capability. Prohibidas: dos términos para un mismo concepto. Significado: vocabulario controlado de apoyo (este Canon es su raíz).

**Risk** — *mapa.* Es: una incertidumbre nombrada con impacto. Ciclo: abierto→mitigado→cerrado. Permitidas: `amenaza`→Capability/Module; `mitigado-por`→DecisionRecord. Significado: lo que podría romperse.

**Requirement** — *mapa.* Es: un "debe cumplirse" con criterio de aceptación. Permitidas: `restringe`→Feature/Module. Significado: condición de aceptación.

### Plano MÉTODO

**Methodology** — Es: cómo trabajamos (fase de activación, regla de priorización, Goals incrementales). Produce: founder+N-LABS. Permitidas: `gobierna`→procesos de trabajo. Significado: el cómo del trabajo.

**GovernanceRule** — Es: quién puede cambiar qué conocimiento y bajo qué validación. Vive consolidada en `nexus:metodo:gobernanza`. Significado: las reglas de cambio del conocimiento.

**Ontology** — Es: este documento (auto-referencial; nodo de su propio grafo). Significado: el vocabulario del ecosistema.

**Specification** — Es: un contrato del sistema (p. ej. `nexus:metodo:memory-os`). Significado: contrato normativo de infraestructura.

**NLABS** — Es: el motor de aprendizaje inter-cliente (no un módulo del producto). Produce: Patrones validados, Playbooks, Prompts, el Meta. Consume: Señales, Customer Graphs anonimizados, Problemas. Permitidas: `produce`→(Pattern/Lesson/Playbook/Prompt); `observa`→Tenant (anonimizado). Prohibidas: entregar al cliente la Pattern Library con confianza/evidencia (frontera de asimetría, ver CORE). Significado: la fuente de la ventaja competitiva.

---

## D. El Vocabulario de Relaciones (aristas)

Toda arista usa **un** verbo de esta lista, es dirigida y lleva `why`+`date`. `(A) verbo → (B)` se lee "A verbo B".

**Estructurales:** `parte-de`/`contiene` · `es-un`/`especializa` · `depende-de`.
**Mapa→Territorio (binding):** `describe` · `justifica` · `gobierna` · `realiza` · `restringe` · `mide`.
**Dinámica del conocimiento:** `deriva-de` · `supersede` · `refina` · `contradice` · `evidencia` · `responde-a` · `aplica` · `madura-a` · `confirma`/`refuta`.
**Temporal/causal:** `precede` · `causa` · `dispara`.
**Autoría:** `propiedad-de` · `aprobado-por` · `restringido-por`.

### Relaciones PROHIBIDAS (reglas globales de integridad)

1. **El Territorio nunca `justifica`/`gobierna` al Mapa.** El conocimiento describe/justifica el territorio, no al revés.
2. **Un Pattern nunca `depende-de` un Module concreto** (acopla lo abstracto a lo concreto). Solo `aplica`→Capability.
3. **Un Tenant nunca enlaza directo a un Pattern** (debe pasar por anonimización/abstracción). Protege la frontera de CORE.
4. **`Identity` no puede ser `superseded`** salvo por ADR del founder; ni `deriva-de` evidencia.
5. **`Hypothesis` no puede ser `canonical`** (gradúa a Lesson/Pattern); ni un `Experiment` produce Pattern sin pasar por Outcome→Lesson.
6. **`contains`/`parte-de` no cruza planos** (la contención es estructural intra-plano).
7. **`supersede`, `deriva-de`, `madura-a` deben ser acíclicas** (no hay ciclos de versión ni de derivación).
8. **Un nodo `canonical` no puede `supersede` apuntar a un `draft`** (solo se supersede entre estados comparables).

---

## E. Regla canónica de uso

Este documento es el **lenguaje oficial**. Todo futuro documento, Skill, Goal, ADR o LLM:
- DEBE usar **solo** estos planos, estratos, tipos y verbos de relación.
- Antes de introducir un tipo o relación nuevos, DEBE verificar que no exista aquí; si falta algo real, se añade **por ADR**, nunca de facto.
- Un concepto se nombra con su **tipo canónico**; los sinónimos coloquiales se evitan en la memoria.

---

*Este documento es el nodo `nexus:metodo:ontologia` y es el Canon oficial del ecosistema NEXUS.
Su semántica se complementa con: identidad (`nexus:identidad:core`), esquema/sustrato
(`nexus:metodo:memory-os`), dinámica cognitiva (`nexus:metodo:cognicion`) y gobernanza epistémica
(`nexus:metodo:gobernanza`). Cambiar el Canon requiere un ADR.*
