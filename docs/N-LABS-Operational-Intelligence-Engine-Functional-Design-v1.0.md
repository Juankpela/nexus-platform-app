---
urn: nexus:mapa:nlabs-operational-intelligence-engine
title: N-LABS Operational Intelligence Engine — Functional Design v1.0
plane: mapa
stratum: realizacion
type: specification
owner: Lead Product Engineer (bajo custodia de N-LABS)
lifecycle_state: draft            # propuesta para aprobación; no implementar hasta aceptación
confidence: hypothesis            # es un diseño, no una verdad validada
evidence: auditoría funcional de NEXUS (2026-06-25) + Discovery Engine v1.0 + Cognitive Layer + Governance
provenance: Claude (Opus 4.8) — Lead Product Engineer, Goal PRODUCT-001
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,        why: "el motor opera dentro del Núcleo Invariante; NEXUS nunca es recomendación por defecto", date: 2026-06-25 }
  - { rel: realiza,         target_urn: nexus:metodo:cognicion,      why: "materializa el Bucle de Aprendizaje (§2) en runtime sobre datos reales", date: 2026-06-25 }
  - { rel: usa,             target_urn: nexus:metodo:ontologia,      why: "usa exclusivamente los tipos del Canon (Event, Metric, Problem, Hypothesis, Outcome, Pattern…)", date: 2026-06-25 }
  - { rel: aplica,          target_urn: nexus:nlabs:discovery-engine, why: "Modo 1 ejecuta los 6 patrones + fórmula + árbol del Discovery Engine v1.0", date: 2026-06-25 }
  - { rel: restringido-por, target_urn: nexus:metodo:gobernanza,     why: "promoción/decaimiento de confianza siguen los umbrales §5", date: 2026-06-25 }
---

# N-LABS Operational Intelligence Engine — Functional Design v1.0

> **Naturaleza de este documento.** Diseño **funcional** (no de UI, no de código). Describe el
> **flujo lógico** del motor: qué observa, qué infiere, qué recomienda, cómo valida y cómo aprende.
> No propone arquitectura nueva, no modifica el Memory OS, no redefine N-LABS ni NEXUS. **Reutiliza
> todo lo que ya existe** y nombra lo mínimo que falta.
>
> **Estado:** `draft` — propuesto para aprobación. **No se implementa código hasta aprobación.**

---

## 0. Tesis en una frase

> **El Operational Intelligence Engine no es un módulo. Es una *consulta sobre el grafo* (Cognitive
> Layer §7) ejecutada en bucle: lee los `audit_events` y los KPIs que NEXUS ya produce, los convierte
> en Señales → Problemas → Hipótesis → Recomendaciones con la honestidad del Discovery Engine, mide el
> Outcome real y deja el aprendizaje como nodos del Memory OS.**

Nada de esto exige una capa arquitectónica nueva. El Canon ya nombra cada pieza; el sustrato de datos
ya las emite; la capa de IA ya existe en el repositorio. Este diseño **conecta** lo que ya está.

---

## 1. Principio rector y los dos modos

N-LABS es un **motor de inteligencia operacional**, no un módulo del producto (Ontología, tipo
`NLABS`). Tiene dos modos sobre **el mismo bucle**:

| Modo | Cuándo | Qué hace | Insumo | Salida |
|------|--------|----------|--------|--------|
| **1 · Discovery** | *Antes* de vender | Analiza una empresa, halla cuellos de botella, prioriza, recomienda la mejor solución existente (proceso / integración / RPA / agente / SaaS / NEXUS / **ninguna**) | Assessment (7 bloques del Discovery Engine) + datos de la operación | Diagnóstico con Top-3 y árbol de decisión auditable |
| **2 · Continuous Improvement** | *Después* de implementar | Observa la operación en runtime, detecta nuevos cuellos, calcula impacto, propone mejoras, **aprende** | `audit_events` + Métricas que NEXUS ya calcula | Recomendaciones con evidencia + Lecciones/Patrones |

**Regla de oro (de CORE y del Discovery Engine):** NEXUS **nunca** es la recomendación por defecto.
En cada diagnóstico el motor registra *por qué descartó cada clase de solución* antes de llegar a
NEXUS. La neutralidad no es una intención: es un registro auditable.

**El primer cliente de N-LABS somos nosotros** (§10): el Modo 2 se enciende primero sobre la propia
operación de Colibri/NEXUS antes que sobre clientes externos.

---

## 2. Auditoría funcional de NEXUS (las 7 preguntas del Goal)

Resultado de la auditoría del repositorio (`nexus-platform/modules/**`, `supabase/migrations/**`).
Esta es la base de evidencia sobre la que se diseña el motor.

### 2.1 — Qué módulos ya existen (19)

