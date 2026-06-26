---
urn: nexus:entry:claude-md
title: NEXUS Memory OS — Kernel Loader (punto de entrada único)
plane: metodo
stratum: meta
type: entry
owner: N-LABS (custodio)
lifecycle_state: canonical
confidence: normative
evidence: NCA aprobada; validación Goal 7 (READY WITH OBSERVATIONS); requisitos Grupo B
provenance: founder-approved
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,       why: "arranca cargando y obedeciendo la identidad antes que nada", date: 2026-06-25 }
  - { rel: implementa,      target_urn: nexus:metodo:navegacion,    why: "ejecuta el procedimiento de navegación sobre el Índice", date: 2026-06-25 }
  - { rel: complementa,     target_urn: nexus:metodo:memory-os,     why: "es el punto de entrada que el Manifiesto §2 exige", date: 2026-06-25 }
---

# NEXUS Memory OS — Kernel Loader

> **Qué es este archivo.** El **punto de entrada único** del NEXUS Memory OS y su **Kernel Loader**.
> Su única responsabilidad: **localizar, resolver, cargar y orquestar** el conocimiento mínimo de
> cada tarea.
>
> **Qué NO es.** No es conocimiento, ni guía, ni documentación, ni filosofía. **No contiene reglas
> duplicadas.** Toda regla vive en su nodo canónico; aquí solo se *rutea* hacia él. Si alguien busca
> "qué significa X" o "por qué se decidió Y", el kernel **no responde**: carga el nodo que sí lo hace.

---

## 0. Secuencia de arranque (boot) — determinística

Todo acceso al Memory OS empieza aquí y carga **exactamente dos cosas**, nada más:
1. `nexus:identidad:core` — la constitución (diminuta, siempre).
2. **El Índice** (§1) — el mapa de URNs.

Con eso el kernel puede *navegar*. El conocimiento se carga **después**, solo el que la Vista
seleccione (§3–§5). Ningún otro documento se carga "por si acaso".

---

## 1. Índice oficial (única fuente autorizada para resolver una URN)

Ubicaciones relativas a este archivo (`nexus-platform/knowledge/`).

| URN | tipo | plano | estrato | ubicación | relaciones principales (salientes) |
|-----|------|-------|---------|-----------|-------------------------------------|
| `nexus:identidad:core` | identity | identidad | telos | `CORE.md` | gobierna→ontologia, cognicion, gobernanza |
| `nexus:metodo:memory-os` | specification | metodo | meta | `MEMORY_OS_MANIFEST.md` | implementa→ontologia; delega-en→gobernanza; gobierna→claude-md |
| `nexus:metodo:ontologia` | ontology | metodo | meta | `ONTOLOGY.md` | especifica→memory-os; define→cognicion; delega-en→gobernanza |
| `nexus:metodo:navegacion` | specification | metodo | meta | `KNOWLEDGE_NAVIGATION.md` | extiende→memory-os; usa→ontologia; gobierna→claude-md |
| `nexus:metodo:cognicion` | specification | metodo | meta | `COGNITIVE_LAYER.md` | usa→ontologia; delega-en→gobernanza; extiende→memory-os |
| `nexus:metodo:gobernanza` | specification | metodo | meta | `GOVERNANCE.md` | especifica→cognicion; fundamenta→navegacion; complementa→memory-os |
| `nexus:metodo:adr-backlog` | specification | metodo | meta | `ADR_BACKLOG.md` | afecta→ontologia, memory-os |
| `nexus:entry:claude-md` | entry | metodo | meta | `CLAUDE.md` (este) | implementa→navegacion; complementa→memory-os |
| `nexus:mapa:architecture-validation` | audit | mapa | meta | `ARCHITECTURE_VALIDATION.md` | describe→memory-os, ontologia, navegacion, cognicion, gobernanza |

> El Índice es **la única** fuente autorizada para resolver una URN. Crece por **append**: al
> materializar un nodo nuevo (Territorio, Mapa…), se agrega aquí una fila. Nada se resuelve sin estar
> en el Índice.

---

## 2. Resolución de URNs (procedimiento ejecutable)

```
resolver(urn):
  1. buscar coincidencia EXACTA de `urn` en la columna URN del Índice (§1).
     - la URN se trata como CLAVE OPACA: se compara la cadena completa, no se parsea por segmentos.
       (Robusto ante el ADR pendiente de formato — Grupo A; el kernel no depende de 3 vs 4 segmentos.)
  2. si hay fila → cargar el archivo en `ubicación`. FIN.
  3. si NO hay fila → es un NODO PENDIENTE (referencia válida a algo no materializado, MANIFEST §3):
     reportar "pendiente", NO inventar contenido, NO adivinar archivo.
```
**Prohibido** resolver por nombre de archivo o por búsqueda textual (no determinístico).

---

## 3. Sistema de Vistas (reutilizable por cualquier LLM)

Una **Vista** acota qué se carga para un consumidor y objetivo. Catálogo oficial:

| Vista | consumidor | objetivo | prof. máx | confianza mín | planos permitidos | estrategia de carga |
|-------|-----------|----------|:--:|:--:|-------------------|---------------------|
| `V-CONSTITUTION` | cualquier LLM | "¿qué no debo violar?" | 0 | axiom | identidad | solo CORE |
| `V-VOCABULARY` | cualquier LLM/agente | "¿qué significa X?" | 1 | normative | metodo | ONTOLOGY, header-first |
| `V-CONFLICT` | cualquier LLM | resolver conflicto/autoridad | 1 | normative | identidad, metodo | GOVERNANCE (+CORE) |
| `V-NAVIGATE` | cualquier LLM | "¿cómo recorro el OS?" | 1 | normative | metodo | KNOWLEDGE_NAVIGATION |
| `V-LEARN` | N-LABS/agente | aprendizaje/recomendación | 2 | emerging | mapa, metodo | COGNITIVE_LAYER (+GOVERNANCE umbrales) |
| `V-METHOD-FULL` | arquitecto/onboarding | entender el sistema entero | 2 | normative | identidad, metodo | todo el plano Método, breadth-first |
| `V-PRODUCT` | dev/agente de producto | implementar en NEXUS | 3 | validated | identidad, territorio, mapa | Territorio + patrones aplicables (hoy vacío) |

Las Vistas son **agnósticas del modelo**: Claude, GPT o agentes futuros usan el mismo catálogo.
Una Skill futura **se registra como un consumidor con su propia Vista** (misma estructura de fila),
sin tocar este kernel (§6).

---

## 4. Orquestación (cómo decide el kernel)

```
orquestar(consulta):
  1. CLASIFICAR intención → Vista (tabla de ruteo, implementa NAVIGATION §5–§6):
       "qué no violar / qué priorizamos"        → V-CONSTITUTION
       "qué significa <término>"                  → V-VOCABULARY
       "quién manda / cómo resolver conflicto"    → V-CONFLICT
       "cómo navego / cómo cargo"                 → V-NAVIGATE
       "qué sabemos / qué recomendar / aprender"  → V-LEARN
       "entender el sistema completo"             → V-METHOD-FULL
       "implementar algo en el producto"         → V-PRODUCT
  2. SELECCIONAR los nodos de entrada de esa Vista; resolver sus URNs (§2).
  3. CARGAR según la estrategia de la Vista y la política de contexto (§5).
  4. TRAVERSAR relaciones solo dentro de los planos permitidos y hasta `prof. máx`,
     siguiendo las plantillas de NAVIGATION §6.
  5. DETENER cuando la consulta queda respondida, o se alcanza prof. máx / confianza mín.
  6. PEDIR información adicional cuando: una URN resuelve a PENDIENTE, o la Vista se agota
     sin responder y no hay más aristas válidas.
```
El kernel **nunca** contiene el conocimiento; solo decide **qué** cargar, **en qué orden** y
**cuándo parar**.

---

## 5. Context Loading (mínimo y determinístico)

El kernel **ejecuta** (no redefine) la política de NAVIGATION §7–§8:
- por defecto solo CORE + Índice;
- bajo demanda solo los nodos de la Vista, en orden de relación;
- **header-first** (no cargar cuerpo si la cabecera basta);
- **canónico-first** (no `superseded`/`archived` salvo consulta histórica);
- **profundidad acotada** por la Vista;
- ante empate de caminos, **escalera de GOVERNANCE §12 / NAVIGATION §12**.
Determinístico: misma consulta + mismo Índice → misma carga.

---

## 6. Compatibilidad futura (sin reorganizar la arquitectura)

- **Knowledge Graph:** el Índice (§1) es la lista de nodos; las "relaciones principales" + los `links`
  de cada nodo son las aristas. Un parser genera el grafo; el kernel no cambia.
- **Múltiples LLM / agentes:** consumen el catálogo de Vistas (§3), agnóstico de modelo.
- **Skills:** una Skill se integra **registrando una fila de Vista** (consumidor + objetivo + planos +
  profundidad + confianza). **El Kernel Loader no se modifica** para integrarla.
- **Consultas automatizadas:** `orquestar()` (§4) es una función pura sobre el Índice → invocable por
  procesos no interactivos.

---

## 7. Restricciones permanentes de este archivo

- **Nunca** contiene conocimiento operativo, filosofía ni reglas duplicadas.
- **Nunca** es fuente de verdad de un concepto; siempre **rutea** a su nodo canónico.
- Crece **solo** por: añadir filas al Índice (§1) y filas al catálogo de Vistas (§3).
- Cambiar su lógica de orquestación o el esquema del Índice/Vistas **requiere ADR**.

---

*Este archivo es el nodo `nexus:entry:claude-md` — el único punto de entrada del NEXUS Memory OS.
Su responsabilidad es exclusivamente localizar, resolver, cargar y orquestar. Nada más.*
