# ROADMAP TO CODE — de las Engineering Specs al producto funcionando

> **Naturaleza.** Plan de transición. NO es código. NO modifica canon ni componentes congelados. Traza cómo pasar de los specs `.md` (C1–C4 FROZEN) a un Motor Cognitivo operando en producción, fase por fase, con criterios de entrada/salida y riesgos. Cada fase consume el resultado de la anterior; no se avanza sin cumplir los criterios de salida. Las Architectural Questions se mapean a la fase donde **deben** resolverse (ver `ARCHITECTURE_MILESTONE_REVIEW.md` §5). Fecha: 2026-06-29.

## Principio rector del roadmap
La revisión de milestone demostró que C1–C4 son un **núcleo de razonamiento sano pero un bucle operativo abierto**. Por tanto el roadmap no es "implementar acto por acto" sino **cerrar el bucle**: primero el sustrato escribible (C1+C2), luego las terminales huérfanas (binding, ignición, génesis de brecha/grafo), y solo entonces los actos de consulta (C3+C4) tienen datos sobre los que operar. **Construir C3/C4 primero produciría componentes que se abstienen siempre.**

---

## Fase A — Specs (TERMINADA)
- **Objetivo:** convertir el canon congelado en specs de ingeniería falsadas y congeladas.
- **Estado:** ✅ **COMPLETA.** C1, C2, C3, C4 = FROZEN; cada uno pasó su Falsification Gate (SURVIVED); dashboard y este milestone review publicados.
- **Criterio de salida (cumplido):** 4 specs congelados + revisión de milestone aprobada + repo sincronizado.
- **Pendiente legítimo de Fase A:** C5/C6/C7 specs (se especifican en paralelo a B–D; ver `C5_PREPARATION.md`). **No bloquean** el arranque de implementación de C1.

---

## Fase B — Implementación del dominio (TypeScript puro, sin infraestructura)
- **Objetivo:** materializar como **código importable** los dominios y puertos: `modules/mov` (C1), `modules/ose` (C2), `modules/atender` (C3), `modules/diagnosticar` (C4) — tipos de dominio, interfaces de puertos, funciones puras (`applyWeakLink`, `compareForRole`, `classifyRole`, `abduceUpstream`), y los casos de uso de orquestación con **puertos mockeados**.
- **Dependencias:** Fase A. Ninguna infraestructura.
- **Criterios de entrada:** specs congelados; decisión de modelado de `NODO-CAUSAL` (A) y del accesor `LECTURA-ENLACE-CAUSAL` (A) tomadas o explícitamente diferidas como placeholders.
- **Criterios de salida:**
  - `modules/{mov,ose,atender,diagnosticar}` existen y **compilan** (resuelve `AQ-*-PRECONDICION-C1C2C3`).
  - Todas las pruebas **unitarias y de falsación de dominio** (U-* y F-* de C1–C4) corren en `vitest environment:node` con puertos mockeados y pasan.
  - El predicado `ACCIONABILIDAD-ROL` y los accesores `relacionCausalIdDe`/`nivelCausalDe`/`esAccionablePorRol` quedan como **interfaces declaradas** (inyectables), no hardcodeadas.
- **AQ que resuelve/aborda:** `PRECONDICION`, `NODO-CAUSAL` (modelado), `LECTURA-ENLACE-CAUSAL` (forma del accesor), `ACCIONABILIDAD-ROL` (como puerto inyectable).
- **Riesgos:** (1) tentación de resolver AQ inventando cuerpos para los placeholders — **prohibido**; mantener inyectables. (2) `RoleContext` en C3 obliga import transversal (`AQ-SYS-ROLECONTEXT-HOME`) — decidir si se crea un módulo kernel compartido AHORA (más barato que después).

---