`identity` · `tenancy` · `authorization` · `platform` · `request-context` · **`audit`** · `crm` ·
`forecasting` · `service` · `scheduling` · `dispatch` · `field-execution` · `billing` · `inventory` ·
`notifications` · `integrations` · `api` · `calendar` · `organizations`.

Arquitectura uniforme por módulo: `domain/` (entidades + máquinas de estado puras) → `application/`
(use-cases + ports) → `infrastructure/` (Supabase) → `presentation/` (server actions) → `composition.ts`
(raíz de cableado). **Todo este patrón se reutiliza tal cual; el motor no lo altera.**

### 2.2 — Qué información genera cada módulo (entidades con máquina de estados)

El "lazo de dinero" y la cadena de servicio están completamente instrumentados:

| Entidad | Estados | Sellos de tiempo (cycle time) |
|---------|---------|-------------------------------|
| **Lead** | new→working→qualified→disqualified→**converted** | `created_at`, `converted_at` |
| **Opportunity** | new→discovery→proposal→negotiation→**won/lost** | `created_at`, `updated_at`, `expected_close_date` |
| **Quote** | draft→pending_approval→approved→sent→**accepted**/expired/rejected | `created_at`, `expiration_date` |
| **Case** | new→working→waiting_customer→escalated→resolved→closed | `created_at`, `resolved_at`, `closed_at`, `sla_due_at` |
| **WorkOrder** | new→scheduled→dispatched→in_progress→on_hold→**completed**/cancelled | `created_at`, `scheduled_start/end`, `actual_start/end`, `sla_due_at`, `billing_approved_at` |
| **Execution** (campo) | pending→accepted→on_site→working→**completed**/unable_to_complete | `accepted_at`, `arrived_at`, `started_at`, `completed_at`, `unable_to_complete_at`, `non_completion_reason` |
| **Assignment** | scheduled→in_progress→completed/cancelled | `scheduled_start/end`, `estimated_duration_minutes` |
| **Invoice** | draft→issued→partially_paid→**paid**/void | `issue_date`, `due_date` |
| **Payment** | recorded→reversed | `payment_date`, `reversed_at` |
| **Asset** | active→in_maintenance→down→retired | `last_service_at`, `next_service_due_at`, `health_score` |
| **InventoryTransaction** | receipt/consumption/adjustment/reservation/release (ledger inmutable) | `created_at` |

### 2.3 — Qué eventos relevantes produce cada módulo

**Hallazgo decisivo:** existe una bitácora **append-only universal** — la tabla `audit_events`
(`202606050001_foundation.sql`). **Cada** use-case que muta estado llama a `audit.append(...)` vía su
`composition.ts`. Es el único punto por el que pasa todo cambio de estado, ya cableado, ya indexado.

Esquema: `event_type`, `occurred_at`, `actor_type` (user/system/service), `actor_id`, `tenant_id`,
`subject_type`, `subject_id`, `action`, `metadata` (jsonb), `request_id`, `source`. Índices por
`(tenant_id, occurred_at)`, `(actor_id, occurred_at)`, `(subject_type, subject_id)`.

Vocabulario de eventos ya emitido (muestra real): `crm.opportunity.won` · `crm.opportunity.lost` ·
`quote.accepted` · `quote.sent` · `lead.converted` · `activity.completed` · `service.case.resolved` ·
`service.case.escalated` · `service.work_order.completed` · `work_order_execution.completed` ·
`work_order_execution.failed` (+ `non_completion_reason` en metadata) · `invoice.issued` ·
`payment.recorded` · `payment.reversed` · `scheduling.assignment.created` …

> **En la Ontología esto es exactamente un `Event` (territorio·operacion), que "cuando dispara
> aprendizaje juega el rol de Señal".** `audit_events` ya **es** el stream de Señales. El motor
> **lee** este log; no necesita instrumentar ningún módulo.

### 2.4 — Qué KPIs ya pueden calcularse (≈50, sin construir nada)

| Dominio | KPIs ya implementados | Fuente |
|---------|----------------------|--------|
| **Comercial** | `winRate`, `avgSalesCycleDays`, `avgDealSize`, `weightedRevenue`, `pipelineCoverage`, `forecastScore`, `riskScore`, conversión por etapa, `avgDaysInStage` | `modules/forecasting/**` |
| **Servicio/SLA** | `slaCompliancePct`, `breachedCount`, SLA on_track/at_risk/breached (4h/8h/24h/72h por prioridad), casos por estado/prioridad | `modules/service/domain/{sla,case-stats}.ts` |
| **Campo/Dispatch** | `success_rate` y `avg_work_minutes` por técnico (`technician_outcomes` RPC), `success_rate` por tipo de incidencia (`technician_issue_type_outcomes` RPC), `utilizationPercent`, técnicos overloaded | `modules/dispatch/**`, `modules/scheduling/**`, RPCs SQL |
| **CRM** | `pipelineValue`, `wonRevenue`, conteos, pipeline por etapa | `get-dashboard-stats.ts` |
| **Persistencia temporal** | `forecast_snapshots` ya guarda KPIs *fechados* (serie de tiempo para tendencias) | `20260608001_forecasting.sql` |

