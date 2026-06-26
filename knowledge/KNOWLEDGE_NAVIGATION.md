---
urn: nexus:metodo:navegacion
title: NEXUS Memory OS — Estrategia Oficial de Navegación del Conocimiento
plane: metodo
stratum: meta
type: specification
owner: N-LABS (custodio)
lifecycle_state: canonical
confidence: normative
evidence: NCA aprobada (2026-06-25); Manifiesto §12 (principios de lectura)
provenance: founder-approved
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,    why: "la navegación nunca puede pasar por encima de la identidad", date: 2026-06-25 }
  - { rel: extiende,        target_urn: nexus:metodo:memory-os,  why: "operacionaliza los principios de lectura del §12", date: 2026-06-25 }
  - { rel: usa,             target_urn: nexus:metodo:ontologia,  why: "navega siguiendo el vocabulario de relaciones del Canon", date: 2026-06-25 }
  - { rel: delega-en,       target_urn: nexus:metodo:gobernanza, why: "el cálculo de confianza para desempate epistémico vive allá", date: 2026-06-25 }
  - { rel: gobierna,        target_urn: nexus:entry:claude-md,   why: "define cómo el punto de entrada debe rutear", date: 2026-06-25 }
---

# NEXUS Memory OS — Estrategia de Navegación

> **Qué es este documento.** No describe conocimiento; describe **cómo recorrerlo**. Define el
> procedimiento determinístico de localización, ruteo, poda de contexto y resolución de conflictos.
>
> **Frontera (anti-duplicación).** Los *principios* de lectura están en `nexus:metodo:memory-os` §12;
> el *vocabulario* de relaciones en `nexus:metodo:ontologia`; el *cálculo epistémico* de confianza en
> `nexus:metodo:gobernanza`. Aquí: el **algoritmo de navegación** que los usa.
>
> **Nota de namespace (observación para ADR):** `nexus:entry:claude-md` usa el namespace reservado
> `entry` para el único punto de entrada (introducido de facto por el Manifiesto). Pendiente de
> ratificar por ADR; se usa consistentemente entretanto.

---

## 1. Principio rector: navegar antes de leer

Toda consulta se resuelve en dos fases separadas:
1. **Navegar** sobre cabeceras (URN, tipo, plano, links) — barato, sin cargar cuerpos.
2. **Leer** solo los cuerpos de los nodos que la navegación seleccionó — caro, mínimo.

Nunca se invierte el orden. Leer-para-encontrar está **prohibido** (es no-determinístico y carga de más).

## 2. Punto de entrada único

Toda navegación inicia en `nexus:entry:claude-md`, que carga **solo dos cosas**:
- la **Constitución** mínima (`nexus:identidad:core`) — siempre, es diminuta;
- el **Índice** — el mapa de `{urn → tipo, plano, estrato, links-salientes, ubicación}`.

El punto de entrada **nunca contiene conocimiento**; rutea hacia él. Desde el Índice se traversa.

## 3. Resolución de una URN (determinística)

Una URN es **identidad**, no ruta. Se resuelve así, en orden:
1. Buscar la URN exacta en el **Índice** → obtiene su ubicación física actual. (La ubicación puede cambiar; la URN no — por eso se resuelve por Índice, nunca adivinando nombre de archivo.)
2. Si no está en el Índice → es un **nodo futuro** (referencia válida a algo aún no materializado), no un error. Se reporta como "pendiente", no se inventa contenido.
3. Nunca se resuelve una URN por búsqueda de texto ni por similitud de nombre.

## 4. Localizar una Unidad de Memoria (tres caminos, en prioridad)

1. **Por URN** (identidad exacta) — preferido y determinístico.
2. **Por faceta** (`plano + estrato + tipo`) sobre el Índice — para "todos los ADR del módulo billing".
3. **Por traversal** desde un nodo conocido siguiendo relaciones — para consultas relacionales.

**Prohibido:** localizar por búsqueda de texto libre en cuerpos (no determinístico, carga de más).

## 5. Selección del punto de entrada por tipo de consulta (mapa determinístico)

| Intención de la consulta | Nodo de entrada | 
|--------------------------|-----------------|
| "¿qué somos / qué nunca hacemos / qué priorizamos?" | `nexus:identidad:core` |
| "¿qué significa el concepto X?" | `nexus:metodo:ontologia` |
| "¿cómo funciona la memoria / cómo navego?" | `nexus:metodo:memory-os` / este nodo |
| "¿por qué se decidió X?" | el sujeto → `gobernado-por`/`justificado-por` → DecisionRecord |
| "¿cómo opera el producto / capacidad X?" | la **Capability** (Territorio) → `realizada-por` → Module |
| "¿qué hemos aprendido sobre X?" | el **Pattern**/Lesson vía `aplica`/`evidencia` |
| "¿cómo ejecuto la operación X?" | el **Playbook** correspondiente |
| "¿cuál es el mejor patrón para un cliente como Y?" | **N-LABS** / faceta Pattern por confianza (Recommendation) |

## 6. Qué relaciones seguir por arquetipo de consulta (plantillas de traversal)

Cada arquetipo tiene un **camino de aristas fijo** — esto es lo que hace la navegación determinística:

- **Justificación ("por qué"):** `sujeto →gobernado-por/justificado-por→ DecisionRecord →deriva-de→ Research/Audit`.
- **Aprendizaje ("qué sabemos"):** `sujeto ←aplica/evidencia← Pattern ←refina← Lesson ←produce← Outcome`.
- **Operación ("cómo funciona"):** `Capability →realizada-por→ Module →pertenece-a→ Mechanism`.
- **Impacto ("qué rompo si cambio X"):** traversal **inverso** de `depende-de`/`restringe`/`justifica` → radio de impacto (blast radius).
- **Histórico ("qué creíamos antes"):** seguir `supersede` hacia atrás + filtrar por `valid_time`/`decision_time` (bitemporal).
- **Aprendizaje inter-cliente:** `Customer Graph →(anonimiza)→ Pattern candidato →evidencia← Outcome×N` (ver `nexus:metodo:cognicion`).

## 7. Minimización de contexto (reglas de poda)

- **Por defecto se carga solo** CORE + Índice. Nada más.
- **Bajo demanda**: únicamente los nodos en el camino del arquetipo (§6), en orden de relación.
- **Header-first**: si la cabecera responde, NO se carga el cuerpo.
- **Canónico-primero**: no cargar `superseded`/`archived` salvo consulta histórica explícita.
- **Profundidad acotada**: detener el traversal cuando la consulta queda respondida, o cuando la relevancia/confianza cae bajo umbral.
- **Vista-acotada**: cargar solo dentro de la Vista del consumidor (§9).

## 8. Cómo evitar leer documentos innecesarios (reglas "no cargar")

- NO cargar un **plano** que la consulta no necesita (una consulta de "cómo ejecuto" nunca abre Investigación del Mapa).
- NO cargar nodos fuera del **camino** del arquetipo.
- NO cargar **cuerpos** cuando bastan cabeceras.
- NO cargar versiones `superseded` salvo intención histórica.
- NO cargar el grafo entero "por si acaso" — siempre vista + profundidad acotada.

## 9. Navegación entre dominios de conocimiento (wayfinding inter-dominio)

Ruteo canónico entre las grandes regiones y las aristas que las cruzan:

| Desde → Hacia | Arista canónica que se sigue |
|---------------|------------------------------|
| Identidad → cualquier cosa | `gobierna` (la identidad restringe; se consulta primero) |
| Ontología → todo | `define`/`especifica` (resuelve el significado de un término) |
| Producto (Territorio) → Arquitectura (ADR) | `gobernado-por` / `justificado-por` |
| Producto → Patrones | `aplica` |
| Investigación → Patrones | `produce` |
| Patrones → Identidad | `madura-a` (un patrón muy validado puede ascender a Principle, vía ADR) |
| N-LABS → Mapa | `produce` (patrones, lecciones, prompts) |
| Cliente (Tenant) → Patrones | **solo vía** anonimización/abstracción (nunca directo) |

## 10. Preparación para múltiples LLM

Cada modelo o agente navega bajo una **Vista** = `{nodo-de-entrada, planos-permitidos, profundidad-máx, confianza-mínima, alcance-de-rol}`.

- La navegación es **agnóstica del modelo**: es traversal puro sobre el vocabulario controlado. Claude, GPT o agentes futuros ejecutan las **mismas plantillas** (§6).
- Cada modelo lee `provenance` para **ponderar confianza** según quién produjo el nodo.
- La navegación de **escritura** (cómo un LLM agrega conocimiento) está en el Manifiesto §12; aquí solo se cubre la lectura.
- Ningún modelo recibe el grafo entero: la Vista garantiza "exactamente el conocimiento necesario".

## 11. Evolución hacia un Knowledge Graph (sin reorganización)

- **Hoy:** la navegación = traversal manual/agente de los `links` + un Índice materializado.
- **Mañana:** los mismos `links` son aristas; el Índice es una adyacencia *generada*; las plantillas de §6 se vuelven *queries de grafo* (traversals). 
- **No hay reorg** porque la estrategia ya está expresada como navegación nodo→arista. El Índice de hoy es una materialización transitoria de lo que el grafo computará. La especificación de navegación **no cambia** al aparecer el grafo; solo cambia el motor que la ejecuta.

## 12. Resolución de conflictos (múltiples caminos posibles) — escalera de precedencia

Cuando hay más de un camino o más de una respuesta candidata, se aplica **en orden** y se detiene en el primer criterio que desempata:

1. **Identidad manda.** Cualquier camino o respuesta que contradiga `nexus:identidad:core` se descarta.
2. **Canónico > no-canónico.** Un nodo `canonical` vence a `draft`/`proposed`.
3. **Mayor confianza + evidencia.** Entre creencias, gana la de mayor `confidence`/`evidence` (el cálculo lo define `nexus:metodo:gobernanza`).
4. **Más reciente.** Ante empate, mayor `decision_time`; `supersede` siempre manda sobre lo superseded.
5. **Camino más corto.** Ante empate total, el de menos saltos (menos contexto cargado).
6. **Si el conflicto persiste:** NO se elige en silencio. Se registra una **contradicción** y se enruta a reconciliación (`nexus:metodo:gobernanza`). Un conflicto no resuelto es conocimiento, no ruido.

---

*Este documento es el nodo `nexus:metodo:navegacion` y es la estrategia oficial de navegación del
ecosistema. `nexus:entry:claude-md` (CLAUDE.md) consumirá estas reglas; no las redefine. Cambiar la
estrategia de navegación requiere un ADR.*
