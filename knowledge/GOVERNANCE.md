---
urn: nexus:metodo:gobernanza
title: NEXUS Memory OS — Authority & Governance (la constitución operativa)
plane: metodo
stratum: meta
type: specification
owner: founder (Juan Carlos Pelaez)
lifecycle_state: canonical
confidence: normative
evidence: NCA aprobada (2026-06-25); deltas cognitivos (Δ3 confianza, Δ6 reconciliación)
provenance: founder-approved
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,    why: "la autoridad máxima es la identidad; esta capa la sirve, no la sustituye", date: 2026-06-25 }
  - { rel: especifica,      target_urn: nexus:metodo:cognicion,  why: "fija los umbrales/reglas que enforcen el modelo cognitivo", date: 2026-06-25 }
  - { rel: fundamenta,      target_urn: nexus:metodo:navegacion, why: "la precedencia de lectura §12 deriva de esta jerarquía de autoridad", date: 2026-06-25 }
  - { rel: complementa,     target_urn: nexus:metodo:memory-os,  why: "la compuerta epistémica complementa la compuerta estructural §9", date: 2026-06-25 }
---

# NEXUS Memory OS — Authority & Governance

> **Qué es este documento.** La **constitución operativa**: define *quién tiene autoridad cuando hay
> conflicto* y *cómo cambia el conocimiento*. No describe conocimiento ni cognición; describe **poder
> y proceso**.
>
> **Frontera (anti-duplicación).** La compuerta **estructural** está en `nexus:metodo:memory-os` §9;
> la precedencia de **lectura** en `nexus:metodo:navegacion` §12 (deriva de aquí); el **modelo**
> cognitivo en `nexus:metodo:cognicion`. Aquí: la **autoridad** que todos ellos invocan.
>
> **Garantía de diseño.** Cualquier conflicto del ecosistema debe resolverse de forma
> **determinística** usando solo esta capa. Si un conflicto no resuelve aquí, es un defecto de esta
> capa y se corrige por ADR.

---

## 1. Jerarquía oficial de autoridad (la escalera maestra)

Cuando dos afirmaciones chocan, gana la de **mayor** autoridad. De mayor a menor:

1. **Identidad** (`nexus:identidad:core`) — **veta todo**. Solo cambia por ADR del founder.
2. **Principles / Values** (plano identidad).
3. **Especificaciones de Método** (Manifiesto, Ontología/Canon, esta Gobernanza, Navegación, Cognición) — las reglas del sistema.
4. **DecisionRecords (ADR `accepted`)** — la intención decidida.
5. **Conocimiento canónico del Mapa** (Patterns/Lessons `canonical`), ordenado por **confianza efectiva**.
6. **Territorio / Operación** — autoridad sobre *qué existe en runtime* (no sobre *qué debería ser*).
7. **Conocimiento `proposed`/`draft`** — la menor.

**Eje humano vs modelo (transversal):** a igualdad de nivel, una afirmación con `owner` humano vence a una producida por un modelo. Ningún modelo se auto-aprueba (ver §9).

## 2. Autoridad por ámbito de pregunta (evita falsos conflictos)

La autoridad está **acotada por la pregunta**; la mayoría de "conflictos" son preguntas distintas:

| Pregunta | Autoridad |
|----------|-----------|
| ¿Qué es verdad invariante? | Identidad |
| ¿Cuál es la regla del sistema? | Especificación de Método |
| ¿Qué decidimos? | ADR `accepted` |
| ¿Qué sabemos (creencia)? | Mapa canónico, por confianza |
| ¿Qué existe en runtime? | Territorio/Operación |

**Regla cruzada intención↔realidad (§13):** la intención (ADR) gobierna *qué debería ser*; la realidad (código/operación) es la verdad de *qué es*. Si divergen, no gana el silencio: se **reconcilia**.

## 3. Qué puede vetar CORE

