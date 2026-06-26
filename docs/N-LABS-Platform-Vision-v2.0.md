---
urn: nexus:mapa:nlabs-platform-vision
title: N-LABS Platform Vision v2.0 — Posicionamiento Oficial del Ecosistema
plane: mapa
stratum: estrategia
type: specification
owner: founder (Juan Carlos Pelaez)
lifecycle_state: draft            # posicionamiento propuesto; ratificación del founder pendiente
confidence: hypothesis            # es visión, no verdad validada por evidencia de implementación
evidence: descubrimiento durante el diseño funcional del Operational Intelligence Engine (Goal PRODUCT-002)
provenance: founder-directed · Claude (Opus 4.8) redactor
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: deriva-de,       target_urn: nexus:identidad:core,            why: "madura la tesis de CORE: el conocimiento que compone es el centro de gravedad, no los módulos", date: 2026-06-25 }
  - { rel: usa,             target_urn: nexus:metodo:ontologia,          why: "las 4 capacidades son instancias del tipo Capability; no se crea ningún concepto nuevo", date: 2026-06-25 }
  - { rel: realiza,         target_urn: nexus:metodo:cognicion,          why: "ambos mundos normalizan al mismo Bucle de Aprendizaje; el AI Decision Engine es la recomendación-como-consulta §7", date: 2026-06-25 }
  - { rel: aplica,          target_urn: nexus:nlabs:discovery-engine,    why: "Market Intelligence ejecuta el Discovery Engine; su árbol de decisión es el AI Decision Engine", date: 2026-06-25 }
  - { rel: complementa,     target_urn: nexus:mapa:nlabs-operational-intelligence-engine, why: "Operational Intelligence es ese motor, ahora posicionado como uno de los dos mundos", date: 2026-06-25 }
---

# N-LABS Platform Vision v2.0

> **Naturaleza de este documento.** **Posicionamiento de producto.** No es arquitectura, no es
> diseño técnico, no es UI, no es roadmap. Redefine *qué es* el ecosistema usando **exclusivamente**
> la arquitectura ya congelada. No modifica Memory OS, Ontología, Gobernanza, Cognitive Layer ni
> CLAUDE.md. No crea conceptos ontológicos nuevos. No reabre ningún debate de diseño cerrado.
>
> **Estado:** `draft` — propuesto para ratificación del founder.

---

## 0. Tesis en una frase

> **N-LABS es la plataforma de inteligencia operacional. NEXUS es uno de los sistemas que consume esa
> inteligencia — no el único, y nunca la recomendación por defecto.**

---

## 1. Qué es realmente N-LABS

N-LABS es una **plataforma de inteligencia operacional**: descubre dónde una empresa pierde dinero en
sus operaciones, lo cuantifica, recomienda **objetivamente** la mejor solución existente, mide el
resultado y **aprende**. Convierte señales —de cualquier origen— en conocimiento reutilizable con
confianza creciente.

| N-LABS **SÍ** es | N-LABS **NO** es |
|------------------|------------------|
| Una plataforma de inteligencia que diagnostica operaciones y recomienda la mejor solución | Un módulo dentro de NEXUS |
| Un recomendador objetivo (cualquier proveedor, incluido "ninguno") | Un canal para vender NEXUS |
| El activo que acumula conocimiento reutilizable de cada empresa estudiada | Un CRM con IA ni un "módulo inteligente" |
| El motor que produce Patrones validados (el foso de Colibri) | Una consultoría que entrega informes sin número ni decisión |

Esto **no contradice** la identidad: CORE ya afirma que *"el centro de gravedad es la capacidad
operativa y el conocimiento que compone, no los módulos (que son reemplazables)"* y que *"la
defensibilidad no está en lo que hace —replicable— sino en lo que sabe y compone —no replicable—"*.
Vision v2.0 **lleva esa tesis a su conclusión natural**: si el conocimiento es el centro de gravedad,
entonces el producto es la **inteligencia** (N-LABS), y los módulos operativos (NEXUS) son superficies
que la consumen. (Ver §11, Hallazgo, sobre la frase literal de CORE.)

