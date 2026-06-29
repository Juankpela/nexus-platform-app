# SYSTEM DECISIONS — Decisiones transversales del Motor Cognitivo

> **Naturaleza.** Registro **central y único** de las decisiones y vacíos que son **transversales al sistema** (aparecen en ≥2 componentes). Consolida las Architectural Questions que estaban **duplicadas** en C1–C4 bajo un identificador estable `AQ-SYS-NNN`. **NO resuelve ninguna** (la arquitectura está congelada; los vacíos se resuelven con evidencia y, donde toquen el canon, con autorización del founder — nunca por intuición). Cada componente que herede uno de estos vacíos debe **enlazar aquí**, no redefinirlo. Fecha: 2026-06-29. Origen: `ARCHITECTURE_MILESTONE_REVIEW.md`.

## Cómo leer este documento
- **Identificador estable:** `AQ-SYS-NNN` (no cambia aunque se re-numere la lista por componente).
- **Estado:** `OPEN` (no resuelta) · `POLICY` (decisión de gobierno adoptada) · `RESOLVED` (con evidencia + ADR; ninguna lo está aún).
- **Categoría** (de la clasificación A/B/C/D del milestone review): A bloquea implementación · B bloquea producción · C bloquea escalabilidad · D investigación futura.
- **AQ relacionadas:** las AQ por-componente que esta decisión consolida (siguen existiendo en sus specs; aquí se unifican).

---

## Responsabilidades huérfanas (el límite del Milestone 1)

### AQ-SYS-001 — Autoría de la brecha
- **Descripción:** ningún acto tiene asignada la **creación inicial** de la entidad `brecha` (D3). El OSE solo recomputa su *lado observado*; el canon no nombra quién la crea por primera vez.
- **Componentes afectados:** C1, C2, C3, C4.
- **Estado:** OPEN · **Categoría A** (operativamente bloqueante: sin brechas, C3/C4 solo ven perturbaciones).
- **Evidencia:** `OSE.INV-9` ("recomputa el lado observado de una brecha EXISTENTE… NUNCA crear"); MOTOR/ARQUITECTURA no asignan la génesis. Candidato natural NO confirmado: COMPRENDER o un adaptador de binding.
- **AQ relacionadas:** C1 `AQ-AUTORIA-BRECHA` · C2 `AQ-OSE-AUTORIA-BRECHA` · C3 `AQ-ATENDER-AUTORIA-BRECHA` · C4 `AQ-DIAG-AUTORIA-BRECHA`.

### AQ-SYS-002 — Población del grafo causal
- **Descripción:** ningún componente de ingeniería tiene asignada la **creación/poblado** de las `relacion_causal` (familia C), ni el punto de entrada (`nodoCausalId`) del recorrido.
- **Componentes afectados:** C1, C4 (y C5 futuro).
- **Estado:** OPEN · **Categoría A/B** (C4 se abstiene `grafo_vacio` hasta tenerlo).
- **Evidencia:** RECONCILIAR solo **calibra** enlaces existentes (MOTOR §10.4 "cuatro cosas, solo cuatro"); "abrir el catálogo es acto de gobierno, fuera del bucle automático" (MOTOR §10.5). Nodo causal = "dimensión de variación, no la cosa" (MOV §2.2).
- **AQ relacionadas:** C4 `AQ-DIAG-POBLADO-GRAFO` / `AQ-DIAG-AUTORIA-RELACION-CAUSAL` · C1 `AQ-NODO-CAUSAL` · C4 `AQ-DIAG-LECTURA-ENLACE-CAUSAL`.

### AQ-SYS-003 — Disparo del Motor / Reloj del Mundo
- **Descripción:** el canon no nombra **qué del stack enciende el Motor** (consumidor de eventos, cron, scheduler) ni quién emite el `worldInstant`. "El Motor no se enciende a sí mismo" (Freno 1).
- **Componentes afectados:** C2, C3, C4.
- **Estado:** OPEN · **Categoría B**.
- **Evidencia:** MOTOR §8 Freno 1 (event-driven); C2 deja el tick "sin dueño".
- **AQ relacionadas:** C2 `AQ-OSE-RELOJ-MUNDO` · C3 `AQ-ATENDER-DISPARO` · C4 `AQ-DIAG-DISPARO`.

