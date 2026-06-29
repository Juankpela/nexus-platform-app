# ENGINEERING STATUS — Motor Cognitivo de NEXUS

> **Qué es esto.** Panel de control de la fase de ingeniería del Motor: convierte el diseño cognitivo **CONGELADO** (Constitución, MOV, OSE, Arquitectura, Motor) en especificaciones implementables, **un componente a la vez**. Cualquier modelo o persona que se incorpore lee esta página primero: qué está cerrado, qué sigue en construcción y **cuál es el único componente autorizado para trabajar a continuación**.
>
> **Reglas de gobierno (no negociables):** arquitectura congelada · ingeniería iterativa · **falsación primero** · no se avanza al siguiente componente hasta CERRAR el anterior · los vacíos del canon NO se inventan, se registran como **Architectural Question (AQ)**.

_Última actualización: 2026-06-29._

> ## 🏁 MILESTONE 1 — `v0.1.0-motor-foundation` — CERRADO (Git local)
> Canon + C1–C4 **congelados y falsificados**; revisión transversal **APROBADA** (sin ciclos, DAG confirmado, responsabilidades aisladas). Release: [`docs/releases/MILESTONE_1.md`](../releases/MILESTONE_1.md). Gobernanza: [`QUALITY_GATES.md`](QUALITY_GATES.md) · [`SYSTEM_DECISIONS.md`](../architecture/SYSTEM_DECISIONS.md) · [`ROADMAP_TO_CODE.md`](ROADMAP_TO_CODE.md). **Sincronización GitHub: PENDIENTE** (bloqueo de auth GCM, no arquitectónico) → se completa en el punto de sync del cierre.
>
> **Política de persistencia (dos niveles, `AQ-SYS-016`):** Git local = fuente de verdad operativa (basta para trabajar si todo está committeado); GitHub remoto = fuente de verdad compartida. El **agente commitea, verifica e informa commits pendientes pero NO ejecuta el push**; el **operador humano** hace **un único `git push`** antes de: nueva fase · nuevo componente · cierre de milestone · entrega externa · fin de sesión. Detenerse solo ante: cambios sin commit · riesgo de pérdida · inconsistencia local · conflictos de merge · divergencia de ramas.

## Estado por componente

| # | Componente | Estado | Falsación | Congelado | AQ abiertas | Archivo |
|---|---|---|---|---|---|---|
| C1 | Modelo de Datos del MOV | ✅ CERRADO | ✅ refutación incorporada (4/4 NECESITA_AJUSTE) | ✅ | 20 | [`01-mov-data-model.md`](01-mov-data-model.md) |
| C2 | Operational State Engine (OSE) | ✅ CERRADO | ✅ pruebas de falsación internas | ✅ | 17 | [`02-operational-state-engine.md`](02-operational-state-engine.md) |
| C3 | ATENDER | ✅ CERRADO | ✅ **SURVIVED** — Gate 5 refutadores (2026-06-29) | ✅ | 17 | [`03-atender.md`](03-atender.md) |
| C4 | DIAGNOSTICAR | ✅ CERRADO | ✅ **SURVIVED** — Gate 5 refutadores + targeted rework (2026-06-29) | ✅ | 25 | [`04-diagnosticar.md`](04-diagnosticar.md) |
| C5 | JUZGAR | ⏳ PENDIENTE (siguiente autorizado) | — | — | — | — |
| C6 | ARTICULAR | ⏳ PENDIENTE | — | — | — | — |
| C7 | RECONCILIAR | ⏳ PENDIENTE | — | — | — | — |

**Leyenda.** ✅ cerrado/cumplido · 🟡 en curso · ⏳ no iniciado · — no aplica todavía.
"Falsación" = el componente fue atacado adversarialmente y el estado prohibido resultó inalcanzable; "Congelado" = cerrado, ya no se modifica salvo que una AQ aguas arriba se resuelva y lo obligue.

## Revisión de Milestone (C1–C4) — APROBADA (2026-06-29)

Revisión transversal del sistema tras congelar C1–C4. Veredicto: **el Motor sigue siendo consistente como sistema** — grafo **acíclico** (`Canon → C1 → C2 → C3 → C4`, sin ciclos), fronteras de responsabilidad aisladas, 0 conceptos nuevos, citas al canon verbatim. Hallazgo rector: C1–C4 son un **núcleo de razonamiento completo pero un bucle operativo abierto** — 4 responsabilidades huérfanas no asignadas por el canon (crear brecha · poblar `relacion_causal` · encender el Motor · binding a tablas operacionales), registradas como AQ. Mayor riesgo: atomicidad de escritura de C2/C1 + las 4 huérfanas.

| Documento | Contenido |
|---|---|
| [`ARCHITECTURE_MILESTONE_REVIEW.md`](ARCHITECTURE_MILESTONE_REVIEW.md) | Grafo de dependencias + chequeo de ciclos, fronteras, mapa de interfaces, complejidad/riesgo, AQ clasificadas A/B/C/D, trazabilidad |
| [`ROADMAP_TO_CODE.md`](ROADMAP_TO_CODE.md) | Fases A–G (specs→dominio→infra→integración→UI→calibración→producción) con criterios entrada/salida/riesgos y mapa AQ→fase |
| [`C5_PREPARATION.md`](C5_PREPARATION.md) | Auditoría conceptual de la frontera DIAGNOSTICAR↔JUZGAR (no es la spec de C5) |