> En la Ontología esto es `Metric` (territorio·operacion). `forecast_snapshots` ya prueba el patrón
> de **serie temporal de Métricas** — la base para detectar **tendencias** sin construir nada nuevo.

### 2.5 — Qué información falta para detectar cuellos de botella

Honestidad (regla anti-figuras-fabricadas): de los **6 patrones de fricción** del Discovery Engine,
4 son fuertemente observables hoy y 2 no:

| Patrón | ¿Observable en NEXUS hoy? | Brecha |
|--------|---------------------------|--------|
| Captura manual | Parcial | proxy por `cases.origin='manual'`, baja vía import/API; falta marca explícita de "dato digitado a mano" |
| Espera / cola | **Sí** | tiempo en `waiting_customer`, `on_hold`, drafts añejos — directo |
| Reproceso / corrección | **Sí** | `non_completion_reason`, reaperturas, reversals, voids, revisiones — directo |
| Handoff frágil | **Sí** | gaps entre timestamps de entidades enlazadas — directo |
| Decisión sin dato | **No (débil)** | no hay telemetría de "se decidió sin consultar X"; sólo proxies indirectos |
| Búsqueda / no encontrar | **No** | no hay eventos de búsqueda/tiempo-en-pantalla |

**Conclusión de brecha:** para los patrones 5 y 6 se necesita (a) datos capturados en el **Assessment**
(Modo 1) o (b) telemetría de uso liviana. **No** se construye eso ahora; se documenta como límite y se
cubre con el Assessment hasta que exista demanda real.

### 2.6 — Qué capacidades actuales pueden reutilizarse (reusar > construir)

1. **`audit_events`** como stream de Señales (no instrumentar módulos).
2. **KPIs existentes** (`forecasting`, `service`, `dispatch`, RPCs `technician_outcomes`) como Métricas.
3. **`forecast_snapshots`** como patrón de serie temporal para tendencias.
4. **La capa de IA ya existente:**
   - `get-ai-revenue-insights.ts` → Claude Sonnet 4 → insights estructurados (type/severity/title/
     description/`estimatedImpact`/`forecastScore`/`riskScore`). **Es el patrón de razonamiento del motor.**
   - `report-classifier.ts` (**ADR-033**): la IA **sólo** transforma lenguaje natural → estructura;
     **nunca es operacionalmente decisiva** por sí sola. Este principio se hereda íntegro.
5. **El Memory OS** como destino del aprendizaje: los tipos `Problem/Hypothesis/Experiment/Outcome/
   Lesson/Pattern` **ya están definidos** en el Canon. Hoy el grafo del plano **Mapa está vacío de
   instancias**; el motor lo empieza a poblar (es justo para lo que el OS fue diseñado).
6. **El patrón compositivo** (`composition.ts` + ports + use-cases) para añadir lecturas sin tocar nada.

### 2.7 — Qué capacidades nuevas realmente hacen falta (lo mínimo)

Sólo cuatro, todas finas y todas alineadas con patrones que ya existen:

1. **Capa de Detectores (Rules)** — funciones puras/consultas que leen `audit_events` + tablas
   operativas y emiten Métricas + *Problemas candidatos*. Mismo molde que `technician_outcomes` y
   `get-dashboard-stats`. *(read-only; cero escritura en módulos)*
2. **Orquestación de Razonamiento** — reutiliza el cliente Claude existente para convertir Problemas
   en Hipótesis + Recomendaciones, **encajada en el árbol de decisión del Discovery Engine** y la
   salvaguarda anti-sesgo. *(la IA explica/estructura, no decide — ADR-033)*
3. **Materialización de nodos Mapa** — escribir Problem/Hypothesis/Outcome/Lesson/Pattern como
   Unidades de Memoria con la **cabecera canónica existente**, añadiendo su fila al Índice. *(append,
   sin cambiar el esquema del OS)*
4. **(Opcional, diferible) Operational Snapshot** — generalizar `forecast_snapshots` a una foto
   periódica de KPIs multi-módulo. Diferible porque las tendencias pueden derivarse directamente del
   `audit_events` fechado.

> Todo lo demás es **reutilización**. No hay capa arquitectónica nueva, ni tablas de "intelligence",
> ni framework. Esto respeta el veto de CORE a "frameworks/abstracciones especulativas".

---

## 3. El puente: cómo el flujo del Goal mapea 1:1 al Canon que ya existe