### AQ-SYS-004 — Binding Motor ↔ tablas operacionales
- **Descripción:** el canon dice que los módulos son "órganos sensoriales" que producen observaciones, pero **no especifica el mapeo** de tablas reales (`work_orders`→`entidad_objeto` A1, factura→`observacion` B1, WhatsApp→`RawSignal`).
- **Componentes afectados:** C1, C2.
- **Estado:** OPEN · **Categoría B** (sin binding no entran observaciones reales).
- **Evidencia:** Constitución (primer principio); MOV §9 ("el binding es valor de tenant, no esquema").
- **AQ relacionadas:** C1 `AQ-BINDING-OPERACIONAL` · C2 `AQ-OSE-BINDING-PERCIBIR`.

---

## Decisiones técnicas transversales

### AQ-SYS-005 — Atomicidad de escritura multi-paso
- **Descripción:** las escrituras en cascada (G3 del OSE: 5 escrituras; futura siembra de C5: E3+A2+B3) no tienen un **scope transaccional acotado** por el canon. Una escritura parcial corrompería el MOV (viola la Regla de cierre).
- **Componentes afectados:** C1, C2 (y C5 futuro).
- **Estado:** OPEN · **Categoría A/B** (riesgo técnico #1 del sistema).
- **Evidencia:** `mov_integrar` es atómico por operación, pero la cascada de varias operaciones no está acotada.
- **AQ relacionadas:** C1 `AQ-BLOQUEO-SUBGRAFO` · C2 `AQ-OSE-ATOMICIDAD-MULTIESCRITURA`.

### AQ-SYS-006 — Calibración de las políticas (cuantificación)
- **Descripción:** los puertos de SOLO LECTURA (`RelevanceThresholdPort`, `SaliencePolicyPort`, `PlausibilityPolicyPort`) exponen una **forma** (relación de orden) cuya **cuantificación** (pesos, umbrales, profundidad) el canon deja como contenido calibrable por **RECONCILIAR** (C7, aún no especificado). Falta el origen/seed.
- **Componentes afectados:** C2, C3, C4 (dueño futuro: C7).
- **Estado:** OPEN · **Categoría B/F** (el Motor corre con placeholders hasta calibrar).
- **Evidencia:** MOTOR §9 (blindaje forma/contenido); §10.4 (priores calibrados por RECONCILIAR).
- **AQ relacionadas:** C2 `AQ-OSE-UMBRAL` · C3 `AQ-ATENDER-CALIBRACION` · C4 `AQ-DIAG-PLAUSIBILIDAD` / `AQ-DIAG-PROFUNDIDAD`.

### AQ-SYS-007 — Confianza: escalar vs orden parcial
- **Descripción:** la confianza se persiste como escalar `numeric`, pero el canon exige tratarla como **relación de orden**; incertidumbres no conmensurables (`ambiguedad_no_cuantificable` vs `reducible`) podrían hacer el `min()` un escalar falso. El caso degenerado se cubre con `null` (no evaluada → abstención).
- **Componentes afectados:** C1, C2, C3, C4.
- **Estado:** OPEN · **Categoría D** (investigación; reabrir si el piloto observa tensión).
- **AQ relacionadas:** C1 `AQ-CONFIANZA-ORDINAL` · C2 `AQ-OSE-MAGNITUD-ORDINAL` · C3 `AQ-ATENDER-SALIENCE-ORDINAL` · C4 `AQ-DIAG-CONFIANZA-ORDINAL`.

### AQ-SYS-008 — Tenant ≡ Sujeto operacional
- **Descripción:** el canon define el MOV **local a UN sujeto cognitivo**; el stack adopta `tenant_id`. Se asume `tenant ≡ sujeto` como supuesto de implementación NO resuelto; rompe si un tenant alberga >1 sujeto operacional.
- **Componentes afectados:** C1, C2, C3, C4.
- **Estado:** OPEN · **Categoría C** (escalabilidad; validar en piloto).
- **AQ relacionadas:** C1 `AQ-TENANT-vs-SUJETO` · C2 `AQ-OSE-MULTI-SUJETO` / `AQ-OSE-PROPAGACION-CRUZA-SUJETO` · C3 `AQ-ATENDER-MULTI-SUJETO`.

### AQ-SYS-009 — Infraestructura de test (PostgreSQL)
- **Descripción:** no hay Postgres de test (vitest `environment:node`, Supabase mockeado). Las pruebas SQL/RPC/RLS de los invariantes no son ejecutables hoy.
- **Componentes afectados:** C1, C2, C3, C4.
- **Estado:** OPEN · **Categoría A** (para probar invariantes SQL; resuelve en Fase B/C del roadmap).
- **AQ relacionadas:** `AQ-*-TEST-INFRA` en C1, C2, C3, C4.

### AQ-SYS-010 — Catálogo de permisos (`mov.read` / `mov.write`)
- **Descripción:** los permisos `mov.read`/`mov.write` los referencia la RLS de C1 pero **no están sembrados**. Sin el seed, `mov_integrar`/lecturas fallan para todo no-`service_role`.
- **Componentes afectados:** C1, C3, C4.
- **Estado:** OPEN · **Categoría A** (resoluble con una migración de seed; trivial).
- **AQ relacionadas:** C1 `AQ-PERMISOS` · C3 `AQ-ATENDER-PERMISOS` · C4 `AQ-DIAG-PERMISOS`.

### AQ-SYS-011 — Precondición de código (specs no son TypeScript)
- **Descripción:** `modules/{mov,ose,atender,diagnosticar}` **no existen como TypeScript**; son specs `.md`. Ningún `import "@/modules/mov/..."` resuelve.
- **Componentes afectados:** C1, C2, C3, C4.
- **Estado:** OPEN · **Categoría A** (se resuelve al arrancar la Fase B del roadmap).
- **AQ relacionadas:** `AQ-*-PRECONDICION` en C3, C4 (implícito en C1/C2).

### AQ-SYS-012 — Hogar de proyecciones efímeras y deuda de preempción
- **Descripción:** `Focus` (C3) y `Diagnostico` (C4) son valores de retorno efímeros. La **deuda viva** de un razonamiento preemptado (MOTOR §3.2 G0.5) debe sobrevivir entre invocaciones y ser retomable, pero **no tiene hogar persistente** definido por el canon.
- **Componentes afectados:** C3, C4 (y C5 futuro al recoger el diagnóstico).
- **Estado:** OPEN · **Categoría B**.
- **AQ relacionadas:** C3 `AQ-ATENDER-HOGAR-FOCO` / `AQ-ATENDER-PREEMPCION-PROTOCOLO` · C4 `AQ-DIAG-HOGAR-DIAGNOSTICO` / `AQ-DIAG-PERSISTENCIA-INFERENCIA`.

### AQ-SYS-013 — Cardinalidad perturbación → foco → diagnóstico
- **Descripción:** el OSE emite 1 `perturbacion` con N `afectadas[]`; C3 puede producir focos por brecha/entidad/perturbación; C4 asume 1 brecha por invocación. El mapeo de cardinalidad a lo largo del flujo no está alineado por el canon.
- **Componentes afectados:** C2, C3, C4.
- **Estado:** OPEN · **Categoría A/B** (alineación de flujo).
- **AQ relacionadas:** C2 `AQ-OSE-CARDINALIDAD-PERTURBACION` · C3 `AQ-ATENDER-CARDINALIDAD-FOCO` · C4 `AQ-DIAG-CARDINALIDAD-FOCO`.

### AQ-SYS-014 — Hogar del tipo `RoleContext`
- **Descripción:** `RoleContext` modela las cuatro coordenadas de rol (concepto del canon, CONSTITUCION §8) pero vive físicamente en C3 (`salience-policy-port`). C4 lo importa de C3, y C5/C6/C7 también deberán. Acoplamiento entre actos por un tipo transversal.
- **Componentes afectados:** C3 (dueño actual), C4, C5+ (consumidores).
- **Estado:** OPEN · **Categoría B/cosmético-estructural** (no bloqueante; resolver en Fase B con un módulo kernel o si C3 se reabre).
- **AQ relacionadas:** `AQ-SYS-ROLECONTEXT-HOME` (renombrada aquí).

---

## Políticas de gobierno adoptadas

### AQ-SYS-015 — Citas estables (no por número de línea)
- **Descripción:** las referencias **entre componentes** deben hacerse por **identificador estable** (nombre de sección/§, puerto, tipo, invariante), **nunca por número de línea** — las citas C4→C3 por línea se rompieron al editar C3.
- **Componentes afectados:** todos (política).
- **Estado:** **POLICY** (adoptada para C5+ y cualquier componente reabierto). NO se editan C1/C2/C3 congelados para re-hardening; C4 ya nació endurecido.
- **Evidencia:** incidente de desplazamiento de líneas C3 (ficha de cierre) durante el pase de falsación de C4.
- **AQ relacionadas:** `AQ-SYS-CITAS-FRAGILES` (renombrada aquí).

### AQ-SYS-016 — Persistencia de dos niveles (Git local / GitHub remoto)
- **Descripción:** **Git local = fuente de verdad operativa** (basta para continuar si todo está committeado); **GitHub remoto = fuente de verdad compartida**. **División de responsabilidades (v2):** el agente (Claude) **modifica → commitea en Git local → verifica consistencia → informa los commits pendientes de sincronizar, pero NO ejecuta el push** (el Git Credential Manager y la auth interactiva están fuera de su control). El **operador humano** ejecuta **un único `git push`** al final de la sesión o del milestone. No se bloquea la producción de ingeniería por un push pendiente si no hay cambios sin commit, riesgo de pérdida, inconsistencia local, conflictos ni divergencia.
- **Excepción dura:** **antes de iniciar un componente nuevo del Motor (p. ej. C5), el remoto DEBE estar sincronizado** (`origin/main == HEAD`) — ese push lo realiza el operador humano. Es el punto donde GitHub vuelve a ser la referencia común de una nueva etapa.
- **Componentes afectados:** todos (gobernanza del repo).
- **Estado:** **POLICY** (adoptada 2026-06-29; refinada por el founder: el push es responsabilidad del humano, no del agente).
- **Evidencia:** bloqueo reproducible de auth del Git Credential Manager (no arquitectónico) en el entorno headless del agente; el conocimiento ya queda versionado en Git local con historial recuperable.

---

## Resumen

| ID | Título | Componentes | Categoría | Estado |
|---|---|---|---|---|
| AQ-SYS-001 | Autoría de la brecha | C1·C2·C3·C4 | A | OPEN |
| AQ-SYS-002 | Población del grafo causal | C1·C4 | A/B | OPEN |
| AQ-SYS-003 | Disparo / Reloj del Mundo | C2·C3·C4 | B | OPEN |
| AQ-SYS-004 | Binding ↔ tablas operacionales | C1·C2 | B | OPEN |
| AQ-SYS-005 | Atomicidad multi-escritura | C1·C2 | A/B | OPEN |
| AQ-SYS-006 | Calibración de políticas | C2·C3·C4 | B/F | OPEN |
| AQ-SYS-007 | Confianza escalar vs orden | C1·C2·C3·C4 | D | OPEN |
| AQ-SYS-008 | Tenant ≡ Sujeto | C1·C2·C3·C4 | C | OPEN |
| AQ-SYS-009 | Test infra (Postgres) | C1·C2·C3·C4 | A | OPEN |
| AQ-SYS-010 | Catálogo de permisos | C1·C3·C4 | A | OPEN |
| AQ-SYS-011 | Precondición de código | C1·C2·C3·C4 | A | OPEN |
| AQ-SYS-012 | Hogar de proyecciones efímeras | C3·C4 | B | OPEN |
| AQ-SYS-013 | Cardinalidad perturbación→foco→dx | C2·C3·C4 | A/B | OPEN |
| AQ-SYS-014 | Hogar de `RoleContext` | C3·C4 | B | OPEN |
| AQ-SYS-015 | Citas estables | todos | — | POLICY |
| AQ-SYS-016 | Persistencia de dos niveles | todos | — | POLICY |

**Ninguna AQ-SYS está resuelta.** Las Categoría A (001, 002, 009, 010, 011 + 005/013 parciales) son la cola crítica hacia la implementación (ver `ROADMAP_TO_CODE.md`, Fases B–D). Su resolución es de **binding/gobierno/evidencia**, no de razonamiento, y varias podrían requerir reabrir el canon — lo que exige autorización explícita del founder.
