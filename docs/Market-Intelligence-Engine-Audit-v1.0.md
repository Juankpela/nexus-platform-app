---
urn: nexus:mapa:market-intelligence-engine-audit
title: Market Intelligence Engine — Audit v1.0 (auditoría del método, no del sector)
plane: mapa
stratum: realizacion
type: audit
owner: founder (Juan Carlos Pelaez) · custodia N-LABS
lifecycle_state: draft
confidence: hypothesis            # auditoría de método; sus tesis se validan con más iteraciones
evidence: Iteración 01 (Field Service HVAC/Refrigeración, Bogotá, 2026-06-25) + conocimiento acumulado del proyecto
provenance: founder-directed · Claude (Opus 4.8) auditor
valid_time: desde 2026-06-25
decision_time: 2026-06-25
links:
  - { rel: deriva-de,  target_urn: nexus:nlabs:market-opportunity-intel, why: "audita el método de la skill tras su primera corrida real", date: 2026-06-25 }
  - { rel: aplica,     target_urn: nexus:nlabs:discovery-engine,         why: "operacionaliza el diseño núcleo-universal + playbook-vertical ya consagrado", date: 2026-06-25 }
  - { rel: restringido-por, target_urn: nexus:identidad:core,            why: "la solución depende del problema, nunca del producto; NEXUS jamás por defecto", date: 2026-06-25 }
---

# Market Intelligence Engine — Audit v1.0

> **Qué es este documento.** Una **auditoría del método** del motor de Market Intelligence (Mundo 1 de
> N-LABS), no de un sector. Responde una sola pregunta:
>
> > **¿Qué necesita el motor de Market Intelligence para convertirse en un consultor de inteligencia
> > operacional capaz de analizar *cualquier* industria y recomendar objetivamente la mejor solución
> > para cada empresa?**
>
> **Restricciones (heredadas y respetadas).** No es código, arquitectura ni UI. No modifica Memory OS,
> Ontología, Gobernanza ni Cognitive Layer. **No introduce capacidades, capas ni conceptos nuevos.**
> Cada recomendación es un **refuerzo de un artefacto de método que ya existe** (los `references` de la
> skill) o la **operacionalización de un diseño ya consagrado** (Discovery Engine v1.0: núcleo
> universal + playbooks verticales). Base empírica: **exclusivamente** la Iteración 01.
>
> **Estado:** `draft` — guía oficial propuesta para evolucionar el motor antes de ampliar el pipeline.

---

## 0. Tesis del auditor

> **El motor hoy es un excelente diagnosticador de la *superficie digital* de una empresa, y un
> diagnosticador *por hipótesis* de su *realidad operativa interna*. Volverlo universal NO es agregar
> industrias: es (1) saber de antemano cuánta de la realidad operativa de cada industria es observable
> desde internet, (2) cobrar por evidencia y no por hipótesis, y (3) leer indicadores específicos que
> traduzcan lo observable en la solución correcta — incluida la de no vender nada.**

Todo lo demás de este documento desarrolla esa tesis con la evidencia de la Iteración 01.

---

## 1. Qué demostró —y qué rompió— la Iteración 01 (la base empírica)

La corrida sobre HVAC/Refrigeración en Bogotá (13 empresas) es el único dato real que tenemos. Esto es
lo que enseñó, separado en lo que funcionó y lo que falló:

### Lo que funcionó (conservar intacto)
1. **La disciplina de evidencia** (hecho / inferencia / hipótesis) es la joya de la corona. Permitió,
   por ejemplo, registrar "no hay portal visible" como **hecho** y "coordinan cuadrillas por WhatsApp"
   como **hipótesis** — sin mentir.
2. **La neutralidad es operativa, no retórica.** Carvel salió con score bajo *porque* ya opera Fracttal
   One (FSM maduro). El motor recomendó **no vender** — y eso es un activo de credibilidad.
3. **La honestidad de fuente atrapó errores reales.** Aire Optimus se descartó al verificar que es de
   Cartagena, no Bogotá. Serin se marcó `[NO VERIFICADO]` ante un HTTP 403. Cero datos inventados.
4. **El blueprint convierte score en conversación**: ángulo de entrada anclado en un hecho observable,
   no en un pitch genérico.

