---
urn: nexus:metodo:memory-os
title: NEXUS Memory OS — Manifiesto (Contrato Operativo del Sistema de Memoria)
plane: metodo
stratum: meta
type: specification
owner: N-LABS (custodio)
lifecycle_state: canonical
confidence: normative        # es un contrato: normativo, no creencia empírica → no decae
evidence: NCA aprobada (2026-06-25); esquema dogfooded por nexus:identidad:core
provenance: founder-approved
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,        why: "el sistema de memoria opera bajo la identidad invariante", date: 2026-06-25 }
  - { rel: implementa,      target_urn: nexus:metodo:ontologia,      why: "materializa los planos/estratos del modelo conceptual en memoria", date: 2026-06-25 }
  - { rel: delega-en,       target_urn: nexus:metodo:gobernanza,     why: "validación epistémica (confianza, procedencia, contradicción) vive allá", date: 2026-06-25 }
  - { rel: gobierna,        target_urn: nexus:entry:claude-md,       why: "define cómo el punto de entrada debe orquestar, sin contener conocimiento", date: 2026-06-25 }
---

# NEXUS Memory OS — Manifiesto

> **Qué es este documento.** El contrato operativo del sistema de memoria de NEXUS. No describe el
> producto, ni NEXUS, ni N-LABS. Describe **cómo funciona la memoria misma**. Pertenece a la
> infraestructura cognitiva, no a la documentación del producto.
>
> **Frontera de responsabilidad (anti-duplicación).** Este Manifiesto gobierna el **sustrato**:
> la mecánica de unidades, nodos, relaciones, identidad, evolución y la validación **estructural**
> de una edición. La capa **epistémica** —confianza, evidencia, procedencia, reconciliación de
> contradicciones y los invariantes cognitivos— vive en `nexus:metodo:gobernanza` y aquí solo se
> referencia. Estructura aquí; epistemología allá.

## 1. Unidad de Memoria

Una **Unidad de Memoria** es el átomo del sistema: un documento que representa **un solo concepto**
y tiene **una sola responsabilidad**. Es autocontenida y evoluciona de forma independiente.

- DEBE representar exactamente un concepto (regla: un concepto existe una sola vez).
- DEBE poder leerse y versionarse sin necesidad de abrir otra unidad.
- NUNCA contiene una copia de un concepto que ya vive en otra unidad; lo **referencia**.

## 2. Nodo

Toda Unidad de Memoria **es un Nodo** del futuro Knowledge Graph. Lo que la convierte en nodo es su
**cabecera canónica** (obligatoria en todo documento del Memory OS):

```
urn:              identidad inmutable           # ver §4
title:            etiqueta humana (puede cambiar)
plane:            identidad | territorio | mapa | metodo
stratum:          telos | estrategia | capacidad | dominio | realizacion | mecanismo | operacion | meta
type:             identity | capability | module | adr | pattern | research | hypothesis |
                  experiment | result | lesson | playbook | audit | specification | glossary | …
owner:            rol/persona responsable de su corrección y evolución
lifecycle_state:  proposed | draft | reviewed | canonical | superseded | archived
confidence:       axiom | normative | <escalar epistémico>   # semántica en nexus:metodo:gobernanza
evidence:         qué sostiene esta unidad
provenance:       quién/qué la produjo (humano o modelo)      # crítico multi-LLM, §13
valid_time:       desde cuándo es cierto en el mundo          # bitemporal (§7)
decision_time:    cuándo lo decidimos
links:            lista de Relaciones tipadas                 # ver §3
```

El **cuerpo** del documento es el contenido del concepto. La cabecera es lo que lo hace consultable
por máquina; el cuerpo es lo que lo hace útil para humanos y LLM.

## 3. Relación

Una **Relación** es un vínculo **dirigido, tipado y de primera clase** entre dos URNs. Vive en el
campo `links` de la unidad origen. No existen enlaces sin tipo: un enlace sin semántica es deuda
conceptual y NO es válido.

```
{ rel: <verbo>, target_urn: <urn destino>, why: <razón>, date: <fecha> }
```

- El **vocabulario de `rel`** (gobierna, justifica, realiza, deriva-de, supersede, contradice,
  evidencia, aplica, …) es propiedad de `nexus:metodo:ontologia`; este Manifiesto no lo duplica,
  solo exige que `rel` provenga de ese vocabulario.
- Una Relación PUEDE apuntar a un URN que **aún no existe**: marca un nodo futuro, no es un error.

## 4. URN — la identidad

Una **URN** (`nexus:‹plano›:‹tipo›:‹slug›`) es la **identidad inmutable** de un nodo.

- La URN **NUNCA cambia**, aunque cambien el `title`, el cuerpo, la ubicación física o el formato.
- Nadie referencia el *contenido* ni el *nombre de archivo* de otra unidad: **referencian su URN**.
- Consecuencia: un documento puede reescribirse, renombrarse o reubicarse **sin romper ninguna
  referencia**. La carpeta es desechable; la URN es permanente.

## 5. Fuente de Verdad

Cada concepto tiene **exactamente una** Unidad de Memoria **canónica** que es su Fuente de Verdad.

- Cualquier otra unidad que necesite ese concepto lo **referencia** por URN (§3), nunca lo copia.
- Un concepto con dos fuentes canónicas es una **violación**: debe reconciliarse (§8) dejando una
  canónica y la otra `superseded` con una arista hacia la canónica.