**AQ a nivel de sistema (nuevas):**
- `AQ-SYS-ROLECONTEXT-HOME` — `RoleContext` (concepto del canon, CONSTITUCION §8) vive físicamente en C3; C4/C5/C6/C7 lo importan de C3. ¿Debería vivir en un módulo kernel compartido? No bloqueante. Resolver en Fase B o si C3 se reabre.
- `AQ-SYS-CITAS-FRAGILES` — política: las referencias entre componentes deben ser por **nombre estable** (símbolo/puerto/tipo/invariante/§), nunca por número de línea (las citas C4→C3 por línea se rompieron al editar C3). No se editan congelados; aplica a C5+ y a cualquier reapertura.

## Orden obligatorio (cadena del Motor)

`C1 datos MOV` → `C2 OSE` → `C3 ATENDER` → `C4 DIAGNOSTICAR` → **`C5 JUZGAR`** → `C6 ARTICULAR` → `C7 RECONCILIAR`.

No se abre un componente mientras el anterior no esté CERRADO. Cada componente reusa **solo** lo que el anterior expone; si necesita algo que el canon no ofrece, lo registra como AQ y **no lo inventa**.

## Siguiente componente autorizado

> **C5 — JUZGAR.** Preparación conceptual **COMPLETA** ([`C5_PREPARATION.md`](C5_PREPARATION.md)); redacción de la spec **NO iniciada** (espera autorización explícita del founder). Frontera con C4 confirmada nítida. Recoge el `Diagnostico` derrotable que produce C4 (G7: proyectar la palanca **hacia adelante** contra la CAUSA, recorrer el grafo `traverseDownstream`, generar `intervencion`, decidir/abstenerse/escalar en G8) — el sentido del recorrido que C4 tiene **estructuralmente prohibido** (`DiagnoseDeps` no inyecta `traverseDownstream`). El gate de suficiencia por consecuencia **G6 = DIAGNOSTICAR→JUZGAR** es la primera responsabilidad de C5 (ver C4 `AQ-DIAG-UMBRAL-ABSTENCION`).

## Forma de cada componente (contrato de la spec)

13 secciones + tabla de trazabilidad + Architectural Questions:
propósito · responsabilidades · límites · interfaces · contratos de entrada · contratos de salida · invariantes · modelo de datos · flujo interno · pseudocódigo · pruebas unitarias · **pruebas de falsación** · criterios de aceptación.

Stack real: Supabase/PostgreSQL + TypeScript + Next.js, hexagonal (`modules/<x>/{domain, application/{ports,use-cases}, infrastructure}`). Reusos transversales: `audit_events.metadata` (procedencia/Ledger), RPC `security definer` (atomicidad), RLS `has_tenant_permission`.

## Notas de cierre

- **C3 (2026-06-29).** Falsificado por 5 refutadores independientes contra C1, C2 y los 4 docs de canon + el código real. Resultado **SURVIVED**: 0 APIs inventadas, 0 conceptos nuevos, 0 invariantes rotos; la llamada `audit.append` compila (`subjectType` es `string` libre). Los 4 claims refutados eran **etiquetas de cita** (`MOTOR §5 Q4` → `ARQUITECTURA §3 acto 3` + `MOTOR §3.2 G0.5/G4`; `§6 "control sobre las brechas"` → `§3 "la sustancia"`; nota de disciplina de citas invertida; aclaración de "verificado en disco"). Veredicto registrado dentro del propio doc.
- **C4 (2026-06-29).** Falsificado por 5 refutadores contra C1, C3 y los 4 docs de canon + código real. **SURVIVED**: núcleo conceptual y citas verbatim, API de C1 y contrato de C3 correctos, 0 APIs inventadas / 0 conceptos nuevos / 0 invariantes rotos / 0 problemas estructurales. Clasificación **NEEDS TARGETED REWORK**, corregido en el mismo pase (4 defectos localizados, ninguno de lógica): citas a C3 reescritas **por nombre de símbolo** (las de línea se rompieron al editar C3 — lección de fragilidad); `getById` C1 L194→L156; `nivelCausalDe` AQ-gated (`nivel_causal` es columna, no `attrs`); `relacionCausalIdDe`/`esAccionablePorRol`/`nivelCausalDe` declarados **placeholders AQ-gated** (el pseudocódigo es ilustrativo, no compila hasta resolver sus AQ). 25 AQ abiertas; 4 operativamente bloqueantes (`AUTORIA-BRECHA`, `POBLADO-GRAFO`, `NODO-CAUSAL`, `LECTURA-ENLACE-CAUSAL`).
- **Precondición compartida (C3/C4+).** C1 (`modules/mov`) y C2 (`modules/ose`) están especificados en `.md` pero **aún no existen como TypeScript** en `modules/`. Las pruebas de dominio/aplicación corren cuando C1/C2 sean código importable (C3 `AQ-ATENDER-PRECONDICION-C1C2`). El permiso `mov.read` lo referencia la RLS de C1 pero **no está sembrado** (C1 `AQ-PERMISOS` ↔ C3 `AQ-ATENDER-PERMISOS`).
