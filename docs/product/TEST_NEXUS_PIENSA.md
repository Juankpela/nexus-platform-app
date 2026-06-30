# Test — "NEXUS ya piensa" (sobre huella-global)

> **Objetivo.** Demostrar que NEXUS, aplicando **únicamente la `ONTOLOGY.md`** a datos operacionales con forma real, identifica un **compromiso** cuya **ventana de reversibilidad** sigue abierta, con **valor económico expuesto** material, en trayectoria a un **resultado** desfavorable, **antes de su punto de no retorno** — y lo presenta como una **decisión**, no una alerta. Es decir: que NEXUS **razona en la ontología**, no ejecuta reglas cableadas. Fecha: 2026-06-29.

## Qué demuestra y qué NO (honestidad — no confundir mecanismo con mercado)
- **DEMUESTRA:** que la ontología es coherente, implementable y produce una salida convincente sobre datos con forma operacional real → **"NEXUS piensa"**. Es el momento mágico, ahora anclado en los seis conceptos.
- **NO demuestra la LEY.** huella-global es un tenant **semilla que nosotros autoramos**; no se puede aprender la verdad de mercado de datos inventados. **Validar la ley (que los operadores reales destruyen valor así y pagarían por evitarlo) exige la historia real de un operador → el backtest de reversibilidad.** Este test prueba el **instrumento**; el backtest prueba el **mercado**. No confundirlos.

## El sustrato ya existe en huella-global (verificado contra el esquema)
| Concepto de la ontología | Dato real disponible |
|---|---|
| **Compromiso** | `work_orders` con `sla_due_at` (condición + plazo + consecuencia) |
| **Recurso / binding** | `technicians` + `work_order_assignments` |
| **Resultado** | `work_order_executions.status` (completed / unable_to_complete) + causa (`non_completion_reason`, p.ej. `customer_absent`) |
| **Trayectoria** | estado de la WO vs `sla_due_at` (la lógica de timing ya existe: `classifyWorkOrderTiming`) |
| **Valor económico expuesto** | **único faltante** — la WO no porta un $ directo; se deriva del `quote` vinculado (`quote_id`) o se enriquece con un valor por compromiso/cliente |

## Escenario a sembrar (la decorrelación saliencia↔valor, hecha explícita)
Para que el test demuestre el **valor** —no solo la mecánica— el semilla debe contener una decorrelación realista, ambos con ventana **aún abierta**:
- **Compromiso A — ruidoso, bajo valor.** WO de un cliente que llama seguido, plazo inminente, bajo valor expuesto. Es la que el humano atiende (**saliencia**).
- **Compromiso B — silencioso, alto valor.** WO de un cliente grande, sin ruido, cuyo **punto de no retorno se acerca en silencio** (el único técnico certificado está sobrecargado), **alto valor expuesto**. Es la que el humano **no mira**.

## La salida que prueba que "NEXUS piensa" (decisión, no alerta)
Aplicando solo la ontología, NEXUS debe producir:
> *"**Compromiso B** (WO #…, cliente [grande], **valor expuesto $Z**): su **ventana de reversibilidad** se cierra en [tiempo] — su **punto de no retorno** es el [martes], **antes** de su plazo [jueves]. En trayectoria actual → **resultado: incumplido**. **Acción reversible disponible ahora:** reasignar/expeditar. Mientras tanto, tu atención está en el Compromiso A (valor expuesto $z ≪ $Z)."*

## Criterios de éxito (qué prueba el pensamiento)
1. **Distingue la ventana:** separa compromisos **dentro** de su ventana (accionables) de los que ya pasaron su **punto de no retorno** (perdidos — no molestar) y de los **sanos** (sin ventana abierta).
2. **Prioriza por valor económico expuesto × cierre de ventana**, NO por saliencia/recencia.
3. **Surfacea un "save" no-obvio:** el silencioso de alto valor (B), que la mirada humana saliente perdería.
4. **La salida es una DECISIÓN** ("actúa sobre B ahora, no sobre A"), no un tablero.
5. **Calcula el punto de no retorno como ANTERIOR al plazo** (plazo − duración del trabajo − holgura del recurso), no = al plazo. *(Este es el criterio más difícil y el que más prueba que "piensa" en vez de "alertar".)*

## Cómo correrlo (mínimo, sin construir el Motor)
1. **Enriquecer el semilla** de huella-global: un valor por compromiso + el escenario A/B (script pequeño, análogo a `seed-sla-demo.mjs`).
2. **Aplicar la ontología** sobre los datos: reusar la lógica de timing existente; añadir solo (a) `punto_de_no_retorno = sla_due_at − laborHours − holgura_de_recurso`, y (b) ranking por valor expuesto.
3. **Producir la salida-decisión** (texto, formato WhatsApp del momento mágico).
4. **Verificar los 5 criterios.**

## El puente al backtest real
Este test **congela el instrumento** (la ontología) y demuestra el **pensamiento** sobre datos con forma real. **El mismo instrumento, el mismo código, los mismos seis conceptos, aplicados a 90 días de la historia de un operador REAL = el backtest de reversibilidad que decide la empresa.** La única diferencia es datos reales en vez de semilla — y eso es lo único que no está en esta silla.