## Fase C — Infraestructura (persistencia, RPC, RLS, atomicidad)
- **Objetivo:** implementar los adaptadores de C1 contra Supabase/PostgreSQL: las 5 tablas de familia, `mov_integrar` (RPC security definer), los 18 CHECK + 4 triggers, RLS `has_tenant_permission`, y el **scope transaccional** de las escrituras en cascada.
- **Dependencias:** Fase B (puertos definidos).
- **Criterios de entrada:** dominio compilando; entorno Postgres de test disponible.
- **Criterios de salida:**
  - Migración de seed de permisos `mov.read`/`mov.write` aplicada (resuelve `AQ-PERMISOS`).
  - Postgres de test (Supabase local / pg-mem) en CI (resuelve `AQ-TEST-INFRA`); las pruebas SQL/RPC de C1 (CA-2/CA-9) pasan.
  - **Atomicidad de G3 resuelta:** la cascada de 5 escrituras del OSE ocurre en una transacción con scope acotado o falla atómicamente (resuelve `AQ-OSE-ATOMICIDAD-MULTIESCRITURA` + `AQ-19 BLOQUEO-SUBGRAFO`).
  - `audit_events.metadata` con el binding de `rootObservationIds` decidido (resuelve `AQ-PROCEDENCIA-SCHEMA`).
- **AQ que resuelve:** `PERMISOS`, `TEST-INFRA`, `ATOMICIDAD-MULTIESCRITURA`, `BLOQUEO-SUBGRAFO`, `PROCEDENCIA-SCHEMA`, `FK-POLIMORFICA`, `VALIDACION-ATTRS`, `IDENTIDAD-HECHO`.
- **Riesgos:** **integridad del MOV** — una cascada parcial corrompe el modelo y viola la Regla de cierre. Es el riesgo técnico #1 del sistema (ver milestone review §4.1). Probar exhaustivamente la reversión atómica antes de avanzar.

---

## Fase D — Integración (cerrar el bucle: binding, ignición, génesis)
- **Objetivo:** conectar el núcleo a la realidad y entre sí — **resolver las 4 responsabilidades huérfanas** (H1–H4 del milestone review) que hoy nadie posee.
- **Dependencias:** Fase C (C1+C2 operables con datos reales).
- **Criterios de entrada:** MOV escribible y consultable con invariantes garantizados.
- **Criterios de salida:**
  - **H4 — Binding (PERCIBIR):** adaptadores que convierten tablas operacionales (`work_orders`, WhatsApp, facturas…) en `RawSignal`/observaciones (resuelve `BINDING-OPERACIONAL`/`BINDING-PERCIBIR`).
  - **H3 — Ignición:** un scheduler/consumidor externo invoca `perceiveSignal`/`sweepExpirations`/`rankAttention`/`diagnose` (resuelve `DISPARO`/`RELOJ-MUNDO`) sin violar "el Motor no se enciende a sí mismo".
  - **H1 — Génesis de brecha:** se asigna a un acto (decisión de gobierno: ¿COMPRENDER? ¿adaptador?) la creación inicial de la `brecha` (resuelve `AUTORIA-BRECHA`).
  - **Cardinalidad y handoffs:** 1 perturbación N-afectadas → focos → diagnósticos alineados (resuelve `CARDINALIDAD-PERTURBACION/-FOCO`); protocolo de entrega/recogida del diagnóstico y de la deuda viva de preempción (resuelve `HOGAR-FOCO`/`HOGAR-DIAGNOSTICO`/`PERSISTENCIA-INFERENCIA`/`PREEMPCION-PROTOCOLO`).
- **AQ que resuelve:** las 4 huérfanas + cardinalidad + hogares de proyección efímera + handoffs.
- **Riesgos:** estas son **decisiones de gobierno/binding, no de razonamiento** — el canon no las dicta. Riesgo de "inventar" un acto nuevo para tapar H1/H2: en su lugar, decidir explícitamente con un ADR y, si toca el canon, escalar (NO modificar congelados sin autorización del founder). **H2 (poblar `relacion_causal`) puede requerir C7/gobierno** y mantener a C4 abstenido hasta entonces — aceptable.

---

## Fase E — UI
- **Objetivo:** superficies de decisión para el rol (consume la salida de ARTICULAR/C6 cuando exista; mientras tanto, vistas de depuración del MOV y de los focos/diagnósticos).
- **Dependencias:** Fase D (datos reales fluyendo) + C6 ARTICULAR especificado.
- **Criterios de entrada:** el Motor produce focos y diagnósticos trazables sobre datos reales.
- **Criterios de salida:** un rol ve **solo lo que puede accionar** (relatividad de rol, CONSTITUCION §8), con procedencia y estatus epistémico visibles; abstenciones presentadas como salida de primera clase, no como error.
- **AQ que aborda:** ninguna del núcleo; depende de C6 (fuera de C1–C4).
- **Riesgos:** colapsar la relatividad de rol a un índice único en la UI (prohibido por canon); mostrar inferencias como hechos (violaría la etiqueta epistémica).

