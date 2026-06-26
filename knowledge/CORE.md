---
urn: nexus:identidad:core
title: Núcleo Invariante — Identidad del Ecosistema NEXUS
plane: identidad            # Plano 0 de la NCA (Núcleo Invariante, Δ1)
stratum: telos
type: identity
owner: founder (Juan Carlos Pelaez)
lifecycle_state: canonical
confidence: axiom           # identidad, no creencia empírica: NO decae con el tiempo
evidence: NCA aprobada (2026-06-25) + constitución de producto congelada
provenance: founder-approved
valid_time: desde la concepción del proyecto
decision_time: 2026-06-25
links:
  - { rel: gobierna,    target_urn: nexus:metodo:ontologia,             why: "la identidad restringe todo el modelo conceptual",      date: 2026-06-25 }
  - { rel: gobierna,    target_urn: nexus:metodo:cognicion,             why: "puede vetar cualquier delta cognitivo",                 date: 2026-06-25 }
  - { rel: gobierna,    target_urn: nexus:metodo:gobernanza,            why: "los invariantes operan bajo esta identidad",            date: 2026-06-25 }
  - { rel: deriva-de,   target_urn: nexus:metodo:constitucion-producto, why: "consolida North Star + reglas de simplicidad/priorización", date: 2026-06-25 }
---

# Núcleo Invariante — Identidad de NEXUS

> **Plano 0 de la NCA.** Este nodo puede **vetar** cualquier nodo de Territorio, Mapa o Método.
> Si algo contradice este documento, lo que cambia es lo otro — nunca esto — salvo decisión
> arquitectónica explícita (ADR) del founder. No decae. No se negocia por inercia.

## Qué es NEXUS

NEXUS es un **sistema operativo para empresas de servicio que aprende de toda su base instalada.**
Su defensibilidad no está en lo que *hace* (replicable) sino en lo que *sabe y compone* (no replicable).
El producto es la plataforma; el foso es N-LABS.

**NEXUS NO es:** un CRM (eso es una de sus familias de capacidades), ni una colección de features,
ni un proyecto de documentación. El centro de gravedad es la **capacidad operativa** y el
**conocimiento que compone**, no los módulos (que son reemplazables).

## Qué es N-LABS

N-LABS es el **motor de aprendizaje inter-cliente**: convierte la operación de muchos clientes en
**patrones validados con confianza creciente**. Es la razón por la que NEXUS gana.

## La simbiosis (eje permanente)

**NEXUS ↔ N-LABS.** El producto financia al laboratorio; el laboratorio diferencia al producto.
La ventaja es **epistémica, no funcional**: `confianza = f(N clientes)`. Quien tiene más base
instalada acumula más evidencia y nadie lo alcanza clonando features.

## Qué nunca construimos (vetos)

- Frameworks ni abstracciones especulativas que no resuelvan un problema presente concreto.
- Nada que **elimine, degrade, oculte o fragmente** módulos del ecosistema operacional unificado.
- Infraestructura de escala "a 6 meses" antes de cerrar el lazo de dinero.
- Sofisticación que no se traduzca en valor vendible. **Vender > sofisticar.**

## Qué siempre priorizamos

- Lo **más simple** que entregue el valor. **Reusar > crear.** Conectar > construir.
- **Activación primero**; visibilidad antes que features nuevas.
- El **lazo de dinero**: Cliente › Orden de Trabajo › Cotización › Factura › Pago.
- Diseñar **superficies de decisión** (no solo listas de datos).
- Competir contra **Excel/WhatsApp** con simplicidad, no con sofisticación.
- Todo en **español de negocio**.

## Qué nunca se rompe

- La **frontera de abstracción**: el dato del cliente nunca sale; solo el patrón anonimizado se
  vuelve activo de NEXUS.
- **Un concepto existe una sola vez** en el ecosistema; los demás lo referencian, nunca lo copian.
- La **identidad** (este nodo) sólo cambia por ADR del founder.

---

*Este documento es el nodo `nexus:identidad:core`. Su autoridad deriva de la aprobación de la NCA
y de la constitución de producto congelada (ver `links`). Para la mecánica de cómo se produce y
valida el conocimiento, ver `nexus:metodo:gobernanza`; para el modelo conceptual completo,
`nexus:metodo:ontologia`.*