---

## 2. Por qué N-LABS ya no es un módulo de NEXUS

Hasta ahora asumíamos: `NEXUS ⊃ N-LABS` (N-LABS como pieza dentro del producto).

El descubrimiento —surgido al diseñar el Operational Intelligence Engine— **invierte la dependencia**:

```
   ANTES (incorrecto)            AHORA (correcto)
   ─────────────────            ─────────────────
        NEXUS                   N-LABS (plataforma de inteligencia)
          │                          │
       [ N-LABS ]              consume│
                                      ▼
                              NEXUS · y otros sistemas
```

**Por qué importa:** un módulo es reemplazable y vive dentro de un producto. Una plataforma de
inteligencia es **transversal**: su valor no depende de qué software opere abajo. Si mañana un cliente
usa Salesforce en lugar de NEXUS, la inteligencia de N-LABS **sigue aplicando**. El foso (confianza =
f(N clientes), Cognitive Layer §4) pertenece a N-LABS, no a NEXUS. Posicionar N-LABS como plataforma
**protege el foso de la suerte de cualquier módulo**.

---

## 3. La arquitectura de posicionamiento (cuatro capacidades)

Adoptando la recomendación rectora del founder (no acuñar "Solution Intelligence" todavía), el
ecosistema tiene **cuatro capacidades consolidadas** — todas **instancias del tipo `Capability`** que
la Ontología ya define (no son conceptos nuevos):

```
                          N-LABS Platform
                                │
            ┌───────────────────┴───────────────────┐
            │                                        │
   Market Intelligence                     Operational Intelligence
   (empresas que aún NO                    (empresas que YA usan
    son clientes · fuentes                  NEXUS · fuentes internas:
    externas/OSINT)                         audit_events, KPIs…)
            │                                        │
            └───────────────────┬────────────────────┘
                                │
                       Knowledge Intelligence
                  (Memory OS · agnóstico del origen ·
                   Evento→Problema→…→Patrón)
                                │
                         AI Decision Engine
                  (recomienda objetivamente la mejor
                   solución · NEXUS nunca por defecto ·
                   absorbe la "recomendación de solución")
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
             NEXUS        Salesforce       Otros sistemas
          (un consumidor)  (futuro)         (futuros)
```

- **Market Intelligence** — descubre prospectos y sus cuellos de botella desde el exterior. Su entregable
  es un **Operational Blueprint**, no una venta. *(Ejecuta el Discovery Engine v1.0.)*
- **Operational Intelligence** — observa la operación interna de clientes que ya usan NEXUS y propone
  mejora continua. *(Es el Operational Intelligence Engine, Functional Design v1.0 + IRA + PR0.)*
- **Knowledge Intelligence** — el Memory OS: donde **ambos** mundos depositan conocimiento, **agnóstico
  del origen**. *(No se modifica; se usa correctamente.)*
- **AI Decision Engine** — la recomendación objetiva de la mejor solución. Es la **recomendación-como-
  consulta-sobre-el-grafo** (Cognitive Layer §7) + el **árbol de decisión de 6 niveles** del Discovery
  Engine. **Aquí vive la función de recomendar soluciones** — sin acuñar una capacidad nueva (§7).

> **"Solution Intelligence" NO se introduce como concepto.** Es una función *dentro* del AI Decision
> Engine. Si la evidencia de implementación demuestra que crece hasta tener identidad propia, entonces
> —y solo entonces— se promueve a `Capability` formal mediante un **ADR respaldado por datos**. Así se
> evita reabrir el ciclo de sobrearquitectura que tanto costó cerrar.

---

## 4. Los dos mundos — distintos en origen, idénticos en lenguaje