El flujo lógico que pediste **ya está nombrado** por la Ontología y el Cognitive Layer. No se inventa
ningún concepto:

```
 FLUJO DEL GOAL            TIPO DEL CANON (Ontología)         DE DÓNDE SALE EN NEXUS (evidencia)
 ─────────────────────────────────────────────────────────────────────────────────────────────
 Evento observado     →    Event (rol de Señal)          →   audit_events.event_type + metadata
 Regla                →    Detector (Rule) sobre Métricas →   función tipo technician_outcomes / SQL
 Hipótesis            →    Hypothesis (falsable)          →   nodo Mapa nuevo (cabecera canónica)
 Nivel de confianza   →    confidence (curva de madurez)  →   Governance §4–§5 (hypothesis→…→validated)
 Impacto              →    Metric + Impacto_$ (fórmula)   →   KPIs existentes + fórmula Discovery §02
 Recomendación        →    Recommendation (consulta grafo)→   árbol Discovery §03 + IA (ADR-033)
 Resultado esperado   →    Outcome esperado (predicción)  →   se fija como criterio medible
 Validación posterior →    Experiment → Outcome (medido)  →   re-lectura de la misma Métrica
 Aprendizaje          →    Lesson / Pattern               →   nodo Mapa (alimenta Memory OS)
```

Esto es, literal, el **Bucle de Aprendizaje** del Cognitive Layer §2:

```
Señal/Evento → Problema → Hipótesis → Experimento → Outcome(medido)
            → Lección → Patrón → Playbook → (opera) → nuevas Señales → …
```

**Regla de tránsito (heredada, innegociable):** una creencia no salta pasos. Una Hipótesis no se vuelve
Patrón sin pasar por Experimento→Outcome→Lección. Saltar pasos = conocimiento sin evidencia = prohibido.

---

## 4. Cómo funciona el motor — el flujo lógico (núcleo común a ambos modos)

El motor es un **bucle de 9 pasos**. Es el mismo para Discovery y Continuous Improvement; cambia el
*insumo* (assessment vs. runtime) y la *cadencia* (puntual vs. continua).

### Paso 1 — Observación (Señal)
Lee el stream de `audit_events` y consulta las tablas operativas. Cada evento relevante es una **Señal**
con `tenant_id`, `subject`, `occurred_at`, `metadata`. *No escribe nada en los módulos: sólo observa.*

### Paso 2 — Regla / Detector (de Señales a Métrica)
Un conjunto de **Detectores** deterministas agrega Señales en **Métricas** y compara contra una
**línea base** (la propia serie histórica del tenant, no un número mágico). Ejemplos de Detector:
"tasa de `unable_to_complete` por razón", "gap medio `quote.accepted → work_order.created`",
"días de antigüedad de invoices en `draft`". Cada Detector mapea a **uno de los 6 patrones de fricción**.
Un Detector que cruza umbral emite un **Problema candidato** con su evidencia (consulta + valores).

### Paso 3 — Hipótesis (falsable)
Para cada Problema, el motor genera una **Hipótesis falsable** del tipo *"creemos que X causa Y, y si
hacemos Z, Y mejora en W"*. Aquí entra la IA (patrón `get-ai-revenue-insights`) **sólo para redactar y
estructurar** la hipótesis a partir de la evidencia; la evidencia es del Detector, no del modelo
(ADR-033). La Hipótesis nace en `confidence: hypothesis` (Governance §4).

### Paso 4 — Nivel de confianza
La Hipótesis porta confianza según la **curva de madurez** (Cognitive Layer §3, umbrales Governance §5):
`hypothesis (0) → observation (1 caso) → emerging (2–3) → validated (≥3 en ≥2 tenants, 0 refutaciones)`.
La **confianza del dato** (medido vs. estimado vs. anecdótico) entra además como factor en la fórmula
de prioridad (Discovery §02). Nada con confianza puramente anecdótica sube al Top-3.

### Paso 5 — Impacto (cuantificación en $)
Calcula el impacto con la **fórmula de prioridad del Discovery Engine v1.0** (no se inventa otra):

```
Prioridad = (Impacto_$anual × Frecuencia × Confianza_del_dato) ÷ (Esfuerzo_de_solución × Riesgo_de_cambio)
```

`Impacto_$anual` y `Frecuencia` salen de Métricas reales (p. ej. nº de revisitas × costo-hora; días de
mora × costo de capital). Salida: **ranking** de cuellos de botella → **Top-3** → el #1 es candidato a
primera acción.

### Paso 6 — Recomendación (la mejor solución, no NEXUS por defecto)
Recomendar es una **consulta sobre el grafo** (Cognitive Layer §7), encajada en el **árbol de decisión
de 6 niveles** del Discovery Engine (se detiene en el primero que aplica):