CORE veta —y la afirmación en conflicto **no se materializa**— cuando algo:
- contradice qué es NEXUS/N-LABS o su simbiosis;
- propone construir lo que "nunca construimos" (frameworks especulativos, fragmentar módulos, infra de escala prematura, sofisticar sobre vender);
- viola la **frontera de asimetría** (dato del cliente cruzando a patrón sin anonimizar);
- degrada un invariante (§11).
El veto de CORE solo se levanta por **ADR del founder** que cambie CORE mismo.

## 4. Niveles de confianza (la escala que Cognición delegó)

Escala discreta de `confidence` para nodos del Mapa:
`hypothesis → observation → emerging → validated → principle → axiom`
(+ `normative` para especificaciones; `refuted`/`deprecated` para lo caído).

## 5. Reglas de promoción de conocimiento (umbrales — defaults parametrizables por ADR)

| Transición | Condición |
|-----------|-----------|
| hypothesis → observation | 1 Outcome que la confirma |
| observation → emerging | ≥2 Outcomes confirmatorios |
| emerging → validated | ≥3 Outcomes confirmatorios en **≥2 tenants distintos** y **0 refutaciones sin resolver** |
| validated → principle (candidato) | validated + evidencia en **≥5 tenants** + revisión del founder |
| principle → axiom | **ADR del founder** (pasa a Identidad) |
| cualquiera → refuted/AntiPattern | un Outcome decisivo que la refuta |

**Decaimiento (Δ5):** un nodo `validated` no re-evidenciado dentro de su **ventana de validez**
(default 12 meses, parametrizable por ADR) **baja un nivel** (`validated→emerging`) hasta re-evidenciarse.
Nada es verdadero por inercia. **Confianza efectiva = nivel por evidencia − decaimiento por tiempo.**

> Promover a `principle`/`axiom` o cambiar estos umbrales **requiere ADR**. Subir de `hypothesis` a
> `validated` por evidencia es **automático** si se cumplen las condiciones (lo verifica el gate, §8).

## 6. Cómo evoluciona un Pattern · cuándo caduca una Hypothesis

- **Pattern:** `emerging`→`validated` por las reglas §5; **degrada** a AntiPattern si los Outcomes lo
  refutan; **decae** sin re-validación. Toda transición deja arista (`evidencia`/`refuta`/`supersede`).
- **Hypothesis caduca** cuando: (a) un Outcome la **refuta** → estado `refutada` (se conserva,
  enlazada); o (b) **expira** por decaimiento si nunca se prueba dentro de su ventana → `archived`.
  **Nunca se borra**; deja de ser válida pero permanece trazable.

## 7. Ciclo de vida de una decisión (ADR)

`proposed → reviewed → accepted → (en vigor) → superseded → archived`.
- Una entrada de **ADR-BACKLOG** es un ADR `proposed` diferido.
- Una decisión nunca se edita: se **supersede** con un ADR nuevo enlazado (`supersede`).
- Toda decisión preserva **contexto + opciones + consecuencia** → trazabilidad (§14).

## 8. Cómo se aprueba un cambio — ADR vs automático

**Automático (sin ADR), si pasa las dos compuertas (estructural §9 del Manifiesto + epistémica §5):**
- crear un nodo-instancia nuevo (`proposed`/`draft`): un Pattern emergente, una Lesson, un Outcome, un ADR-como-decisión, datos operacionales;
- avanzar lifecycle o subir confianza cuando se cumplen las condiciones;
- superseder con arista y razón correctas.

**Requiere ADR (founder si toca Identidad/Estrategia):**
- cambiar el **esquema de nodo**, el **vocabulario de relaciones**, la **taxonomía** de planos/estratos/tipos;
- cambiar **Identidad**, un **Principle**, o cualquier **especificación de Método congelada**;
- **promover** un Pattern a Principle/Axioma;
- cambiar **esta jerarquía de autoridad** o los **umbrales** de §5.

## 9. Quién puede modificar un nodo canónico · autoridad entre múltiples LLM

- Un nodo `canonical` solo lo modifica su **`owner`**, y solo por **append+supersede** (jamás sobrescritura).
- **Separación productor/aprobador:** un modelo (o cualquiera) puede **proponer** (`proposed`); la
  **promoción** a `canonical` la hace el `owner` mediante el gate. **Ningún modelo se auto-aprueba.**
