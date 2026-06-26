---
urn: nexus:metodo:cognicion
title: NEXUS Cognitive Layer — la dinámica del aprendizaje (cómo NEXUS piensa)
plane: metodo
stratum: meta
type: specification
owner: N-LABS (custodio)
lifecycle_state: canonical
confidence: normative
evidence: NCA aprobada (2026-06-25) + revisión cognitiva (6 deltas)
provenance: founder-approved
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: restringido-por, target_urn: nexus:identidad:core,    why: "el aprendizaje nunca contradice ni elude la identidad", date: 2026-06-25 }
  - { rel: usa,             target_urn: nexus:metodo:ontologia,  why: "los tipos del bucle se definen en el Canon; aquí su dinámica", date: 2026-06-25 }
  - { rel: delega-en,       target_urn: nexus:metodo:gobernanza, why: "las reglas que enforcen este modelo (gate, reconciliación, invariantes) viven allá", date: 2026-06-25 }
  - { rel: extiende,        target_urn: nexus:metodo:memory-os,  why: "añade la dimensión epistémica (creencia/evidencia/tiempo) al sustrato", date: 2026-06-25 }
---

# NEXUS Cognitive Layer

> **Qué es este documento.** El **modelo descriptivo** de cómo el ecosistema *piensa, aprende y
> confía*. Convierte el sustrato de memoria (estático) en una arquitectura cognitiva (dinámica).
>
> **Frontera (anti-duplicación).** Los **tipos** (Problem, Hypothesis, Experiment, Outcome, Pattern…)
> se definen en `nexus:metodo:ontologia`; aquí va su **dinámica**. Las **reglas que enforcen** este
> modelo (compuerta de validación, reconciliación, invariantes) viven en `nexus:metodo:gobernanza`.
> Este nodo **describe** la cognición; gobernanza la **prescribe**.
>
> **Tesis.** Una memoria almacena lo que se sabe. Una cognición modela **cómo se llega a saberlo,
> cómo cambia de opinión y cuánto confía**. Eso requiere cuatro cosas que el sustrato no tiene por sí
> solo: **creencia, evidencia, tiempo y retroalimentación.** Este documento las añade.

---

## 1. Núcleo Invariante (Δ1) — referencia, no se redefine

La Identidad (`nexus:identidad:core`) envuelve y puede **vetar** cualquier producto del aprendizaje.
Ningún patrón, lección o recomendación, por mucha evidencia que tenga, sobrevive si contradice la
identidad. El aprendizaje opera **dentro** del Núcleo Invariante, nunca por encima.

## 2. El Bucle de Aprendizaje (Δ2) — la columna vertebral del pensar

NEXUS piensa recorriendo una **cadena causal** donde cada paso transforma conocimiento y **transfiere
confianza** al siguiente:

```
Señal/Evento → Problema → Hipótesis → Experimento → Outcome(medido)
            → Lección → Patrón → Playbook → Automatización → Capacidad/Producto
            → (opera en runtime) → genera nuevas Señales → …
```

- Cada flecha es una **arista causal tipada** (vocabulario del Canon: `deriva-de`, `responde-a`,
  `prueba`, `produce`, `confirma`/`refuta`, `evidencia`, `refina`, `aplica`).
- El bucle **se cierra**: el producto operando genera Señales nuevas → el sistema nunca deja de
  aprender. Un sistema cuyo bucle no cierra solo acumula; este *aprende*.
- **Regla de tránsito:** una creencia no salta pasos. Una Hipótesis no se vuelve Patrón sin pasar por
  Experimento→Outcome→Lección. Saltar pasos = conocimiento sin evidencia = prohibido.

## 3. Estatus Epistémico y Curva de Madurez (Δ3) — cuánto confiar

Todo nodo del Mapa porta estatus epistémico (campos del esquema: `confidence`, `evidence`,
`provenance`). La **confianza no es binaria**: avanza por una curva de madurez.

```
Hipótesis (0 evidencia)
  → Observación (1 caso)
    → Patrón emergente (2–3 casos)
      → Patrón validado (n casos, multi-cliente)
        → Principle candidato (asciende a Identidad vía ADR)
          → Axioma (identidad, no decae)
```

- **La confianza SUBE** con cada Outcome que la `evidencia`; subir de etapa exige más evidencia y
  más diversidad (no 5 casos del mismo cliente, sino casos de clientes distintos).
- **Un Patrón puede DEGRADAR** a AntiPattern si los Outcomes lo refutan.
- El *cómo* exacto se calcula (umbrales, función) se **enforce** en `nexus:metodo:gobernanza`; aquí se
  fija la **forma** del modelo (qué significa madurar).

## 4. Aprendizaje inter-cliente y Customer Graph (Δ4) — el foso

Cada cliente es un **Customer Graph**: un grafo de instancia con sus entidades, procesos,
configuración y outcomes. **No es un nodo; es un grafo.**