| | **Mundo 1 · Market Intelligence** | **Mundo 2 · Operational Intelligence** |
|--|-----------------------------------|----------------------------------------|
| **Sobre quién** | Empresas que **aún no** son clientes | Empresas que **ya usan** NEXUS |
| **Fuentes** | Externas: Google Maps/Business/Reviews, Instagram, Facebook, LinkedIn, web, directorios, noticias, OSINT | Internas: `audit_events`, KPIs, CRM, quotes, invoices, payments, inventory, cases, work orders, dispatch, forecasts, assets, usuarios, logs |
| **Disparador** | Prospección | La operación corriendo |
| **Objetivo** | Descubrir cuellos de botella y construir un **Blueprint** | Detectar cuellos, priorizar, medir ROI, **aprender** |
| **Resultado** | Recomendación objetiva de solución (puede ser "ninguna") | Recomendación de mejora con evidencia |
| **Lenguaje común** | **El mismo bucle (§5)** | **El mismo bucle (§5)** |

Dos mundos, dos orígenes de datos — **una sola gramática de conocimiento.**

---

## 5. El lenguaje común (ya existe en el Memory OS)

Sin importar el mundo de origen, **todo** se normaliza al **Bucle de Aprendizaje** que el Cognitive
Layer §2 ya define. No se crea ningún concepto:

```
Evento → Problema → Hipótesis → Nivel de confianza → Impacto →
Recomendación → Resultado esperado → Validación → Aprendizaje → Patrón
```

- Una reseña negativa de Google (Mundo 1) y un `work_order_execution.failed` (Mundo 2) son **ambos** un
  `Event` (Ontología: "el átomo factual del runtime"; cuando dispara aprendizaje, juega el rol de Señal).
- A partir de ahí, **el camino es idéntico**: `Event → Problem → Hypothesis → Experiment → Outcome →
  Lesson → Pattern`. Mismos tipos, mismas aristas, mismos umbrales de confianza (Governance §5).

> El que ambos mundos hablen el mismo idioma es lo que permite que el conocimiento **componga**: un
> patrón aprendido en diagnóstico externo puede validarse en operación interna, y viceversa
> (intra-vertical, per CORE/DD).

---

## 6. Knowledge Intelligence — el Memory OS no sabe de dónde vino el problema

Regla de posicionamiento (ya garantizada por la arquitectura, no requiere cambios):

> **El Memory OS nunca privilegia el origen de una señal.** Para el grafo de conocimiento solo existen
> **nodos** (`Problem`, `Hypothesis`, `Outcome`, `Pattern`…) y **aristas tipadas**. No le importa si el
> problema nació en Instagram, en Google Maps, en una Orden de Trabajo, en una Factura o en un KPI.

Esto **ya es así** por diseño: el `Event` es agnóstico del origen; el `provenance` registra quién/qué
produjo un nodo (para ponderar confianza, Cognitive Layer §6), pero el **tipo** Problema no cambia según
la fuente. Market y Operational Intelligence son **dos productores** que alimentan **un solo grafo**.
Por eso el conocimiento de Colibri crece con cada empresa estudiada —cliente o no— sin fragmentarse.

**Frontera infranqueable (CORE):** el dato del cliente nunca cruza; solo el **patrón anonimizado** se
vuelve activo. Un `Tenant` jamás enlaza directo a un `Pattern`. Vale igual para fuentes externas: lo
que entra al grafo es el patrón abstracto, no PII.

---

## 7. AI Decision Engine — el recomendador objetivo (y por qué evita el sesgo)

Cuando N-LABS detecta un problema, **no** recomienda NEXUS por reflejo. Actúa como **consultor
independiente**: evalúa objetivamente qué solución genera mayor impacto. El espacio de soluciones es
abierto: cambio de proceso · integración · RPA/automatización · agente IA · OCR · dashboard/Power BI ·
portal de clientes · WhatsApp · web · CRM · Salesforce · sistema a medida · **NEXUS** · **ninguna
tecnología**.

