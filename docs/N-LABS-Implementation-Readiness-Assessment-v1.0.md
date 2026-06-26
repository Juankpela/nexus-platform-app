---
urn: nexus:mapa:nlabs-implementation-readiness-assessment
title: N-LABS Operational Intelligence Engine — Implementation Readiness Assessment v1.0
plane: mapa
stratum: realizacion
type: audit
owner: Lead Product Engineer (bajo custodia de N-LABS)
lifecycle_state: reviewed
confidence: validated            # cada afirmación está verificada contra el código con file:line
evidence: verificación directa del repositorio nexus-platform (2026-06-25), 4 auditorías de código independientes
provenance: Claude (Opus 4.8) — Lead Product Engineer, Goal PRODUCT-001
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: deriva-de,  target_urn: nexus:mapa:nlabs-operational-intelligence-engine, why: "verifica las costuras que el diseño funcional v1.0 asumió", date: 2026-06-25 }
  - { rel: restringido-por, target_urn: nexus:identidad:core, why: "respeta reusar>construir y no-infra-prematura", date: 2026-06-25 }
---

# N-LABS Operational Intelligence Engine — Implementation Readiness Assessment v1.0

> **Qué es.** El gate de ingeniería entre el diseño congelado y el código. No es diseño: es
> **verificación**. Cada afirmación del Functional Design v1.0 se contrastó **contra el código real**,
> con `archivo:línea`. El valor de este documento es la **distancia entre lo que el diseño asumió y lo
> que el repo hace hoy**.
>
> **Método.** 4 auditorías de código independientes sobre `nexus-platform/` (cobertura de
> `audit_events` evento por evento; superficies de reuso y permisos; capa IA y sustrato Memory OS;
> mecanismo de ejecución/cron). Toda evidencia citada es verificable.
>
> **Después de este documento: solo código, pruebas, resultados y ADRs con evidencia.**

---

## 0. Veredicto