**Pipeline de abstracción (el mecanismo que crea ventaja competitiva):**
```
Customer Graphs (muchos, privados)
  → N-LABS observa → ANONIMIZA → abstrae → Patrón candidato
    → valida a través de N clientes → confianza = f(N, diversidad)
      → Patrón validado = activo de NEXUS
```

- **Frontera infranqueable (de CORE):** el **dato** del cliente nunca cruza; solo el **patrón
  abstracto y anonimizado** se vuelve activo del ecosistema. Un `Tenant` nunca enlaza directo a un
  `Pattern` (regla prohibida del Canon).
- **Efecto de red sobre el conocimiento:** cada cliente nuevo *consume* patrones y *aporta*
  evidencia. `confianza = f(N)` → quien tiene más base instalada acumula una ventaja que no se
  clona copiando features. Esto es lo que hace de N-LABS el foso.

## 5. Modelo Temporal y Decaimiento (Δ5) — el conocimiento no es eterno

- **Bitemporalidad** (campos del esquema): `valid_time` = cuándo fue cierto en el mundo;
  `decision_time` = cuándo lo decidimos. Permite preguntar *"¿qué creíamos en 2027?"* sin perder
  coherencia.
- **Decaimiento de confianza:** un Patrón no re-validado por mucho tiempo **pierde** confianza.
  Ningún conocimiento es "verdadero para siempre" por inercia; debe re-evidenciarse o decae.
- **Confianza efectiva** = confianza acumulada por evidencia − decaimiento por tiempo sin validar.
  La función concreta se enforce en `nexus:metodo:gobernanza`.
- La **historia se preserva** (append + supersede del Manifiesto): decaer o superseder nunca borra;
  deja rastro temporal navegable (`supersede`, `valid_time`).

## 6. Cognición multi-LLM (Δ6) — pensar con muchos modelos sin corromperse

- **Provenance:** todo nodo registra qué modelo/persona lo produjo y bajo qué evidencia → permite
  **ponderar confianza** por origen y auditar quién aportó qué.
- **Knowledge Views:** cada modelo/agente piensa sobre una **Vista** (subgrafo por rol/tarea/
  confianza-mínima). Ninguno necesita el grafo entero; cada uno consume exactamente lo necesario.
- **Detección de contradicción:** cuando un nodo nuevo contradice uno existente, **no se sobrescribe**
  — se registra la contradicción como conocimiento y se enruta a **reconciliación**. La *detección*
  se modela aquí; el *proceso de resolución* lo define `nexus:metodo:gobernanza`.

## 7. La función de Recomendación — emergente, no un módulo aparte

Recomendar (automatizaciones, módulos, procesos, prioridades) es una **consulta sobre el grafo**, no
una pieza separada. Se compone de las capas anteriores:

> *"Para un cliente cuyo Customer Graph se parece a Y, ¿cuál es el Patrón de mayor `confidence` cuyo
> `Outcome` tuvo mejor ROI, que respeta la Identidad y aplica a su Capacidad objetivo?"*

- Insumos: similitud de Customer Graph (Δ4) + confianza/madurez (Δ3) + Outcome/ROI medido (Δ2) +
  veto de Identidad (Δ1) + confianza efectiva con decaimiento (Δ5).
- Por construcción, el motor **no modifica el modelo**: solo lo traversa (compatible con el requisito
  de "recomendar sin modificar la ontología").
- Su calidad está acotada por la calidad del **feedback de Outcome**: sin lazo cerrado (§2), recomienda
  por plausibilidad; con lazo cerrado, recomienda por evidencia.

---

## 8. Qué hace cognitiva a esta arquitectura (resumen verificable)

| Capacidad cognitiva | Mecanismo |
|---------------------|-----------|
| **Recordar** | sustrato de memoria (Manifiesto): URN inmutable, append+supersede |
| **Relacionar** | aristas tipadas del Canon |
| **Aprender** | el Bucle de Aprendizaje cerrado (§2) |
| **Confiar** | estatus epistémico + curva de madurez (§3) |
| **Acumular experiencia** | abstracción inter-cliente, confianza=f(N) (§4) |
| **Evolucionar** | bitemporalidad + decaimiento (§5) |
| **Justificar** | cadena `deriva-de`/`justifica` hasta evidencia y decisiones |
| **Recomendar** | consulta emergente sobre el grafo (§7) |
| **Pensar con muchos modelos** | provenance + vistas + reconciliación (§6) |

---

*Este documento es el nodo `nexus:metodo:cognicion` y es el modelo oficial de la dinámica cognitiva
del ecosistema. Define **cómo** NEXUS aprende; las **reglas que lo enforcen** son de
`nexus:metodo:gobernanza`. Cambiar este modelo requiere un ADR.*
