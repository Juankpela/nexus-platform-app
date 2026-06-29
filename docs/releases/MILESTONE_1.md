# MILESTONE 1 — Motor Foundation

> **Naturaleza.** Release de **arquitectura**, NO de producto. Marca la congelación oficial del núcleo cognitivo (Canon + C1–C4) tras pasar cada componente su Falsification Gate y tras una revisión transversal de sistema. No despliega código (aún no existe TypeScript; ver `AQ-SYS-011`).

## Versión
**`v0.1.0-motor-foundation`**

## Estado
- **Architecture Frozen** ✅ — canon (Constitución · MOV · OSE · Arquitectura Cognitiva · Motor Cognitivo) congelado.
- **Engineering Frozen** ✅ — C1, C2, C3, C4 CERRADOS; cada uno pasó su Falsification Gate (SURVIVED).
- **Git local sincronizado** ✅ — todo committeado; Git local es la fuente de verdad operativa (`AQ-SYS-016`).
- **GitHub remoto sincronizado** ⚠️ **PENDIENTE** — push bloqueado por autenticación del Git Credential Manager (no es problema arquitectónico ni del repositorio). Se completa en el punto de sincronización del cierre de este Milestone.

## Componentes incluidos
| Componente | Estado | Falsación | AQ abiertas | Archivo |
|---|---|---|---|---|
| **Canon** (5 docs) | FROZEN | — | — | `docs/{CONSTITUCION,MODELO-OPERACIONAL-VIVO,OPERATIONAL-STATE-ENGINE,ARQUITECTURA-COGNITIVA,MOTOR-COGNITIVO}.md` |
| **C1 — MOV Data Model** | FROZEN | refutación incorporada | 20 | `docs/engineering/01-mov-data-model.md` |
| **C2 — Operational State Engine** | FROZEN | pruebas de falsación internas | 17 | `docs/engineering/02-operational-state-engine.md` |
| **C3 — ATENDER** | FROZEN | SURVIVED (5 refutadores) | 17 | `docs/engineering/03-atender.md` |
| **C4 — DIAGNOSTICAR** | FROZEN | SURVIVED + targeted rework | 25 | `docs/engineering/04-diagnosticar.md` |

## Hallazgos principales (de `ARCHITECTURE_MILESTONE_REVIEW.md`)
- **Sin ciclos.** Grafo de dependencias acíclico.
- **DAG confirmado:** `Canon → C1 → C2 → C3 → C4` (C2 no toca C3/C4; el único enlace C4→C3 es hacia adelante).
- **Responsabilidades aisladas:** una por componente; fronteras duras verificables; C1 hub, C2 único escritor del bucle, C3/C4 estrictamente solo-lectura.
- **AQ sistémicas identificadas y centralizadas** en `SYSTEM_DECISIONS.md` (16 decisiones transversales; 4 responsabilidades huérfanas: autoría de brecha, población del grafo causal, disparo/reloj, binding operacional). Ninguna resuelta.
- **Núcleo de razonamiento completo, bucle operativo abierto:** las terminales de entrada/salida del Motor están diferidas a binding/gobierno y a componentes futuros — límite real y honesto del milestone.
- **Repositorio:** Git local íntegro y versionado; sincronización remota pendiente solo por auth.

## Gobernanza publicada con este milestone
- `docs/engineering/QUALITY_GATES.md` — los 9 gates obligatorios para todo componente futuro.
- `docs/architecture/SYSTEM_DECISIONS.md` — registro central de decisiones/AQ transversales.
- `docs/engineering/ROADMAP_TO_CODE.md` — fases A–G hacia el producto.
- `docs/engineering/C5_PREPARATION.md` — auditoría conceptual de la frontera DIAGNOSTICAR↔JUZGAR.

## Métricas del núcleo
| Métrica | C1 | C2 | C3 | C4 | Total |
|---|---|---|---|---|---|
| Invariantes propios | 9 | ~11 | 11 | 11 | ~42 |
| Puertos propios | 6 | 4 | 1 | 1 | 12 |
| AQ por componente | 20 | 17 | 17 | 25 | 79 (→ ~16 vacíos raíz tras de-duplicar) |

## Próximo objetivo
**C5 — JUZGAR** (G6 suficiencia · G7 proyección hacia adelante · G8 decidir/abstener/escalar). Primer acto que **vuelve a escribir** sustancia tras el OSE. Su inicio está gobernado por `C5_START_CHECKLIST.md` y por la regla permanente: ningún componente comienza mientras GitHub no sea la fuente de verdad sincronizada.

## Condición de cierre oficial
Este Milestone se considera **oficialmente cerrado y publicado** cuando `git rev-parse origin/main == git rev-parse HEAD`. Hasta entonces queda **cerrado en Git local, publicación remota pendiente** (bloqueo de auth, no arquitectónico).