### Lo que rompió o quedó corto (el objeto de esta auditoría)
1. **El método nació con ADN retail/SMB.** Los 6 patrones de fricción, la rúbrica de madurez y el
   scoring asumen señales de consumidor: *"todo termina en WhatsApp"*, *"bio enlaza a WhatsApp"*,
   *reseñas de Google*, *seguidores de Instagram*. En un B2B industrial esas señales **no son las
   diagnósticas**. Lo diagnóstico fue otra cosa: presencia/ausencia de **portal de cliente**, mención
   explícita de **tooling** (Fracttal One), **roster de clientes marquesina**, **estructura del canal**
   de contacto, autodescripciones tipo *"informe digital con fotos"*.
2. **El eje "Volumen = nº de reseñas" del scoring falló.** En B2B industrial casi nadie tenía reseñas
   medibles (y no había `places_search` para contarlas). El volumen real se proxó por *clientes
   nombrados + años + multi-sede + multi-segmento* — pero eso **no está en el modelo de scoring actual**.
3. **El cuello de botella operativo era casi todo hipótesis.** Lo *observable* fue la superficie digital
   (web, canales, portal); el *dolor real* (cómo agendan, cómo reportan, si cumplen SLA) **no se ve
   desde internet** en este sector. El motor generó diagnósticos honestos pero **operativamente
   subdeterminados**: muchas hipótesis, poca evidencia *del dolor que importa*.
4. **Límite de herramientas declarado:** sin `places_search`, se perdió el conteo de reseñas/empleados/
   sedes (señales de volumen de primer orden). Se adaptó a WebSearch/WebFetch. Un 403 nos cegó ante una
   empresa de 30 años. **Las fuentes importan tanto como el método.**

> **El hallazgo central nace aquí (§2):** existe una brecha sistemática entre **lo que es observable**
> (superficie digital) y **lo que queremos concluir** (el cuello de botella operativo). Esa brecha es
> grande o pequeña **según la industria** — y ese es el eje que falta en el método.

---

## 2. El descubrimiento central: superficie digital ≠ realidad operativa (Observabilidad)

El motor observa **señales públicas**. Pero el dolor que vende N-LABS es **operativo e interno**. La
distancia entre ambos —cuánto de la operación real "se filtra" a internet— la llamo **Observabilidad**,
y **varía radicalmente por industria**.

```
   SUPERFICIE DIGITAL (siempre observable)        REALIDAD OPERATIVA (a veces observable)
   ────────────────────────────────────          ───────────────────────────────────────
   web / no web · calidad del sitio               cómo agendan y despachan
   canales (WhatsApp, form, portal)               si cumplen SLA / hay reprocesos
   reseñas (volumen, sentimiento)                 cómo facturan y cobran
   redes sociales · catálogo                      cómo gestionan inventario / documentos
   stack visible (booking, CRM, FSM)              dónde se pierde tiempo y dinero
   roster de clientes · vacantes
            │                                                  │
            ▼  ALTA observabilidad                             ▼  BAJA observabilidad
   restaurante, clínica, hotel,                    logística, transporte, construcción,
   e-commerce, retail                              field service industrial, manufactura
   (el dolor SE VE en reseñas/redes)              (el dolor está adentro; internet solo
                                                    muestra la madurez digital, no el cuello)
```

**Consecuencias para el método (todas operacionalizables sin nuevos conceptos):**
- En industrias de **alta observabilidad**, el motor puede **concluir** con evidencia y poca hipótesis →
  diagnóstico remoto válido, ROI rápido, buen fit para automatización/web/CRM ligeros.
- En industrias de **baja observabilidad**, el motor solo puede concluir sobre la **madurez digital**;
  el **cuello operativo requiere validación** (assessment/visita). Forzar una conclusión operativa ahí
  produce *"demasiadas hipótesis y poca evidencia"* — exactamente lo que pasó con HVAC.
- Por eso **la Observabilidad debe ser un filtro previo del método**, no un descubrimiento posterior.

---

## 3. Mapa de idoneidad de industrias (responde: qué industrias, para qué)