- `nexus:identidad:core` es la Fuente de Verdad de la identidad; este Manifiesto, la del sustrato.

## 6. Cómo evoluciona el conocimiento

El conocimiento evoluciona por **append + supersede**, nunca por sobrescritura silenciosa.

- Corregir/actualizar un concepto = crear (o re-emitir) la unidad y mover la versión anterior a
  `superseded`, enlazada con `supersede`. La historia queda intacta.
- El `lifecycle_state` avanza: `proposed → draft → reviewed → canonical → superseded → archived`.
- **Bitemporalidad:** `valid_time` (cuándo fue cierto en el mundo) y `decision_time` (cuándo lo
  decidimos) permiten preguntar *"¿qué creíamos en 2027?"* sin perder coherencia.

## 7. Cómo se preserva la historia

- La **URN inmutable** garantiza que las referencias históricas siguen resolviendo.
- `superseded`/`archived` **nunca se borran**: se conservan enlazados a lo que los reemplazó.
- El par bitemporal preserva *qué se creía* y *cuándo*. Nada se pierde; solo cambia de estado.

## 8. Cómo se evita la duplicación

- **Identidad:** dos nodos no pueden compartir URN (unicidad estructural).
- **Antes de crear** una unidad: verificar si el concepto ya existe (si existe, referenciarlo).
- **Antes de crear** una categoría/tipo: verificar que pertenezca a la ontología aprobada.
- **Duplicación semántica** (dos URNs distintas que dicen lo mismo): la detecta y resuelve el
  proceso de **reconciliación** definido en `nexus:metodo:gobernanza`; el resultado deja una
  canónica y supersede la otra.

## 9. Cómo se valida una modificación (validación ESTRUCTURAL — propiedad de este Manifiesto)

Una edición es válida solo si, al cerrarse, se cumple **toda** esta compuerta estructural:

1. La unidad tiene cabecera canónica completa y bien formada (§2).
2. La `urn` es única y no cambió respecto a versiones previas del mismo concepto.
3. Todo `link` usa un `rel` del vocabulario de la ontología y apunta a una URN sintácticamente válida.
4. No hay sobrescritura de historia: cualquier reemplazo dejó al anterior `superseded` y enlazado.
5. La unidad no duplica un concepto ya canónico (§8).
6. La unidad no contradice `nexus:identidad:core`; si lo hiciera, requiere ADR (no se materializa).

> La validación **epistémica** (¿la evidencia justifica esta confianza? ¿hay contradicción de
> creencia con otro nodo?) es responsabilidad de `nexus:metodo:gobernanza`. Aquí termina lo
> estructural; allí empieza lo epistémico.

## 10. Cómo se gobierna el sistema de memoria

- Cada nodo tiene un **owner** responsable de su corrección y evolución.
- Cambios al **esquema de nodo o al vocabulario de relaciones** son decisiones arquitectónicas:
  requieren un **ADR** (no se cambian por conveniencia).
- La **autoridad de planos** se hereda de la NCA: Identidad→founder; Territorio→Product/Arquitecto;
  Mapa/Método→N-LABS. La memoria no inventa autoridad; la refleja.
- `nexus:identidad:core` puede **vetar** cualquier unidad de cualquier plano.

## 11. Cómo se prepara para un futuro Knowledge Graph

El grafo es **emergente, no construido aparte**:

- Cada Unidad → un **nodo** (su cabecera son las propiedades del nodo).
- Cada Relación en `links` → una **arista tipada**.
- Un proceso mecánico (parsear cabeceras + links) genera el Knowledge Graph y el Operational Graph
  del mismo sustrato, **sin reorganizar nada**.
- Por eso el formato físico (carpeta, archivo) es secundario: la verdad es el grafo de URNs.

## 12. Cómo deben trabajar los futuros LLM sobre esta arquitectura

Protocolo obligatorio para cualquier modelo (Claude, GPT, agentes futuros):

**Lectura.**
- Entrar siempre por el punto de entrada (`nexus:entry:claude-md`), que **rutea**, no contiene.
- Navegar por **traversal de relaciones**, no por nombre de archivo ("dame los ADR que `justifican`
  este módulo"), cargando unidades **bajo demanda**.
- Consumir **Vistas** proyectadas por rol/tarea/confianza-mínima; ningún modelo necesita el grafo
  entero.

**Escritura.**
- Toda unidad escrita DEBE pasar la compuerta estructural (§9) y declarar su `provenance`
  (qué modelo/persona la produjo).
- NUNCA sobrescribir historia; usar append + supersede (§6).
- Antes de crear, verificar existencia del concepto y de la categoría (§8).
- Una creencia nueva entra como `proposed`/`draft`; alcanza `canonical` solo tras validación
  (estructural §9 + epistémica vía `nexus:metodo:gobernanza`).
- Ante contradicción con otro nodo: no sobrescribir — registrar la contradicción y enrutar a
  reconciliación.

---

*Este documento es el nodo `nexus:metodo:memory-os` y es la especificación oficial del sistema de
memoria del proyecto. Toda unidad del NEXUS Memory OS —incluido `CLAUDE.md` y este mismo
documento— DEBE cumplir este contrato. Cambiarlo requiere un ADR.*