---

## Fase F — Calibración del Motor
- **Objetivo:** poblar los puertos de política de SOLO LECTURA (`RelevanceThresholdPort`, `SaliencePolicyPort`, `PlausibilityPolicyPort`) con cuantificación real, y arrancar el bucle de aprendizaje de RECONCILIAR (C7).
- **Dependencias:** Fase D (decisiones con outcomes observables) + C7 RECONCILIAR especificado/implementado.
- **Criterios de entrada:** el Motor toma decisiones reales cuyos resultados se pueden observar.
- **Criterios de salida:** umbrales/pesos/profundidad/plausibilidad dejan de ser placeholders y se **calibran con evidencia** (RECONCILIAR sube/baja confianza post-outcome, MOTOR §10.4); priores de atención afinados.
- **AQ que resuelve:** `CALIBRACION` (UMBRAL, SALIENCE-pesos, PLAUSIBILIDAD, PROFUNDIDAD, MEDICION-SORPRESA), `INVALIDACION-CAUSAL` (recompute en cascada).
- **Riesgos:** calibrar sin suficientes outcomes reales = sobreajuste a ruido. La calibración es **exclusiva de RECONCILIAR**; ningún acto de consulta debe escribir su propia política (frontera ya garantizada en specs por puertos R/O).

---

## Fase G — Producción
- **Objetivo:** operar el Motor en clientes reales, con escala y retención resueltas.
- **Dependencias:** Fases C–F.
- **Criterios de entrada:** bucle cerrado, calibrado, con UI; integridad probada.
- **Criterios de salida:** SLAs de integridad (cero MOV incoherente observable), particionado/archivado, y el supuesto `tenant ≡ sujeto` validado o sustituido.
- **AQ que resuelve:** `PARTICION-RETENCION`, `TENANT-vs-SUJETO`/`MULTI-SUJETO` (Categoría C), `GRANULARIDAD-ESQUEMA` (solo si los JOINs de grafo resultan caros).
- **Riesgos:** crecimiento sin cota del MOV (cada observación sella una fila, las deprecadas no se borran por `MOV.I-5`); descubrir en producción que un tenant alberga >1 sujeto operacional (rompería el scope `tenant_id`).

---

## Mapa AQ → Fase (resumen)

| Fase | AQ raíz que DEBEN resolverse para salir de la fase |
|---|---|
| **B** | PRECONDICION · NODO-CAUSAL · LECTURA-ENLACE-CAUSAL · ACCIONABILIDAD-ROL (como puerto) · (decidir ROLECONTEXT-HOME) |
| **C** | PERMISOS · TEST-INFRA · ATOMICIDAD/BLOQUEO-SUBGRAFO · PROCEDENCIA-SCHEMA · FK-POLIMORFICA · VALIDACION-ATTRS · IDENTIDAD-HECHO |
| **D** | **AUTORIA-BRECHA · POBLADO-GRAFO · DISPARO/RELOJ-MUNDO · BINDING** (las 4 huérfanas) · CARDINALIDAD · HOGAR-FOCO/DIAGNOSTICO · PREEMPCION-PROTOCOLO |
| **F** | CALIBRACION (UMBRAL/SALIENCE/PLAUSIBILIDAD/PROFUNDIDAD/MEDICION-SORPRESA) · INVALIDACION-CAUSAL |
| **G** | PARTICION-RETENCION · TENANT-vs-SUJETO · GRANULARIDAD-ESQUEMA |
| **D (investigación)** | CONFIANZA-ORDINAL · CICLOS-GRAFO · NIVEL-AGREGADO-INDIVIDUO (Categoría D; no bloquean, se observan en piloto) |

## Ruta crítica (el orden que importa)
`Fase B (dominio compila)` → `Fase C (C1/C2 con integridad atómica)` → **`Fase D (cerrar las 4 huérfanas)`** → resto. La Fase D es el verdadero cuello de botella: sin ella el Motor razona en el vacío. **Las decisiones de Fase D son de gobierno/binding, no de ingeniería de razonamiento, y varias podrían requerir reabrir el canon — lo cual exige autorización explícita del founder, no se hace por intuición.**