Mecánica (reutilizada, sin inventar nada):
- **Recomendar = consulta sobre el grafo** (Cognitive Layer §7): el Patrón de mayor confianza efectiva,
  con mejor Outcome/ROI, que respeta la Identidad y aplica a la capacidad objetivo.
- **Encajado en el árbol de 6 niveles del Discovery Engine** (se detiene en el primero que aplica;
  NEXUS es el sexto y condicionado).
- **Salvaguarda anti-sesgo auditable:** el motor registra *por qué descartó cada clase de solución*
  antes de llegar a NEXUS. Si NEXUS aparece sin que el árbol lo justifique paso a paso, la recomendación
  **se invalida**. La neutralidad no es una intención: es un registro.

> **Por qué esto fortalece a Colibri:** un recomendador que a veces dice *"esto se arregla con un
> cambio de proceso, no compres nada"* gana una credibilidad que ningún vendedor de plataforma tiene.
> Esa confianza es la que abre la puerta a la implementación cuando **sí** corresponde software —
> incluido NEXUS. **La neutralidad es el mecanismo de venta, no su enemigo.**

---

## 8. Cómo NEXUS consume la inteligencia — y cómo otros sistemas también podrán

NEXUS es **un consumidor** de la inteligencia de N-LABS:
- recibe recomendaciones de mejora sobre la operación que aloja (Mundo 2);
- expone superficies de decisión derivadas de Patrones del grafo;
- aporta `audit_events`/KPIs como Señales que alimentan de vuelta el grafo (el bucle se cierra).

Pero **la inteligencia no está acoplada a NEXUS**. Por construcción puede servir a **otros consumidores**:
- una empresa que opere en **Salesforce/Field Service** (la vertical del Blueprint) puede recibir
  diagnóstico y recomendaciones de N-LABS sin usar NEXUS;
- un **Blueprint** entregado a un prospecto (Mundo 1) es inteligencia consumida fuera de cualquier
  software propio;
- consumidores futuros (un dashboard, un portal, un agente) consumen el mismo conocimiento.

> Posicionar la inteligencia como **portátil** es lo que la vuelve plataforma. NEXUS gana porque es el
> consumidor mejor integrado — no porque sea el único permitido.

---

## 9. Experiencias por audiencia (posicionamiento, no UI)

La misma plataforma se presenta distinta según quién entra:

| **Si el usuario es Colibri** (prospección) | **Si el usuario ya es cliente de NEXUS** (operación) |
|--------------------------------------------|------------------------------------------------------|
| Market Intelligence · Prospect Discovery · Campaign Builder · Operational Blueprint · Lead Qualification · Industry Intelligence · Opportunity Ranking · Commercial Intelligence | Executive Brief · Operational Intelligence · Customer Intelligence · Process Intelligence · Knowledge Center · Continuous Improvement (+ recomendación de solución vía AI Decision Engine) |

*(Estas son agrupaciones de posicionamiento bajo las cuatro capacidades, no pantallas ni componentes.)*

---

## 10. Posicionamiento comercial — qué cambia para Colibri

- **De desarrollador de software → a empresa de inteligencia operacional y transformación digital.**
  Colibri no vende "un CRM": vende **diagnóstico honesto + la mejor solución para cada problema**, y
  opera el resultado cuando corresponde.
- **Evita el sesgo de vender siempre NEXUS.** El AI Decision Engine recomienda lo que más impacto
  genera; NEXUS aparece solo cuando el árbol lo justifica. Eso es exactamente lo que la Due Diligence
  pidió (recomendador honesto; NEXUS de scope estrecho) y lo que el Discovery Engine ya consagró.
- **Protege el foso.** El activo defensible (corpus de patrones validados + acceso del fundador, DD) es
  de N-LABS, transversal a cualquier software. Aunque un cliente no use NEXUS, el conocimiento crece.
