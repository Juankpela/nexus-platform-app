# PROTOCOLO DE VALIDACIÓN DE NEXUS v1.0

> **Naturaleza.** Referencia **metodológica oficial** del proyecto. Define cómo se decide, **con evidencia**, si NEXUS merece ser empresa. No es visión, producto, arquitectura ni marketing. **Todo lo que se construya a partir de ahora debe responder a este protocolo.** Estable: se modifica únicamente con evidencia empírica. Fecha: 2026-06-29.

## Hipótesis falsable (única, tech-independiente)
> **Una operación bajo supervisión continua preserva más valor económico —protegiendo compromisos reversibles antes de su punto de no retorno— que la misma operación sin supervisión, en una magnitud material y atribuible a la supervisión.**

- **Se falsa si:** la operación supervisada no preserva materialmente más valor que un control.
- **NO depende** de IA, agentes ni automatización (la supervisión puede ser humana). Validar la hipótesis NO requiere construir tecnología.
- **Reemplaza** la formulación previa "NEXUS cambia decisiones": *cambiar decisiones* es mecanismo, no propuesta de valor. La propuesta de valor es la **calidad operacional de una operación supervisada**.

## Unidad experimental
- **Veredicto / valor → LA OPERACIÓN (en un período).** Es lo que se vende.
- **Mecanismo → EL COMPROMISO.** Donde se observa detección → acción → resultado.
- **NO son unidades válidas:** la alerta, la recomendación, la decisión (son salidas del mecanismo, no valor). Medir la recomendación = medir detección.

## Regla de oro: retrospectivo vs prospectivo (NO mezclar)
- **Retrospectivo prueba SOLO:** comprensión/detección y el **techo teórico** del premio. Es **estructuralmente ciego** a decisión-cambiada, resultado-diferente y valor-preservado (contrafactuales ausentes en la historia).
- **Prospectivo con control es OBLIGATORIO** para todo lo causal.
- **Prohibido** presentar un "% de valor recuperable" retrospectivo como evidencia de la empresa: es un techo, no un resultado.

## Compuertas (en orden; cada una mata o avanza)

### Gate 0 — SCREEN (retrospectivo, días)
- **Objetivo:** ¿hay materia prima para justificar el experimento prospectivo?
- **Evidencia:** 90 días de historia de un operador, clasificada.
- **Observables:** % del valor perdido que era reversible-y-accionable en un punto de revisión **sin leakage**.
- **Éxito:** ≥ 40%. · **Muerte:** < 20%.
- **Amenazas/sesgos:** leakage temporal; sesgo de registro (fallas no registradas); dependencia de la estimación de valor.
- **Mitigaciones:** evaluar solo con info disponible en el instante; confirmar una muestra de fallas con el operador; análisis de sensibilidad al valor.
- **No prueba la hipótesis** — solo habilita (o mata antes de gastar).

### Gate 1 — MECANISMO (prospectivo, Wizard-of-Oz, sin control, 2–4 semanas)
- **Objetivo:** supervisión continua → acción cambiada sobre los compromisos correctos.
- **Evidencia:** un humano haciendo de NEXUS sobre una operación viva.
- **Observables:** precisión de los flags (confirmada por el operador); tasa de cambio-de-acción (**elicitar qué haría el operador ANTES de revelar la recomendación**); tasa de ejecución + disponibilidad de slack.
- **Éxito:** precisión ≥ 70%; cambio-de-acción ≥ umbral pre-registrado; ejecución ≥ umbral.
- **Muerte:** "ya lo sabía" / ignora la mayoría / no hay slack para actuar.
- **Amenazas/sesgos:** efecto Hawthorne; racionalización post-hoc; calidad del Wizard (≠ NEXUS real).
- **Mitigaciones:** elicitación pre-revelación; cegar un subconjunto de recomendaciones; estandarizar el proceso del Wizard.

### Gate 2 — VEREDICTO CAUSAL (prospectivo, controlado, semanas–meses)
- **Objetivo:** la hipótesis — ¿lo supervisado preserva más valor que el control?
- **Evidencia:** RCT por-compromiso (o stepped-wedge) y comparación a nivel de operación.
- **Observables:** resultado (cumplido/incumplido) y valor preservado, tratamiento vs control.
- **Éxito:** delta material, **robusto a la estimación de valor**, replicado en **≥ 3 operaciones**.
- **Muerte:** sin diferencia → matar la empresa; diferencia inmaterial → herramienta; solo en una operación → sin validez externa.
- **Amenazas/sesgos:** confounds (tiempo, aprendizaje del operador); N pequeño; contaminación del control; ética de dejar fallar.
- **Mitigaciones:** control aleatorizado o stepped-wedge; N pre-registrado; varias operaciones; análisis de sensibilidad.

## Métricas (y su razón)
| Métrica | Qué mide | Por qué existe |
|---|---|---|
| Comprensión operacional | % de clasificaciones (ventana/valor/riesgo) que coinciden con la realidad | sin ella, todo lo demás es ruido |
| Calidad de decisión | resultado de compromisos accionados-tras-flag vs control | es el valor, no la detección |
| Coordinación | reducción de acciones duplicadas/en conflicto; mejor asignación entre compromisos | el valor de una sola mirada supervisora |
| Tiempo (lead time) | cuánto antes del punto de no retorno se actúa, vs sin supervisión | operacionaliza "antes del punto de no retorno" |
| Confianza | % de recomendaciones accionadas; tolerancia a falsos positivos | sin confianza no hay acción; es frágil |
| Impacto económico | valor preservado neto de costo | el veredicto: ¿mueve dinero? |
| Adopción | % accionado + retención del operador | un sistema correcto pero ignorado vale cero |
| Aprendizaje organizacional | ¿surgen menos compromisos en riesgo con el tiempo? | distingue compounding real de firefighting |

## Experimento mínimo decisivo (humano, sin IA)
**RCT dentro de una operación, 2–4 semanas, un operador real.** Un humano hace de NEXUS: supervisa continuamente todos los compromisos, identifica los reversibles-en-riesgo con valor, y surfacea recomendaciones sobre una **mitad aleatoria** de los compromisos elegibles; la otra mitad es **control**. Se mide cambio-de-acción (elicitado pre-revelación), resultado supervisado vs control, y valor preservado.

## Regla de muerte del proyecto
**Si el experimento mínimo no muestra valor material atribuible a la supervisión, NEXUS muere antes de construir tecnología.** Si una persona supervisando no crea valor, ningún agente de IA lo hará: la IA es mecanismo, no la hipótesis.