- **Procedencia manda en empates:** a igual nivel y confianza, gana lo de `owner` humano sobre lo
  producido por modelo; entre modelos, **no decide "quién es más listo" sino la evidencia/confianza**.
- Un modelo puede **proponer ADRs**; los ADR de Identidad/Estrategia solo los **acepta el founder**.

## 10. Proceso de reconciliación (cuando se detecta contradicción)

1. **Detectar** — la contradicción se registra como nodo enlazado (`contradice`); nunca se sobrescribe.
2. **Clasificar** — ¿spec-vs-spec? ¿creencia-vs-creencia? ¿intención-vs-realidad? (define qué tabla de §2 aplica).
3. **Aplicar autoridad** — jerarquía §1 + ámbito §2 + confianza efectiva §5.
4. **Desempata** → el perdedor pasa a `superseded`/`refuted` con arista y razón; la historia se preserva.
5. **No desempata** (igual autoridad y confianza) → **escalar al `owner`**; si toca Identidad/Método → **ADR del founder**. Mientras tanto, ambas quedan `proposed` enlazadas por `contradice` (ninguna canónica).
6. **Trazable siempre** — el conflicto y su resolución son conocimiento, no ruido.

## 11. Dos investigaciones con conclusiones opuestas (aplicación directa de §10)

Se comparan por **evidencia → confianza → recencia → procedencia**. Si una domina, la otra pasa a
`superseded` enlazada. Si **empatan**, **ninguna es canónica**: permanecen como creencias abiertas
unidas por `contradice` hasta que un **Experimento/Outcome decisivo** desempate, o el `owner` decida.
El desacuerdo no resuelto es un **nodo de conocimiento válido**, no un error a esconder.

## 12. Autoridad entre documentos

Precedencia documento-vs-documento (aplicación de §1–§2):
`Identidad > Principles > Especificación de Método > ADR accepted > Mapa canónico (por confianza) > Territorio (para "qué es") > proposed/draft`.
A igualdad de nivel: mayor **confianza efectiva**, luego mayor **`decision_time`**, luego `supersede` manda. (Navegación §12 es esta misma escalera aplicada a la **lectura**.)

## 13. Autoridad entre conocimiento e implementación

- El **ADR/Pattern** gobierna la **intención** (qué debería ser).
- El **código/operación** es la verdad de **qué es** ahora.
- **Divergencia = hallazgo**, no override silencioso: o la implementación se ajusta a la decisión, o
  se emite un **ADR nuevo** que supersede la decisión (cambiamos de opinión, con trazabilidad). El
  código nunca cambia una decisión por sí solo; **dispara** una decisión.

## 14. Preservación de la trazabilidad de una decisión

- **URN inmutable** → toda referencia histórica resuelve siempre.
- **Append + supersede** → nada se borra; lo reemplazado queda enlazado.
- **Bitemporal** (`valid_time`/`decision_time`) → se reconstruye *qué se decidió y cuándo*.
- **Contexto retenido** → cada ADR conserva por qué se decidió; la cadena `supersede`/`deriva-de` es
  navegable de la decisión vigente hasta su evidencia y sus predecesoras.

---

## 15. Determinismo (autoauditoría incorporada)

Todo conflicto cae en una de tres clases y resuelve aquí:
- **spec-vs-spec / doc-vs-doc** → §1, §12.
- **creencia-vs-creencia** (incl. investigaciones opuestas, evolución de Pattern, validez de Hypothesis) → §4–§6, §10–§11.
- **intención-vs-realidad** (conocimiento vs implementación) → §13.
Sobre todas: el **veto de Identidad** (§3) y, ante empate irreducible, la **escalada a `owner`/ADR**
(§10.5) — que es una salida determinística (no un "ya veremos"). No existe conflicto sin ruta.

---

*Este documento es el nodo `nexus:metodo:gobernanza` y es la constitución operativa del NEXUS Memory
OS. Es la fuente de autoridad que el Manifiesto (estructura), Navegación (lectura) y Cognición
(modelo) invocan. Cambiarlo requiere un ADR del founder.*