- **Amplía el mercado sin diluir el foco.** N-LABS puede diagnosticar a cualquiera (Mundo 1) mientras
  NEXUS permanece estrecho. La amplitud vive en la *inteligencia*, no en el *software*.

---

## 11. Coherencia y disciplina (lo que este documento respeta y un hallazgo)

**Respeta todas las restricciones.** No modifica Memory OS, Ontología, Gobernanza, Cognitive Layer ni
CLAUDE.md. **No crea capas arquitectónicas** ni **conceptos ontológicos nuevos**: las cuatro capacidades
son *instancias* del tipo `Capability` ya existente; el bucle es el Cognitive Layer §2; la recomendación
es §7; el método externo es el Discovery Engine v1.0.

**No reabre diseño congelado — lo envuelve.**
- **Operational Intelligence (Mundo 2)** = el *Operational Intelligence Engine, Functional Design v1.0*
  + *IRA v1.0* + *PR0*. Quedan **válidos e intactos**; este documento solo los posiciona como uno de
  los dos mundos.
- **Market Intelligence (Mundo 1)** = el *Discovery Engine v1.0* aplicado a prospectos de fuentes
  externas. Su árbol de decisión **es** el AI Decision Engine.

**Guardarraíl anti-amplitud (DD + Discovery Engine).** "Plataforma de inteligencia" **no** es
"plataforma horizontal de software" (lo que la DD mató en NEXUS). El método es **genérico en diseño**,
pero el **despliegue comercial sigue siendo vertical y secuencial** (Field Service / Gas primero; no se
abre una segunda vertical hasta probar la primera). La amplitud es de la *inteligencia*, no del
*go-to-market*. NEXUS permanece de scope estrecho.

**Hallazgo (identidad-adyacente, no bloqueante).** CORE dice literalmente *"el producto es la
plataforma; el foso es N-LABS"* (donde "la plataforma" se leía como NEXUS). Vision v2.0 **eleva el foso
(N-LABS) a producto**. Sostengo que es la **maduración** de la tesis de CORE (el conocimiento es el
centro de gravedad), no su contradicción; lo único que queda desactualizado es la *redacción de
superficie*. **Resolución:** como solo el founder puede tocar la Identidad (Governance §1), **recomiendo
—sin ejecutar— un ADR de identidad del founder** que ratifique/clarifique esa frase de CORE si se desea
que el texto coincida con este posicionamiento. **No modifico CORE.** No bloquea: la visión opera dentro
de la identidad vigente.

**"Solution Intelligence" diferido.** No se acuña como `Capability` ahora (sin evidencia de
implementación). Vive dentro del AI Decision Engine; su promoción futura, si la evidencia lo justifica,
es un **ADR respaldado por datos** (Governance §5/§8).

---

## 12. Qué NO hace este documento (límites explícitos)

- No es código, arquitectura, migración ni UI.
- No modifica Memory OS, Ontología, Gobernanza, Cognitive Layer ni CLAUDE.md.
- No crea conceptos ontológicos ni capacidades formales nuevas (las nombra como posicionamiento;
  su materialización canónica es append-only y posterior, si se decide).
- No hace de NEXUS la recomendación por defecto.
- No reabre el diseño funcional, el IRA ni el PR0 (siguen vigentes).
- No abre una segunda vertical comercial antes de probar la primera.
- No promueve "Solution Intelligence" a Capability (queda diferida a un ADR con evidencia).

---

*Nodo `nexus:mapa:nlabs-platform-vision` (draft). Posicionamiento oficial del ecosistema: N-LABS es la
plataforma de inteligencia operacional; NEXUS es uno de sus consumidores. Usa exclusivamente la
arquitectura congelada. Su autoridad es de propuesta: alcanza `reviewed`/`canonical` tras ratificación
del founder. Cambiarlo = nueva versión por append+supersede.*
