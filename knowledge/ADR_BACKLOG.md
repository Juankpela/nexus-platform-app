---
urn: nexus:metodo:adr-backlog
title: NEXUS Memory OS — ADR Backlog (decisiones arquitectónicas diferidas, no bloqueantes)
plane: metodo
stratum: meta
type: specification
owner: N-LABS (custodio)
lifecycle_state: canonical          # el registro es canónico; cada entrada es 'proposed'
confidence: normative
evidence: hallazgos de autoauditoría (Goal 4)
provenance: Claude (Sonnet 4.6) — autoauditoría
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,   why: "las decisiones diferidas también respetan la identidad", date: 2026-06-25 }
  - { rel: afecta,          target_urn: nexus:metodo:ontologia, why: "BL-001 extendería el vocabulario de relaciones", date: 2026-06-25 }
  - { rel: afecta,          target_urn: nexus:metodo:memory-os, why: "BL-002 ratificaría el namespace del punto de entrada", date: 2026-06-25 }
---

# ADR Backlog

> **Qué es.** Registro de decisiones arquitectónicas **diferidas** que mejoran el sistema pero **no
> bloquean** el diseño. Disciplina: no interrumpimos la construcción de la arquitectura por mejoras
> no-bloqueantes; las acumulamos aquí para resolverlas en bloque, ordenadamente.
>
> Cada entrada es un **DecisionRecord en estado `proposed`**. Promoverla a un ADR `accepted`
> requiere un Goal de decisión explícito. Nada aquí se implementa hasta entonces.

---

## ADR-BACKLOG-001 — Extender el vocabulario de relaciones con verbos meta del plano Método

- **Estado:** backlog (proposed) · **No bloqueante.**
- **Origen:** autoauditoría Goal 4.
- **Contexto:** los nodos del plano Método se enlazan con verbos (`implementa`, `especifica`,
  `define`, `extiende`, `usa`, `delega-en`, `afecta`) que **no figuran** en el vocabulario de
  relaciones del Canon (`nexus:metodo:ontologia` §D), orientado a Territorio/Mapa.
- **Decisión a tomar:** añadir estos verbos meta al Canon **o** remapearlos a verbos existentes.
- **Por qué se difiere:** no bloquea la construcción; los enlaces resuelven igual. Se decide en bloque.
- **Afecta:** `nexus:metodo:ontologia`.

## ADR-BACKLOG-002 — Ratificar el namespace `entry` del punto de entrada

- **Estado:** backlog (proposed) · **No bloqueante.**
- **Origen:** autoauditoría Goal 4.
- **Contexto:** `nexus:entry:claude-md` usa el namespace `entry`, fuera del enum de planos
  `{identidad, territorio, mapa, metodo}` (introducido de facto por el Manifiesto).
- **Decisión a tomar:** ratificar `entry` como namespace reservado del único punto de entrada **o**
  remapear a `nexus:metodo:claude-md`.
- **Por qué se difiere:** no bloquea; la URN resuelve por Índice. Se decide en bloque.
- **Afecta:** `nexus:metodo:memory-os`, `nexus:metodo:navegacion`.

## ADR-BACKLOG-003 — Reconciliar el formato documentado de URN (Grupo A · Arquitectura)

- **Estado:** backlog (proposed) · **No bloqueante.**
- **Origen:** validación Goal 7 (hallazgo Alta).
- **Contexto:** `nexus:metodo:memory-os` §4 documenta el formato `nexus:‹plano›:‹tipo›:‹slug›`
  (4 segmentos), pero **todas** las URNs reales usan 3 (`nexus:‹plano›:‹slug›`, sin `‹tipo›`), incl.
  `nexus:identidad:core`. El `type` vive como campo de cabecera, no en la URN.
- **Decisión a tomar:** corregir el formato documentado a 3 segmentos **o** declarar `‹tipo›` opcional.
  (Re-acuñar URNs NO es opción: violaría la inmutabilidad.)
- **Por qué se difiere:** el Kernel Loader trata la URN como clave opaca (match exacto), así que no
  bloquea. Se resuelve por ADR al finalizar la materialización.
- **Afecta:** `nexus:metodo:memory-os`, `nexus:metodo:ontologia`.

## ADR-BACKLOG-004 — `accepted` ausente del enum `lifecycle_state` (Grupo C · Higiene)

- **Estado:** backlog (proposed) · **No bloqueante.**
- **Origen:** validación Goal 7.
- **Contexto:** `nexus:metodo:gobernanza` §7 usa el estado `accepted` para el ciclo de un ADR, pero el
  enum `lifecycle_state` de `nexus:metodo:memory-os` §6 no lo incluye (`…→ canonical → superseded…`).
- **Decisión a tomar:** añadir `accepted` al enum **o** mapear `accepted` ≡ `canonical` para ADRs.
- **Por qué se difiere:** higiene; no afecta navegación ni autoridad.
- **Afecta:** `nexus:metodo:memory-os`, `nexus:metodo:gobernanza`.

## ADR-BACKLOG-005 — Terminología "escalar epistémico" vs niveles ordinales (Grupo C · Higiene)

- **Estado:** backlog (proposed) · **No bloqueante.**
- **Origen:** validación Goal 7.
- **Contexto:** `nexus:metodo:memory-os` §56 describe `confidence` como "escalar epistémico"
  (sugiere continuo), pero `nexus:metodo:gobernanza` §4 define una escala **ordinal discreta**
  (`hypothesis→…→axiom`).
- **Decisión a tomar:** unificar la terminología a "nivel ordinal de confianza".
- **Por qué se difiere:** puramente terminológico; la semántica operativa ya es la ordinal.
- **Afecta:** `nexus:metodo:memory-os`.

---

*Nodo `nexus:metodo:adr-backlog`. Append-only: las entradas no se borran; al resolverse, se marcan
y se enlaza al ADR `accepted` resultante (preservación de historia).*