Esta es la respuesta consolidada a las seis preguntas de industria del Goal. Calificación derivada de
la Iteración 01 (HVAC = baja observabilidad confirmada) + razonamiento por analogía de señales públicas
**[ESTIMACIÓN: a calibrar con las primeras corridas de cada industria]**.

| Industria | Observabilidad del dolor | Oportunidad comercial Colibri | Velocidad de ROI | ¿Requiere visita? | Ratio hipótesis | Veredicto de método |
|-----------|:---:|:---:|:---:|:---:|:---:|---|
| **Clínica odontológica / médica** | Alta | Alta | Rápida | No | Bajo | **Ideal remoto.** Dolor (agenda/no-show/reseñas) visible; fit agente+web+CRM. |
| **Restaurante / dark kitchen** | Alta | Media | Rápida | No | Bajo | Remoto. Dolor visible; márgenes finos → tickets menores. |
| **Hotel** | Alta | Alta | Media | No | Bajo-Medio | Remoto. Reseñas + reservas + ops; buen fit. |
| **E-commerce** | Muy alta | Alta | Rápida | No | Muy bajo | **Ideal remoto.** Stack casi todo observable (web/checkout/pagos). |
| **Inmobiliaria** | Media-Alta | Alta | Media | No/parcial | Medio | Remoto con validación. Dolor de seguimiento/lead visible en portales. |
| **Despacho jurídico** | Media | Media-Alta | Media | Parcial | Medio-Alto | Mixto. Dolor documental (OCR) inferible; gestión de casos = interna. |
| **Taller automotriz** | Media | Media | Rápida | Parcial | Medio | Mixto. Agenda/reseñas visibles; operación de taller interna. |
| **Field Service / HVAC** | Baja | Alta | Media | **Sí** | **Alto** | **Visita requerida.** Confirmado en Iteración 01: dolor operativo casi todo hipótesis. |
| **Logística** | Baja | Alta | Lenta-Media | **Sí** | **Alto** | Visita. Ruteo/flota/WMS no se ven desde internet. |
| **Transporte** | Baja | Media-Alta | Lenta | **Sí** | **Alto** | Visita. Igual que logística. |
| **Constructora** | Baja | Alta | Lenta | **Sí** | **Muy alto** | Visita. Gestión de obra/proyecto = invisible públicamente. |
| **Manufactura** | Muy baja | Media | Lenta | **Sí** | **Muy alto** | Visita obligatoria. Casi nada del piso de planta es público. |

**Lecturas directas del mapa:**
- **Mejor fit remoto y ROI rápido (priorizar para campañas masivas de Market Intelligence):** clínicas,
  e-commerce, hoteles, restaurantes. El motor concluye con evidencia y poca hipótesis.
- **Mayor valor de contrato pero requieren visita (priorizar para venta consultiva, no para campaña
  remota):** field service, logística, transporte, construcción. Aquí el motor produce un **pre-
  diagnóstico de madurez digital** que **abre la puerta**, pero el diagnóstico operativo se cierra en
  visita/assessment. **No prometer conclusión operativa remota en estas industrias.**
- **El "ratio hipótesis" es la métrica de salud del diagnóstico.** Cuando supera ~50% del cuello
  operativo, el método debe **declarar "se requiere validación"** en vez de inflar conclusiones.

