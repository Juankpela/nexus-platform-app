# C5 — START CHECKLIST

> **Naturaleza.** Lista de verificación formal que **habilita el inicio de la redacción de C5 — JUZGAR**. C5 NO se inicia mientras un solo ítem esté sin marcar. Este documento no construye C5; lo gobierna. Fecha: 2026-06-29.

## Precondiciones para iniciar C5

- [x] **Arquitectura congelada.** Canon (Constitución · MOV · OSE · Arquitectura · Motor) FROZEN.
- [x] **Milestone 1 cerrado** (en Git local). Release `v0.1.0-motor-foundation` publicada en `docs/releases/MILESTONE_1.md`.
- [ ] **Git sincronizado (GitHub remoto).** ⚠️ **PENDIENTE** — `origin/main` aún no iguala a `HEAD` por bloqueo de auth del Git Credential Manager. **Este es el único ítem bloqueante restante.** Requiere completar el push (operador humano o reintento con GCM autorizado). *(Git local sí está sincronizado: fuente de verdad operativa ✅.)*
- [x] **AQ sistémicas identificadas.** 16 decisiones transversales en `docs/architecture/SYSTEM_DECISIONS.md` (`AQ-SYS-001..016`); ninguna resuelta por intuición.
- [x] **Quality Gates publicados.** `docs/engineering/QUALITY_GATES.md` (9 gates obligatorios).
- [x] **ROADMAP_TO_CODE aprobado.** `docs/engineering/ROADMAP_TO_CODE.md` (Fases A–G).
- [x] **SYSTEM_DECISIONS publicado.** `docs/architecture/SYSTEM_DECISIONS.md`.
- [x] **ENGINEERING_STATUS actualizado.** Cierre de Milestone 1 + política de persistencia registrados.
- [x] **MILESTONE_1 publicado.** `docs/releases/MILESTONE_1.md`.
- [x] **Ningún componente pendiente de falsación.** C1, C2, C3, C4 pasaron su Falsification Gate.

## Veredicto

**C5 NO puede iniciarse todavía.** Falta **1 ítem**: la sincronización con GitHub remoto (regla permanente: *ningún componente comienza mientras GitHub no sea la fuente de verdad sincronizada*; y la política de los 9 gates exige push **antes de comenzar un nuevo componente**).

En cuanto `git rev-parse origin/main == git rev-parse HEAD`, este ítem se marca y **C5 — JUZGAR queda autorizado para redacción**, partiendo de `C5_PREPARATION.md` (frontera en G6; reusa `traverseDownstream` + `mov_integrar` de C1; declara su asimetría de escritura) y pasando por los 9 Quality Gates.

## Recordatorio de alcance de C5 (de `C5_PREPARATION.md`)
- Empieza en **G6** (suficiencia por consecuencia); luego **G7** (proyección hacia adelante, `intervencion`) y **G8** (decidir/abstener/escalar, `compromiso` + `expectativa`).
- Es el **primer acto que vuelve a escribir** sustancia tras el OSE (rompe el patrón solo-lectura de C3/C4).
- Hereda AQ: `AQ-C5-UMBRAL-SUFICIENCIA`, `AQ-C5-POLITICA-PALANCA`, `AQ-C5-EXPECTATIVA-OUTCOME`, `AQ-C5-ESCRITURA-ATOMICA` (→ `AQ-SYS-005`), `AQ-C5-PREEMPCION-RECOGIDA` (→ `AQ-SYS-012`).
- **Su operación** (no su spec) depende de las responsabilidades huérfanas `AQ-SYS-001` (brecha) y `AQ-SYS-002` (grafo causal).