1. ¿Es regla/comportamiento humano? → **PROCESO** (no comprar nada).
2. ¿El dato existe y sólo no se habla? → **INTEGRACIÓN**.
3. ¿Tarea repetitiva, alto volumen, reglas claras? → **AUTOMATIZACIÓN / RPA**.
4. ¿Requiere juicio sobre contenido no estructurado? → **AGENTE DE IA**.
5. ¿Falta un sistema estándar de la industria? → **SOFTWARE EXISTENTE** (Salesforce/ServiceNow/SaaS).
6. ¿Ninguna plataforma opera este flujo **y** se repite en la vertical? → **NEXUS** (última opción).

**Salvaguarda anti-sesgo (auditable):** el motor registra *por qué descartó cada clase* antes de llegar
a NEXUS. Si NEXUS aparece sin que el árbol lo justifique paso a paso, **la recomendación se invalida**.

### Paso 7 — Resultado esperado (predicción medible)
Toda Recomendación fija un **Outcome esperado** explícito y medible *sobre la misma Métrica* que disparó
el Problema (p. ej. "la tasa de revisita por `missing_part` baja de 18% a <8% en 60 días"). Sin
predicción medible no hay recomendación: es lo que permite saber después si acertamos.

### Paso 8 — Validación posterior (Experimento → Outcome medido)
Tras implementar, el motor **re-lee la misma Métrica** en la ventana fijada. Eso es el **Experimento**;
su resultado es el **Outcome medido** (incluye ROI real vs. esperado). El Outcome **confirma o refuta**
la Hipótesis (Ontología: `Outcome confirma/refuta Hypothesis`).

### Paso 9 — Aprendizaje (alimenta el Memory OS)
- Si el Outcome **confirma**: la confianza **sube** un nivel (Governance §5). Repetido en ≥2 tenants →
  `validated` → candidato a **Patrón** (`Outcome evidencia Pattern`).
- Si **refuta**: la Hipótesis pasa a `refutada` (se conserva enlazada), y si un Patrón existente falla,
  **degrada a AntiPattern**.
- En ambos casos se destila una **Lesson** (`deriva-de Outcome`).
- Todo se escribe como **nodos del Memory OS** con cabecera canónica → el Índice crece por append.
- El producto operando genera **nuevas Señales** → el bucle se cierra y nunca deja de aprender.