> ## ✅ **GO — condicional, por mitades.**
>
> El motor se parte limpiamente en dos, con madurez distinta:
>
> - **Mitad A — Observar / Razonar / Recomendar** (Detección → Hipótesis → Impacto → Recomendación →
>   Outcome esperado): **GO inmediato.** Todo el sustrato existe y está verificado. Es la mitad que
>   entrega valor vendible y es construible hoy sobre lo que ya hay.
>
> - **Mitad B — Aprender / Persistir** (Outcome medido → Lección/Patrón → *alimenta Memory OS*):
>   **NO-GO programático hoy.** El Memory OS no tiene write-path en código (es 100% markdown a mano,
>   plano Mapa vacío). **Resolución:** la persistencia del aprendizaje arranca **human-in-the-loop**
>   (autoría asistida de nodos `.md`), y un *node store* programático se difiere hasta que el volumen
>   lo justifique — coherente con CORE ("no infra de escala antes de tiempo") y con la DD ("Memory OS
>   cobra sentido ≥~10 implementaciones"). **No bloquea el arranque; acota el alcance del PR1.**
>
> **3 precondiciones duras** antes de la línea 1 (todas pequeñas y aditivas): método de lectura de
> `audit_events` por ventana temporal + multi-tipo; permiso `n-labs.read`; factorizar un cliente IA
> compartido. Detalle en §3.

---

## 1. Resumen de verificación de costuras

| # | Costura que el diseño asumió | Veredicto | Evidencia |
|---|------------------------------|-----------|-----------|
| 1 | `audit_events` = stream de Señales completo | 🟢 **Confirmado** (2 caveats) | ~90 use-cases mutadores emiten; 130+ `eventType`; metadata rica |
| 2 | KPIs/RPCs reutilizables como Métricas | 🟢 **Confirmado** | `technician_outcomes`, `technician_issue_type_outcomes` (SECURITY DEFINER, tenant-scoped) |
| 3 | Serie temporal para tendencias | 🟢 **Confirmado** | `forecast_snapshots` es patrón genérico reutilizable |
| 4 | Patrón read-model (port→use-case→infra→composition) | 🟢 **Confirmado** | `get-dashboard-stats` + RLS vía `has_tenant_permission` |
| 5 | Lectura de `audit_events` por ventana + multi-tipo | 🟡 **Falta método** | sólo `listBySubject` / `listRecentByEventType` (1 tipo, sin rango) |
| 6 | Capa IA reutilizable | 🟡 **Sin cliente compartido** | `buildClient()` inline en 1 archivo; hay que factorizar `lib/ai/` |
| 7 | Patrón ADR-033 (IA solo transforma, no decide) | 🟢 **Confirmado** | `report-classifier` + fallback determinista por keywords |
| 8 | Home de ejecución periódica (job/cron) | 🟢 **Mejor de lo asumido** (caveat timeout) | Vercel Cron ya cableado: `/api/cron/scheduling-scan`, `/api/cron/export-worker` |
| 9 | El motor "alimenta Memory OS" programáticamente | 🔴 **Falso hoy** | Memory OS = markdown a mano; sin write-path/node-store; Mapa vacío |

---

## 2. Verificación detallada (evidencia con `archivo:línea`)

### 2.1 🟢 `audit_events` como stream de Señales — Confirmado, con 2 caveats

**Confirmado.** ~90 use-cases que mutan estado llaman a `audit.append(...)`. Se catalogaron **130+
`eventType`** consistentemente namespaced `dominio.entidad.acción`. La metadata es rica y suficiente:
- Fallo de ejecución de campo lleva `nonCompletionReason` → `advance-execution.ts:139-141`.
- Pago lleva `amount`; factura lleva `totalAmount` → `record-payment.ts:63`, `issue-invoice.ts:61`.
- Cambios de estado llevan `{ from, to }` → `change-work-order-status.ts:61`, `change-activity-status.ts:48`.

> El catálogo de Detectores del §6 del diseño funcional es **viable**: cada señal que cita existe.

**Caveat 1 (menor) — 3 use-cases de plano `platform` NO emiten audit:** `create-organization.ts`,
`set-organization-status.ts`, `grant-platform-admin.ts`. Son operaciones **platform-plane** (alta de
tenant, escalación de admin), no operación de tenant. **No afecta** al Modo 2 (que observa la operación
*dentro* de un tenant). Se documenta; si más adelante se quiere auditar el plano platform, es un fix
trivial — pero **no es precondición del motor**.

**Caveat 2 (importante para diseño de Detectores) — la escritura de audit es best-effort, no atómica.**
El `audit.append` ocurre *después* de la mutación, fuera de su transacción
(`create-company.ts:22-35`), y algunos sitios lo envuelven en `safeAudit` que traga el error
(`process-export-job.ts:89-99`). **Consecuencia para el motor:**
- Para señales **comportamentales/temporales y adopción** → `audit_events` es una observación de
  **alta cobertura** (estadísticamente fiable para tendencias y detección). ✅
- Para métricas **exactas de dinero** → el motor **NO** lee el audit log; lee las **tablas operativas**
  (`invoices`, `payments`, RPCs). El diseño ya lo hace así (los KPIs vienen de tablas/RPCs, no del log).
  **Regla a fijar:** *audit_events para "qué pasó y cuándo" (Señal); tablas operativas para "cuánto"
  exacto (Métrica de dinero).*

### 2.2 🟢 RPCs y Métricas reutilizables — Confirmado

- `technician_outcomes(p_tenant_id uuid)` → `(technician_id, completed_count, unable_count,
  resolved_count, success_rate, avg_work_minutes, last_completed_at)`. SECURITY DEFINER, tenant-scoped,
  lee `work_order_executions` → `20260620002_technician_outcomes.sql:8-19`.
- `technician_issue_type_outcomes(p_tenant_id, p_issue_type_id)` → `(…, success_rate, …)`, join
  `cases` por `issue_type_id` → `20260620004_…sql:8-18`.
- ~50 KPIs adicionales (forecasting, SLA, dispatch) confirmados en la auditoría previa. **Reuso directo.**

### 2.3 🟢 Serie temporal — Confirmado, patrón genérico

`forecast_snapshots` (`20260608001_forecasting.sql:12-31`) tiene `snapshot_date`, `period_label` (texto
libre, no enum) y columnas numéricas. La escribe `createSnapshot(...)`
(`supabase-forecasting-repository.ts:308-332`). **Un `operational_snapshots` clonaría esta estructura
exacta** (tenant-scoped, `created_by`, RLS por `has_tenant_permission`). Sigue **opcional/diferible**:
las tendencias pueden derivarse del `occurred_at` de `audit_events` sin tabla nueva.

### 2.4 🟢 Patrón read-model + permisos — Confirmado (falta crear 1 permiso)

Patrón verificado: **port** (`dashboard-stats-repository.ts`) → **use-case** puro
(`get-dashboard-stats.ts`) → **infra** (`supabase-dashboard-stats-repository.ts`, usa
`createServerSupabaseClient()`, RLS implícita) → **composition**. Un módulo `n-labs` (read-only) sigue
este molde sin tocar ningún módulo existente.

Permisos existentes: `tenant.audit.read`, `forecasting.read`, `service.*`, `service.dispatch.read`
(`authorization/domain/permission.ts`). **Falta** `n-labs.read` → se crea en la migración del motor
(patrón idéntico a forecasting). **Precondición pequeña.**

### 2.5 🟡 Lectura de `audit_events` por ventana temporal — Falta un método

El `AuditRepository` sólo expone `listBySubject(tenant, subject, limit)` y
`listRecentByEventType(tenant, eventType, limit)` (`audit-repository.ts`). **Ninguno** filtra por
**rango de tiempo** ni acepta **múltiples eventType**. El motor necesita exactamente eso. El índice ya
existe (`audit_events_tenant_time_idx (tenant_id, occurred_at desc)`), así que es **aditivo y barato**:

```
listByTenantWindow(tenantId, start, end, eventTypes?: string[], limit?): Promise<AuditEntry[]>
```

**Precondición dura.** (Extiende el port + impl; no cambia nada existente.)

### 2.6 🟡 Capa IA reutilizable — Existe pero sin cliente compartido

`get-ai-revenue-insights.ts` funciona: `new Anthropic({ apiKey })` vía `buildClient()` inline
(`:8-16`), modelo **`claude-sonnet-4-20250514`** (`:111`), `max_tokens: 4096`, manejo de fallback y
truncación robusto (`:108-165`). `@anthropic-ai/sdk ^0.102.0` en `package.json:27`.

**Hallazgo:** es el **único** sitio con cliente Anthropic; no hay wrapper compartido. Antes de un
segundo call-site, factorizar `lib/ai/anthropic-client.ts` (factory + el patrón de error ya probado).
**Precondición dura** (refactor pequeño, riesgo bajo). *Nota de modelo:* al implementar, evaluar el
modelo vigente por la guía `claude-api` (no fijar de memoria).

### 2.7 🟢 Patrón ADR-033 — Confirmado

`report-classifier.ts` define `classify(input) → ReportClassification {skillId, priority,
estimatedDurationMinutes, confidence, matchedTerm}` y existe el fallback **determinista**
`keyword-report-classifier.ts` (cero IA). Confirma la regla heredada: **la IA solo transforma
lenguaje→estructura; nunca es operacionalmente decisiva por sí sola.** El motor hereda este patrón:
la IA redacta Hipótesis/explica; el Detector (determinista) aporta la evidencia y el umbral.

### 2.8 🟢 Home de ejecución — Ya existe (mejor de lo asumido), con caveat de timeout

**Vercel Cron ya está cableado** (`vercel.json:2-11`):
- `/api/cron/export-worker` @ `0 6 * * *` → `runExportWorkerBatch()`.
- `/api/cron/scheduling-scan` @ `0 7 * * *` → `runOverdueScanBatch()` (barrido **por-tenant** con
  aislamiento de fallos, `scan-overdue-work-orders.ts:193-221`).
- Auth por `Authorization: Bearer <CRON_SECRET>` (`lib/config/env.ts:12`).

Un `/api/cron/nlabs-batch` sigue el **mismo template** (auth → wrapper de composición → batch). **No hay
que crear infraestructura de jobs.**

**Caveat — timeout serverless (~300s en Vercel Pro).** El paso de razonamiento IA es lo costoso.
**Mitigación (ya soportada por el patrón existente):** (1) barrido **por-tenant** como el scanner;
(2) la IA solo razona sobre el **Top-N priorizado** (la fórmula ya produce Top-3 → pocas llamadas por
tenant); (3) si crece, separar detección (cron frecuente, barato) de razonamiento (cron propio,
acotado). **No bloquea**; es una restricción de diseño con mitigación conocida.

### 2.9 🔴 Persistir el aprendizaje en Memory OS — No existe write-path programático

**El hallazgo crítico.** Búsqueda exhaustiva (modules/, app/, lib/, scripts/): **cero** código que
lea, parsee, escriba o consulte nodos del Memory OS, URNs o el Índice. Hoy:
- Los nodos son **archivos markdown escritos a mano** en `knowledge/` con frontmatter YAML.
- El **plano Mapa está vacío de instancias**: los 9 archivos son Identidad/Método (specs del Canon); no
  hay un solo nodo `Problem/Hypothesis/Outcome/Lesson/Pattern/CaseStudy` instanciado.
- **No hay** node store, API, serializador de frontmatter, resolución de URN ni compuerta de validación
  en código. La compuerta estructural (Manifiesto §9) está **descrita, no implementada**.

**Consecuencia honesta:** el Functional Design (§4 Paso 9, §13) afirmó que el motor "escribe nodos del
Memory OS por append" y "cierra el bucle de aprendizaje". **Hoy ese extremo del bucle está abierto en
código.** El motor puede observar, razonar, recomendar y *medir* Outcomes, pero **no puede persistir
Lecciones/Patrones programáticamente** sin construir un `MemoryOsNodeStore`.

**Resolución (sin violar la disciplina congelada ni CORE):**
1. **Arrancar human-in-the-loop.** El motor *propone* el nodo (genera el bloque markdown con cabecera
   canónica completa, URN candidata 3-segmentos `nexus:mapa:‹slug›` — respetando ADR-BACKLOG-003); un
   humano lo revisa, lo guarda en `knowledge/` y añade la fila al Índice. Esto **respeta la separación
   productor/aprobador de Governance §9** ("ningún modelo se auto-aprueba"). El bucle se cierra con un
   humano en el lazo — perfectamente válido para los primeros casos.
2. **Diferir el node store programático** hasta que el volumen lo justifique (DD: Memory OS ≥~10
   implementaciones; CORE: no construir infra antes de tiempo). Cuando llegue ese volumen, el node
   store es una **decisión con evidencia → ADR**, no un documento de diseño especulativo.

> **Esto es coherencia, no recorte:** construir hoy un node store para un plano Mapa que aún no tiene
> instancias sería exactamente la "infra de escala prematura" que CORE veta. La Mitad A genera las
> instancias; cuando haya suficientes, el node store se gana su ADR.

---

## 3. Precondiciones duras (lo que debe ser cierto antes de la línea 1)

Sólo tres, todas pequeñas y **aditivas** (no tocan código existente):

| # | Precondición | Acción | Tamaño |
|---|--------------|--------|--------|
| P1 | Lectura de `audit_events` por ventana + multi-tipo | añadir `listByTenantWindow(...)` al port `AuditRepository` + impl Supabase | S (usa índice existente) |
| P2 | Permiso de lectura del motor | crear `n-labs.read` en migración (patrón forecasting) + asignar a `tenant_admin` | XS |
| P3 | Cliente IA compartido | factorizar `lib/ai/anthropic-client.ts` desde `buildClient()` | S (refactor 1 sitio) |

Nada más es precondición. El cron, los RPCs, los KPIs, el patrón read-model y la metadata de eventos ya
están listos.

---

## 4. Brechas y riesgos (con dueño y mitigación)

| Hallazgo | Severidad | Impacto | Mitigación |
|----------|-----------|---------|------------|
| Sin write-path Memory OS (§2.9) | 🔴 Alta | Mitad B no programática hoy | Human-in-the-loop; node store por ADR con evidencia al alcanzar volumen |
| Audit best-effort, no atómico (§2.1) | 🟡 Media | trazas faltantes esporádicas | Dinero exacto desde tablas operativas, no desde el log; audit solo para señal temporal/adopción |
| Timeout serverless en razonamiento IA (§2.8) | 🟡 Media | batch puede exceder 300s | barrido por-tenant + IA solo sobre Top-N + (si crece) separar detección/razonamiento |
| Falta método de lectura por ventana (§2.5) | 🟡 Media | el motor no puede leer rangos | P1 |
| Sin cliente IA compartido (§2.6) | 🟡 Baja | duplicación al 2º call-site | P3 |
| 3 use-cases platform sin audit (§2.1) | 🟢 Baja | no afecta Modo 2 (tenant) | documentado; fix trivial si se necesita |
| Falta permiso `n-labs.read` (§2.4) | 🟢 Baja | gating del motor | P2 |

**Ningún riesgo es bloqueante para la Mitad A.** El único 🔴 acota el alcance del aprendizaje, no la
viabilidad del motor.

---

## 5. Qué se construye vs. qué se reutiliza (confirmado por evidencia)

| Pieza | Veredicto | Base verificada |
|-------|-----------|-----------------|
| Stream de Señales | **Reusa** | `audit_events` + `audit-repository` (extender lectura) |
| Métricas / RPCs | **Reusa** | `technician_outcomes`, forecasting, dispatch |
| Serie temporal | **Reusa** | patrón `forecast_snapshots` |
| Razonamiento IA | **Reusa + factoriza** | `get-ai-revenue-insights` → `lib/ai/` |
| Patrón ADR-033 | **Reusa** | `report-classifier` |
| Ejecución periódica | **Reusa** | Vercel Cron + barrido por-tenant |
| Patrón read-model | **Reusa** | `get-dashboard-stats` |
| Detectores (Rules) | **Construye (fino)** | molde `technician_outcomes` |
| Orquestación del bucle | **Construye (fino)** | encadena Detector→IA→árbol→Outcome |
| Persistencia del aprendizaje | **Human-in-the-loop ahora; node store por ADR después** | Memory OS sin write-path hoy |

---

## 6. Veredicto final y orden de construcción sugerido (handoff al Roadmap)

**GO para la Mitad A.** Resueltas P1–P3 (≈1 PR de plomería), el motor de Observar/Razonar/Recomendar es
construible íntegramente sobre lo existente, sin arquitectura nueva, sin tocar módulos, read-only.

Orden de construcción que el **N-LABS Implementation Roadmap v1.0** debe secuenciar (no se decide aquí;
se entrega el orden lógico verificado):

```
PR0  Plomería (precondiciones)   P1 listByTenantWindow · P2 permiso n-labs.read · P3 lib/ai/ cliente
        └─ criterio: tests verdes; cero cambios de comportamiento en módulos existentes

PR1  Módulo n-labs read-only     port→use-case→infra→composition; 1 Detector de mayor ROI
        (recomendado: reproceso de campo vía non_completion_reason — señal limpia y verificada)
        └─ criterio: el Detector calcula la Métrica + Problema con evidencia, contra datos reales

PR2  2–3 Detectores más          tiempos muertos (gaps de timestamps) · AR aging · adopción (audit_events)
        └─ criterio: cada Detector mapea a 1 de los 6 patrones; cero figuras fabricadas

PR3  Orquestación + priorización fórmula Discovery (Top-3) · árbol de decisión · salvaguarda anti-sesgo
        └─ criterio: cada recomendación registra el descarte de cada clase antes de NEXUS

PR4  Razonamiento IA (acotado)   IA redacta Hipótesis sobre el Top-N; ADR-033 (evidencia del Detector)
        └─ criterio: la IA nunca decide sola; salida sostenida en la evidencia adjunta

PR5  Validación + auto-auditoría re-lectura de la Métrica → Outcome medido vs. esperado
        └─ criterio: el motor reporta su propia tasa de acierto (Hipótesis confirmadas/total)

PR6  Aprendizaje human-in-the-loop  el motor PROPONE nodos Mapa (markdown + cabecera canónica);
        humano revisa/commitea; Índice crece por append
        └─ criterio: primer Problem/Hypothesis/Outcome/Lesson instanciado en knowledge/

— DIFERIDO (por ADR con evidencia, al alcanzar volumen): MemoryOsNodeStore programático;
  operational_snapshots; auditoría del plano platform.
```

**Dogfooding primero** (Functional Design §10): PR1–PR5 se encienden sobre la **operación de
Colibri/NEXUS** antes que sobre cualquier cliente externo.

---

## 7. Coherencia con la disciplina congelada

- **No reabre diseño:** este IRA verifica; no rediseña. El Functional Design queda congelado salvo la
  corrección puntual del §2.9 (el "feed Memory OS" es human-in-the-loop, no programático) — corrección
  **respaldada por evidencia de código**, exactamente el tipo de cambio que la nueva disciplina permite.
- **No crea conceptos ni capas:** usa el Canon, los módulos y el cron existentes.
- **Respeta CORE:** difiere el node store (no infra prematura); reusa todo lo posible.
- **Respeta la DD:** Mitad A es read-only sobre datos propios (dogfooding, genera corpus, rompe
  dependencia del fundador); Memory OS programático espera al volumen (≥~10 implementaciones).
- **Siguiente paso permitido:** o bien el **Roadmap v1.0** (secuencia PR0→PR6), o bien empezar **PR0**
  directamente como código + pruebas. No se requieren más documentos de diseño.

---

*Nodo `nexus:mapa:nlabs-implementation-readiness-assessment` (reviewed). Verifica el Functional Design
contra el código con evidencia citable. Veredicto: GO condicional por mitades. Las afirmaciones de este
documento son `validated` porque cada una tiene `archivo:línea`. Corregir o ampliar = nueva versión por
append+supersede.*
