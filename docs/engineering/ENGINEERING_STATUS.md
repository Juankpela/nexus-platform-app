# ENGINEERING STATUS — Motor Cognitivo de NEXUS

> **Qué es esto.** Panel de control de la fase de ingeniería del Motor: convierte el diseño cognitivo **CONGELADO** (Constitución, MOV, OSE, Arquitectura, Motor) en especificaciones implementables, **un componente a la vez**. Cualquier modelo o persona que se incorpore lee esta página primero: qué está cerrado, qué sigue en construcción y **cuál es el único componente autorizado para trabajar a continuación**.
>
> **Reglas de gobierno (no negociables):** arquitectura congelada · ingeniería iterativa · **falsación primero** · no se avanza al siguiente componente hasta CERRAR el anterior · los vacíos del canon NO se inventan, se registran como **Architectural Question (AQ)**.

_Última actualización: 2026-06-29._

## Estado por componente

| # | Componente | Estado | Falsación | Congelado | AQ abiertas | Archivo |
|---|---|---|---|---|---|---|
| C1 | Modelo de Datos del MOV | ✅ CERRADO | ✅ refutación incorporada (4/4 NECESITA_AJUSTE) | ✅ | 20 | [`01-mov-data-model.md`](01-mov-data-model.md) |
| C2 | Operational State Engine (OSE) | ✅ CERRADO | ✅ pruebas de falsación internas | ✅ | 17 | [`02-operational-state-engine.md`](02-operational-state-engine.md) |
| C3 | ATENDER | ✅ CERRADO | ✅ **SURVIVED** — Gate 5 refutadores (2026-06-29) | ✅ | 17 | [`03-atender.md`](03-atender.md) |
| C4 | DIAGNOSTICAR | 🟡 EN CURSO (draft) | — | No | — | [`04-diagnosticar.md`](04-diagnosticar.md) |
| C5 | JUZGAR | ⏳ PENDIENTE | — | — | — | — |
| C6 | ARTICULAR | ⏳ PENDIENTE | — | — | — | — |
| C7 | RECONCILIAR | ⏳ PENDIENTE | — | — | — | — |

**Leyenda.** ✅ cerrado/cumplido · 🟡 en curso · ⏳ no iniciado · — no aplica todavía.
"Falsación" = el componente fue atacado adversarialmente y el estado prohibido resultó inalcanzable; "Congelado" = cerrado, ya no se modifica salvo que una AQ aguas arriba se resuelva y lo obligue.

## Orden obligatorio (cadena del Motor)

`C1 datos MOV` → `C2 OSE` → **`C3 ATENDER`** → `C4 DIAGNOSTICAR` → `C5 JUZGAR` → `C6 ARTICULAR` → `C7 RECONCILIAR`.

No se abre un componente mientras el anterior no esté CERRADO. Cada componente reusa **solo** lo que el anterior expone; si necesita algo que el canon no ofrece, lo registra como AQ y **no lo inventa**.

## Siguiente componente autorizado

> **C4 — DIAGNOSTICAR.** Único componente habilitado para trabajo de redacción/falsación. Ya existe un draft (`04-diagnosticar.md`); aún **no** está falsado ni congelado. Recoge el `Focus` efímero que produce C3 (G5: determinar el porqué, recorrer el grafo causal hacia atrás) — capacidad que C3 tiene **estructuralmente prohibida** (`AtenderDeps` no inyecta `CausalGraphRepository`).

## Forma de cada componente (contrato de la spec)

13 secciones + tabla de trazabilidad + Architectural Questions:
propósito · responsabilidades · límites · interfaces · contratos de entrada · contratos de salida · invariantes · modelo de datos · flujo interno · pseudocódigo · pruebas unitarias · **pruebas de falsación** · criterios de aceptación.

Stack real: Supabase/PostgreSQL + TypeScript + Next.js, hexagonal (`modules/<x>/{domain, application/{ports,use-cases}, infrastructure}`). Reusos transversales: `audit_events.metadata` (procedencia/Ledger), RPC `security definer` (atomicidad), RLS `has_tenant_permission`.

## Notas de cierre

- **C3 (2026-06-29).** Falsificado por 5 refutadores independientes contra C1, C2 y los 4 docs de canon + el código real. Resultado **SURVIVED**: 0 APIs inventadas, 0 conceptos nuevos, 0 invariantes rotos; la llamada `audit.append` compila (`subjectType` es `string` libre). Los 4 claims refutados eran **etiquetas de cita** (`MOTOR §5 Q4` → `ARQUITECTURA §3 acto 3` + `MOTOR §3.2 G0.5/G4`; `§6 "control sobre las brechas"` → `§3 "la sustancia"`; nota de disciplina de citas invertida; aclaración de "verificado en disco"). Veredicto registrado dentro del propio doc.
- **Precondición compartida (C3+).** C1 (`modules/mov`) y C2 (`modules/ose`) están especificados en `.md` pero **aún no existen como TypeScript** en `modules/`. Las pruebas de dominio/aplicación corren cuando C1/C2 sean código importable (C3 `AQ-ATENDER-PRECONDICION-C1C2`). El permiso `mov.read` lo referencia la RLS de C1 pero **no está sembrado** (C1 `AQ-PERMISOS` ↔ C3 `AQ-ATENDER-PERMISOS`).