```
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  audit_events / KPIs            (NEXUS ya los produce)                     │
   │        │                                                                   │
   │        ▼                                                                   │
   │   [1] Señal → [2] Detector/Regla → [3] Hipótesis → [4] Confianza →         │
   │   [5] Impacto($) → [6] Recomendación (árbol, NEXUS≠default) →              │
   │   [7] Outcome esperado → [8] Validación (Outcome medido) → [9] Lección/Patrón
   │        │                                                                   │
   │        └────────────►  Memory OS (nodos Mapa, append)  ───────┐           │
   │                                                                │           │
   │   nuevas Señales  ◄────────────  (el producto opera)  ◄────────┘           │
   └──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Modo 1 — Discovery (antes de vender)

Ejecuta el **Discovery Engine v1.0** sin desviarse. El bucle del §4 se alimenta del **Assessment de 7
bloques** (Contexto, Flujo de valor, Volúmenes/tiempos, Evidencia de fricción, Stack actual, Decisión/
cambio, Línea base económica) en vez del runtime.

- **Identificar:** los 6 patrones de fricción sobre el flujo de valor mapeado.
- **Priorizar:** la fórmula → Top-3.
- **Decidir clase:** el árbol de 6 niveles.
- **Recomendar:** proceso · integración · RPA · agente · SaaS · NEXUS · **nada** — con registro del
  descarte de cada clase (salvaguarda).
- **Registrar:** el diagnóstico alimenta el corpus (cada empresa estudiada es un activo reutilizable;
  Ontología `CaseStudy`, **anonimizado**, nunca PII — frontera de CORE).

**Disciplina vertical (DD + Blueprint):** el método es **genérico**, pero la **aplicación comercial
arranca en UNA vertical** (Field Service / Gas) y se generaliza por playbooks sólo cuando cada vertical
está probada. El motor es universal desde el día uno; el despliegue es secuencial. **No se abre una
segunda vertical hasta tener el playbook de la primera probado y documentado.**

---

## 6. Modo 2 — Continuous Improvement (después de implementar) y el catálogo de detección

Aquí el motor se enchufa al **runtime** (`audit_events` + KPIs) y corre el bucle de forma continua.
Esta sección responde, **con señales concretas y observables**, las preguntas del Goal. Cada fila es un
**Detector** (Paso 2) anclado a datos reales — nunca a intuición (criterio de aceptación 6).

| Pregunta del Goal | Patrón de fricción | Detector (señal observable real) | Métrica/umbral |
|-------------------|--------------------|----------------------------------|----------------|
| ¿Una operación tiene problemas? | (compuesto) | índice compuesto: cycle-times ↑ + tasa de breach SLA ↑ + tasa de reproceso ↑ vs. su propia base | desviación sostenida sobre línea base |
| ¿Tendencias? | (transversal) | comparar Métrica en ventana actual vs. ventana previa (patrón `forecast_snapshots`); pendiente del `occurred_at` | slope ≠ 0 sostenido |
| ¿Desperdicios? | Reproceso/Espera | revisitas (`non_completion_reason`), técnico ocioso (gap `utilizationPercent`), quotes `expired`, invoices `draft` añejos, `inventory_transactions.type='adjustment'` (merma) | $ desperdiciado/año |
| ¿Reprocesos? | Reproceso | tasa `work_order_execution.unable_to_complete` por razón; reaperturas de caso (`resolved→working`); revisiones de quote; `payment.reversed`; `invoice.void` | % sobre total |
| ¿Tiempos muertos? | Espera/Handoff | gaps entre timestamps: `accepted_at→arrived_at` (viaje/espera), `scheduled_start` vs `actual_start` (retraso), `quote.accepted→work_order` (handoff), `work_order.completed→invoice.issued` (lag facturación), `invoice.issued→payment` (lag cobro) | horas/días por gap |
| ¿Problemas comerciales? | Decisión/Espera | `winRate` ↓, `avgSalesCycleDays` ↑, opps estancadas (días sin `activity`), `pipelineCoverage` < 1, tasa de aceptación de quotes ↓ | vs. base + quota |
| ¿Problemas financieros? | Espera/Reproceso | AR aging (`issue_date` vs pago), `payment.reversed`, `partially_paid` estancadas, WO `completed` sin factura (billing lag), creep de descuentos | días de mora, $ |
| ¿Problemas operativos? | Espera/Reproceso | tasa de breach SLA (`work_order_alert_state`), WOs vencidas (`sla_due_at < now`), técnicos `overloaded` (util>100%), WOs en `on_hold`, tasa de reschedule | % y conteo |
| ¿Problemas de soporte? | Espera/Reproceso | `slaCompliancePct` de casos, tiempo en `waiting_customer`, tasa de reapertura, tasa de escalación, volumen `case_tracking_messages`, tiempo de resolución por `issue_type` | % y horas |
| ¿Problemas de adopción del sistema? | Captura/Decisión | volumen de `audit_events` por usuario/módulo en el tiempo; miembros activos ↓; módulos con ~0 eventos; features habilitadas y sin uso; `origin='manual'` alto; tasa de lectura de `notifications` (`read_at`) | tendencia de uso |

> **Hallazgo de alto valor:** `audit_events` es, además, **telemetría de adopción**. La caída de
> eventos por usuario/módulo es la señal más limpia de "el sistema no se está usando" — sin construir
> analítica de producto nueva.

**Cadencia.** El bucle no necesita streaming en tiempo real: corre por **lotes periódicos** (p. ej.
un job que ya tiene precedente — el scanner de SLA / `scan-overdue-work-orders` y el worker de export).
Reutiliza ese patrón de job; no introduce infraestructura de eventos nueva.

---

## 7. Detalle de los componentes funcionales

### 7.1 Reglas (Detectores)
- **Qué son:** consultas deterministas read-only sobre `audit_events` + tablas operativas, una por
  patrón de fricción × dominio. Puras y testeables (como las máquinas de estado del dominio).
- **Qué producen:** una Métrica + (si cruza umbral) un Problema candidato con su evidencia literal
  (la consulta y los valores). **La evidencia viaja con el Problema** — base de la auditabilidad.
- **Línea base:** la propia historia del tenant (auto-relativa), no umbrales universales fabricados.
  Para arrancar sin historia, el Assessment (Modo 1) aporta la base. *(Regla anti-figuras inventadas.)*

### 7.2 Generación de hipótesis
- La IA (cliente Claude ya existente) **redacta** la Hipótesis falsable a partir de la evidencia del
  Detector y propone la *clase* de solución candidata recorriendo el árbol. **No decide**: su salida es
  una propuesta estructurada que debe sostenerse en la evidencia adjunta (ADR-033).
- Toda Hipótesis nace `proposed`/`hypothesis`. Ningún modelo se auto-aprueba (Governance §9).

### 7.3 Priorización de recomendaciones
- Fórmula del Discovery Engine §02 (única). Ordena por Prioridad → Top-3 → #1.
- Penaliza fuerte la baja `Confianza_del_dato`: lo anecdótico no compite con lo medido.

### 7.4 Medición del impacto
- **Esperado:** se fija en el Paso 7 como predicción sobre la Métrica origen.
- **Real:** se mide en el Paso 8 re-leyendo esa Métrica (`Outcome`), con ROI real vs. esperado.
- Ambos quedan registrados → comparables → auditables.

### 7.5 Validación de acierto (¿acertamos?)
- `Outcome confirma/refuta Hypothesis`. Confirmación sube confianza; refutación la baja y, si aplica,
  degrada un Patrón a AntiPattern. **Bitemporal** (`valid_time`/`decision_time`): se puede preguntar
  "¿qué creíamos cuando recomendamos esto?".

### 7.6 Aprendizaje
- Destila **Lesson**; con evidencia repetida en ≥2 tenants, **Pattern** `validated` (Cognitive Layer
  §3–§4). El **decaimiento** (Governance §5) baja la confianza de Patrones no re-evidenciados (ventana
  default 12 meses). El aprendizaje **inter-cliente** sólo compone **intra-vertical** (DD): el corpus
  de gas no se mezcla con otro sector — coherente con el moat = dato vertical.

---

## 8. Frontera de datos y privacidad (no negociable — CORE)

- El **dato del cliente nunca cruza**; sólo el **patrón anonimizado** se vuelve activo de NEXUS.
- Un `Tenant` **nunca** enlaza directo a un `Pattern` (regla prohibida del Canon): pasa por
  anonimización → `CaseStudy` sin PII → `Pattern`.
- Multi-tenant: todo Detector respeta `tenant_id` y los permisos (`tenant.audit.read`, `forecasting.read`).
- La **asimetría de N-LABS** se preserva: al cliente se le entrega su diagnóstico y su mejora; la
  **Pattern Library con confianza/evidencia** es activo interno de N-LABS, no se entrega.

---

## 9. Reutilización vs. construcción (resumen ejecutable)

| Pieza del motor | ¿Reusa o construye? | Sobre qué |
|-----------------|---------------------|-----------|
| Stream de Señales | **Reusa** | `audit_events` (universal, ya cableado) |
| Métricas | **Reusa** | `forecasting`, `service`, `dispatch`, RPCs `technician_outcomes` |
| Serie temporal / tendencias | **Reusa** | patrón `forecast_snapshots` |
| Razonamiento IA | **Reusa** | `get-ai-revenue-insights` + `report-classifier` (ADR-033) |
| Tipos del bucle | **Reusa** | Canon (Problem/Hypothesis/Outcome/Lesson/Pattern) |
| Persistencia del aprendizaje | **Reusa** | Memory OS (append al Índice; esquema sin cambios) |
| Job/cadencia | **Reusa** | patrón `scan-overdue-work-orders` / export worker |
| Detectores (Rules) | **Construye (fino)** | molde `technician_outcomes` / `get-dashboard-stats` |
| Orquestación del bucle | **Construye (fino)** | encadena Detector→IA→árbol→Outcome |
| Primeros nodos Mapa | **Construye (instancias)** | el grafo Mapa hoy está vacío; se empieza a poblar |

**Cero** tablas nuevas obligatorias (el Operational Snapshot es opcional y diferible). **Cero**
arquitectura nueva. **Cero** cambios al Memory OS, la Ontología, la Gobernanza o CLAUDE.md.

---

## 10. El primer cliente somos nosotros (dogfooding)

Antes de venderlo, N-LABS analiza la **operación de Colibri/NEXUS**:

1. **Operación comercial:** ya corre sobre el CRM/forecasting de NEXUS → Modo 2 directo (winRate,
   ciclo de venta, opps estancadas, cobertura de pipeline).
2. **Proceso de soporte:** módulo `service` (casos, SLA, reaperturas, escalaciones).
3. **Proceso de desarrollo:** parcialmente fuera de NEXUS (git/issues); se cubre por Assessment (Modo 1)
   hasta que haya señales nativas — se documenta el límite, no se fuerza instrumentación.
4. **El propio producto NEXUS:** adopción por módulo/usuario vía `audit_events` (qué se usa, qué no).

**Por qué esto es coherente con la Due Diligence (y no la viola):**
- La DD prohíbe *construir producto antes del primer dólar* **para clientes externos**. El dogfooding
  **no es productizar**: es un lente read-only sobre datos que ya tenemos, que **genera el primer corpus**
  (lo que la DD pide), **valida el método** antes de venderlo y **rompe la dependencia del fundador**
  (lo que la DD exige para el mes 9–12). El Memory OS se usa como **infra interna mínima** (lo que la DD
  permite explícitamente).
- Si N-LABS es un motor de mejora continua, **debe mejorar primero nuestra propia organización**. Ese es
  el caso cero y la prueba de honestidad del producto.

---

## 11. Coherencia con la estrategia congelada + hallazgos

**No contradice** Memory OS, Ontología, Gobernanza, Cognitive Layer, Discovery Engine, ni la
arquitectura de NEXUS. Usa exclusivamente el vocabulario del Canon. Mantiene a NEXUS fuera del
default de recomendación.

**Hallazgo 1 (tensión, no bloqueante).** La DD dice "no software antes del primer dólar" y fija el
*scope de NEXUS* estrecho (capa fina para el agente de validación de fotos en gas/field service).
*Resolución:* este motor **no es producto nuevo ni amplía el scope de NEXUS**; es (a) el instrumento de
dogfooding interno y (b) la operacionalización del Discovery Engine que la **propia DD pide** para
generar corpus y romper dependencia del fundador. Se documenta; **no requiere ADR** (no bloquea: es
reutilización read-only sobre lo existente).

**Hallazgo 2 (brecha de datos).** Patrones de fricción 5 (decisión sin dato) y 6 (búsqueda/no
encontrar) no son observables hoy en runtime. *Resolución:* se cubren con el Assessment (Modo 1); no se
construye telemetría nueva hasta que exista demanda real (CORE: no sofisticar sobre vender).

**Hallazgo 3 (consistencia de namespace).** Al materializar nodos Mapa, sus URNs deben respetar el
formato real de 3 segmentos (`nexus:‹plano›:‹slug›`) — ya recogido en **ADR-BACKLOG-003**; no se
re-acuña nada, no bloquea.

Ningún hallazgo bloquea la implementación. Se procede en cuanto se apruebe este diseño.

---

## 12. Criterios de aceptación (verificación uno a uno)

| # | Criterio del Goal | ¿Cumple? | Cómo |
|---|-------------------|----------|------|
| 1 | Funciona con la arquitectura actual de NEXUS | ✅ | Lee `audit_events` + KPIs existentes; jobs tipo scanner ya existente |
| 2 | No requiere rediseñar el producto | ✅ | Cero tablas obligatorias, cero capas nuevas, cero cambios al Memory OS |
| 3 | Reutiliza al máximo lo existente | ✅ | §9: stream, métricas, IA, tipos, persistencia y job — todo reusado |
| 4 | Convierte a NEXUS en plataforma capaz de detectar/priorizar mejora continua | ✅ | Bucle §4 + catálogo de detección §6 + fórmula de prioridad |
| 5 | N-LABS usable primero en Colibri y luego en clientes | ✅ | §10 dogfooding; Modo 1 para externos |
| 6 | Cada recomendación justificada con evidencia observable, nunca intuición | ✅ | La evidencia viaja con el Problema; salvaguarda anti-sesgo invalida recomendaciones sin árbol |
| 7 | El sistema audita su propio desempeño | ✅ | §13 |

---

## 13. Auto-auditoría del motor (¿la mejora funcionó?)

Después de **cada recomendación implementada**, el motor responde (y lo escribe como `Outcome`+`Lesson`):

- **¿La mejora funcionó?** → comparación Métrica antes/después en la ventana fijada.
- **¿El ROI esperado se cumplió?** → ROI real vs. esperado (Paso 7 vs. Paso 8).
- **¿La hipótesis era correcta?** → `Outcome confirma/refuta Hypothesis`.
- **¿Qué aprendimos?** → `Lesson` destilada (`deriva-de Outcome`).
- **¿Qué cambiaremos la próxima vez?** → ajuste de Detector/umbral o de la clase de solución; si un
  Patrón falló, degrada a AntiPattern.

Ese aprendizaje **alimenta el Memory OS existente sin modificar su arquitectura**: nodos Mapa nuevos por
append, con cabecera canónica, enlazados por aristas tipadas del Canon. El motor mide también **su
propia tasa de acierto** (Hipótesis confirmadas / totales) como Métrica de N-LABS — el motor se audita a
sí mismo.

---

## 14. Qué NO hace este diseño (límites explícitos)

- No propone pantallas ni componentes UI (es diseño funcional).
- No instrumenta los módulos (observa el log que ya existe).
- No crea conceptos, tipos ni relaciones nuevas (usa el Canon).
- No modifica Memory OS, Ontología, Gobernanza, Discovery Engine ni CLAUDE.md.
- No hace de NEXUS la recomendación por defecto.
- No abre una segunda vertical antes de probar la primera.
- No entrega al cliente la Pattern Library con confianza/evidencia (frontera de asimetría).
- No implementa código: queda a la espera de aprobación.

---

*Nodo `nexus:mapa:nlabs-operational-intelligence-engine` (draft). Diseño funcional del Operational
Intelligence Engine de N-LABS. Su autoridad es de propuesta: alcanza `reviewed`/`canonical` sólo tras
aprobación del owner. No se implementa código hasta entonces. Cambiar este diseño = nueva versión por
append+supersede.*