> Esto **no es un concepto nuevo**: es el principio del Discovery Engine v1.0 ("el playbook vertical
> solo añade el *dónde buscar primero* de cada industria") y de la salvaguarda anti-sesgo, aplicados
> como **pre-filtro de idoneidad** antes de gastar llamadas en un sector.

---

## 4. Mapa de evidencia pública (responde: qué fuentes sirven, cuáles sobran, cuáles faltan)

### 4.1 Información pública con verdadero valor predictivo (conservar y priorizar)
Ordenado por valor de decisión observado en la Iteración 01:

| Señal pública | Por qué predice | Para qué industrias |
|---|---|---|
| **Presencia/ausencia de portal/booking/checkout** | Distingue madurez operativa de cara al cliente | Todas |
| **Mención explícita de tooling** (ej. "Fracttal One", "agenda online") | Revela si el dolor **ya está resuelto** → neutralidad | Todas (atrapó a Carvel) |
| **Estructura del canal de contacto** (WhatsApp-only vs. form vs. portal) | Proxy directo de captura de lead y autoservicio | Todas |
| **Roster de clientes nombrados** | Proxy de **volumen B2B** cuando no hay reseñas | B2B (HVAC, logística, etc.) |
| **Reseñas: volumen + sentimiento** | Volumen real + dolor de atención/proceso | Alta observabilidad (clínica, hotel, restaurante) |
| **Autodescripciones de proceso** ("informe digital con fotos", "agendamos por WhatsApp") | La empresa **confiesa** su madurez | Todas |
| **Calidad/actualidad del sitio** (contenido desfasado, Wix repetido, correo @yahoo) | Proxy de inversión digital | Todas |

### 4.2 Lo que buscamos hoy y NO aporta capacidad de decisión (dejar de gastar esfuerzo)
- **Número exacto de seguidores.** No es fiable con estas herramientas y, peor, **no cambia ninguna
  decisión** (no distingue una buena oportunidad de una mala). El protocolo ya lo desaconseja; elevarlo
  a regla: *no perseguir vanity metrics*.
- **"Años en el mercado" como dato suelto.** Sin significado operativo por sí mismo (Airefrin decía "6
  años" estando desde 2012). Útil solo como contexto, nunca como eje de score.
- **Nº exacto de empleados/sedes "para completar la ficha".** Rara vez verificable; si se persigue,
  invita a inventar. Mantener `[NO VERIFICADO]`.

### 4.3 Nuevas fuentes públicas a incorporar (suben evidencia, bajan hipótesis)
Todas son **fuentes**, no capacidades nuevas — alimentan el mismo método:

| Fuente nueva | Qué evidencia aporta | Reduce hipótesis sobre |
|---|---|---|
| **Reseñas de Google Maps** (restaurar el equivalente a `places_search`) | Volumen + sentimiento + ausencia de web como **hecho** | Volumen y dolor de atención |
| **Portales de empleo** (Computrabajo, LinkedIn Jobs) | Vacantes tipo "coordinador de servicio", "agendador", "auxiliar de facturación" = dolor operativo **confesado** | Procesos manuales internos (¡el punto ciego de baja observabilidad!) |
| **Registro mercantil / RUES / Cámara de Comercio** | Tamaño, antigüedad, objeto social **verificables** | Capacidad económica y volumen |
| **SECOP / contratación pública** | Contratos ganados = volumen B2B real | Volumen en B2B/industrial |
| **LinkedIn de la empresa** | Banda de headcount **verificable**; estructura de áreas | Tamaño real (mejor que adivinar empleados) |
| **Detección de stack tecnológico** (huella pública: widgets de booking, CRM, chat) | Qué software ya corren | Madurez digital real, no inferida |
| **Completitud del Google Business Profile** | Quick-win observable | Madurez de presencia |

> **El punto más valioso:** las **vacantes** son la fuente que más reduce la brecha de §2. Una empresa
> de baja observabilidad que publica "buscamos agendador de servicio" o "auxiliar para digitar
> remisiones" está **confesando un proceso manual** — convierte una hipótesis en un hecho observable.

---

## 5. Catálogo de indicadores (responde las 8 preguntas de indicadores)

Cuatro familias. Las tres primeras **detectan el dolor**; la cuarta **traduce el dolor en la solución
correcta**. Todos los indicadores son **observables** (o se marcan como no concluyentes).

### Familia A — Indicadores de **madurez digital** (altamente observable)
Ausente · Básico · Funcional · Maduro, sobre: sitio web, responsive, velocidad, SEO, formulario de
captura, reserva/agenda online, catálogo, pagos online, chat, **portal de cliente**, Google Business,
reseñas, WhatsApp como canal, indicios de automatización, integraciones, **CRM/FSM visible**, ecommerce.
*(La rúbrica de 17 dimensiones ya existe; el refuerzo es priorizar "portal de cliente" y "tooling
visible", que fueron los más diagnósticos en B2B.)*

### Familia B — Indicadores de **cuello de botella comercial** (observable)
- "Todo termina en WhatsApp" / bio o web que solo enlaza a mensajería.
- Comentarios/reseñas pidiendo precio o disponibilidad sin respuesta.
- Sin formulario de captura ni embudo → no capturan leads.
- Sin catálogo/pagos pese a demanda visible.
- Sin presencia/SEO pese a volumen (invisibles en Google).

### Familia C — Indicadores de **problema operacional** (observabilidad variable — la clave de §2)
- **Observables directos:** reseñas de demoras/errores/revisitas; inconsistencia entre sedes; "informe
  manual"; multi-sede sin portal unificado; **vacantes operativas** (la señal estrella nueva, §4.3).
- **Solo inferibles/hipótesis (declarar como tales):** cómo agendan cuadrillas, si cumplen SLA, cómo
  facturan, cómo llevan inventario. En baja observabilidad, **esto NO se concluye remoto** → bandera de
  "validar en visita".

### Familia D — Mapa de indicadores → solución (la neutralidad hecha indicador)
Responde directamente a las 7 preguntas de "indicadores para recomendar X". **La solución la elige el
indicador, no el producto que queremos vender.**

| Recomendar… | Indicadores observables que lo justifican |
|---|---|
| **Página web (simple)** | No hay web, o existe pero está abandonada/desactualizada, **y** hay demanda observable (reseñas, redes, volumen). Sin demanda → no se justifica. |
| **Automatización / Agente IA** | Volumen de tareas repetitivas basadas en reglas (FAQ, cotización, agendamiento) + dependencia de WhatsApp/DM + contenido que requiere juicio (validar fotos, leer documentos). |
| **OCR / automatización documental** | Papeleo visible: PDFs para descargar y enviar por correo, "envíe sus documentos", trámites — despachos jurídicos, seguros, permisos de construcción. |
| **Dashboard / BI** | La empresa decide sin métricas, el dato existe pero está en silos; foco en costos/energía (ej. LCGA y sus auditorías energéticas). |
| **CRM** | Operación con volumen de leads pero "escríbenos al WhatsApp", sin embudo ni captura, varios comerciales sin trazabilidad. |
| **Salesforce** | Escala enterprise + procesos múltiples y complejos + entorno regulado + **ya tienen ecosistema Salesforce** o exigen un estándar maduro de industria + presupuesto. (Comprar antes que construir.) |
| **NEXUS** | Operación de **field service con cuadrillas** + **órdenes de trabajo recurrentes** + **ningún FSM maduro ya adoptado** + el patrón **se repite en la vertical** + el cliente acepta pricing por resultado/ser referencia. (Condición del Discovery Engine §6: última opción, nunca por defecto.) |
| **NO vender nada** | Madurez digital alta **sin** dolor visible (Carvel/Fracttal One); **o** volumen demasiado bajo para pagar la automatización; **o** el problema es de proceso/comportamiento, no de software; **o** evidencia insuficiente → "validar antes de recomendar". |

> Nótese la asimetría deliberada: los indicadores de **NEXUS** son los más exigentes y específicos de
> toda la tabla. Es el mecanismo que impide el sesgo de vender NEXUS — codificado como indicador, no
> como buena intención.

---

## 6. Refinamientos al método (qué endurecer — todo sobre artefactos existentes)

Cada punto **fortalece un `reference` que ya existe**; ninguno crea concepto, capa ni capacidad.

1. **Pre-filtro de Observabilidad (refuerza `research-protocol.md` + `solution-mapping.md`).** Antes de
   gastar llamadas en una industria, clasificarla en el mapa §3. Si es de baja observabilidad, el
   entregable se etiqueta **"pre-diagnóstico de madurez + requiere visita para el cuello operativo"** y
   no promete conclusión operativa remota.
2. **Scoring industria-consciente (refuerza `scoring-model.md`).** El eje "Volumen" no puede ser solo
   "nº de reseñas". Definir **proxies de volumen por tipo de industria**: reseñas (consumo), roster de
   clientes + SECOP + headcount (B2B). Sin esto, todo B2B puntúa artificialmente bajo en el eje maestro.
3. **Regla de presupuesto de hipótesis (refuerza `evidence-protocol.md`).** Si el cuello *operativo* de
   una empresa queda soportado >50% por hipótesis, el diagnóstico se marca **"subdeterminado — validar"**
   y baja la confianza, en vez de presentarse como conclusión. (La Iteración 01 lo habría aplicado a
   casi todo el B2B HVAC.)
4. **Columna de Observabilidad en la taxonomía (refuerza `bottleneck-taxonomy.md`).** Cada cuello de
   botella marca si su señal es "observable directa" o "solo inferible" — para no confundir madurez
   digital (siempre observable) con dolor operativo (a veces no).
5. **Fuentes confesionales primero (refuerza `research-protocol.md`).** Incorporar vacantes + registro
   mercantil + SECOP como fuentes de **evidencia operativa** que reducen la brecha §2 en industrias de
   baja observabilidad.
6. **Indicadores de solución como checklist (refuerza `solution-mapping.md`).** Convertir la tabla §5-D
   en el paso obligatorio: ninguna solución se recomienda sin nombrar el/los indicador(es) observable(s)
   que la disparan — y el árbol de 6 niveles del Discovery Engine sigue mandando el orden.

---

## 7. La respuesta a la pregunta única

**¿Qué necesita el motor para ser un consultor universal que recomienda objetivamente la mejor solución
para cualquier industria?** Cinco cosas, ninguna nueva en concepto:

1. **Saber, por industria, cuánto puede concluir** (Observabilidad, §2–§3). Universal no significa
   "concluir igual en todas"; significa **calibrar la promesa** a lo que la evidencia permite.
2. **Cobrar por evidencia, no por hipótesis** (presupuesto de hipótesis, §6.3). El consultor serio dice
   "esto lo confirmo en visita" en vez de inventar el dolor.
3. **Medir volumen con el proxy correcto de cada industria** (scoring industria-consciente, §6.2). El
   volumen es el multiplicador maestro; medirlo mal invalida toda priorización.
4. **Incorporar las fuentes que convierten hipótesis en hechos** (vacantes, registros, SECOP, §4.3) —
   especialmente para las industrias de baja observabilidad, que son las de mayor contrato.
5. **Recomendar por indicador, no por producto** (mapa §5-D), con NEXUS como la opción más exigente y
   "no vender nada" como recomendación de primera clase.

Con eso, el mismo motor analiza con idéntico rigor un restaurante (alta observabilidad, conclusión
remota, ROI rápido) y una constructora (baja observabilidad, pre-diagnóstico + visita, contrato mayor)
— y en ambos casos termina en el mismo lenguaje del Memory OS:
**Evento → Problema → Hipótesis → Confianza → Impacto → Recomendación → Resultado esperado → Validación
→ Aprendizaje → Patrón**, con la confianza calibrada a lo que la evidencia realmente sostiene.

---

## 8. Coherencia y límites

- **No crea nada nuevo.** Observabilidad, presupuesto de hipótesis, proxies de volumen, fuentes
  confesionales y el mapa de indicadores **refuerzan los `references` existentes** de la skill y
  **operacionalizan el Discovery Engine v1.0** (núcleo universal + playbook vertical + salvaguarda
  anti-sesgo). No toca Memory OS, Ontología, Gobernanza, Cognitive Layer ni CLAUDE.md.
- **No reabre arquitectura.** Es método, no producto.
- **Base empírica honesta:** una sola iteración (HVAC Bogotá). El mapa de industrias §3 es
  **[ESTIMACIÓN]** a calibrar con las primeras corridas de cada industria — no se presenta como verdad
  validada. Su confianza sube con cada iteración (curva de madurez del Cognitive Layer).
- **Guía oficial:** este documento gobierna la evolución del motor de Market Intelligence **antes** de
  ampliar el pipeline. La próxima corrida debería ejecutarse ya con el pre-filtro de Observabilidad y el
  presupuesto de hipótesis activos.

---

*Nodo `nexus:mapa:market-intelligence-engine-audit` (draft). Audita el método del motor de Market
Intelligence tras su primera corrida real y define cómo volverlo universal **fortaleciendo el método
existente**, sin nuevos conceptos. Alcanza `reviewed`/`canonical` tras ratificación del founder. Su
confianza crece con cada iteración que confirme o refute el mapa de idoneidad §3.*
