# NEXUS — Ontología Operacional (CONGELADA)

> **Naturaleza.** Define **únicamente** los seis conceptos sobre los que se apoya toda la tesis de NEXUS. **NO contiene arquitectura, IA, agentes, modelos ni tecnología** — esos se derivan de aquí, no al revés. Es el **vocabulario común**: si estos seis términos son estables, todo lo demás (modelos, interfaces, métricas, validación, agentes) se deriva sin ambigüedad; si no lo son, el equipo usará las mismas palabras para significar cosas distintas. **Congelada: 2026-06-29.**
>
> **La ley que estos conceptos sirven:** *"Las organizaciones destruyen valor porque descubren demasiado tarde los compromisos que todavía podían cambiar."*

---

## 1. Compromiso
Una **promesa operacional** con tres elementos: **(a)** una condición de cumplimiento observable, **(b)** un plazo o disparador que la activa, **(c)** una consecuencia si no se cumple. Es la **unidad mínima de la operación**: todo lo que una organización "debe lograr" es un compromiso.
*Ejemplos:* completar una reparación antes de la fecha pactada; cobrar una factura antes del vencimiento; entregar un envío antes del ETA; reabastecer un insumo antes del quiebre de stock.
*No es compromiso:* una tarea sin condición ni consecuencia; una métrica; una preferencia; una intención sin plazo.

## 2. Resultado
El **estado final** de un compromiso una vez que ya no puede cambiar: **cumplido** o **incumplido** (con su magnitud). Es lo que el compromiso produce cuando su ventana se cierra. En el límite es binario; puede tener grado (cuánto se incumplió). El resultado es un **hecho observable**, no una opinión — y solo es definitivo después del punto de no retorno.

## 3. Punto de no retorno
El **instante a partir del cual el resultado de un compromiso queda determinado** y **ninguna acción puede ya cambiarlo.** Antes de él, el resultado es maleable; después, está bloqueado. Cada compromiso tiene **exactamente uno**.
**La sutileza más importante (y la causa raíz de que las organizaciones actúen tarde):** el punto de no retorno **NO es el plazo**. Suele ser **anterior**. El plazo de una reparación puede ser el jueves 3pm, pero si requiere 4 horas y un técnico certificado, el punto de no retorno es **el último momento en que aún existe un bloque de 4 horas + el técnico antes del jueves 3pm** — que puede ser el martes. **Confundir el plazo con el punto de no retorno es exactamente cómo se pierde la ventana.**

## 4. Ventana de reversibilidad
El **intervalo entre el momento presente y el punto de no retorno** de un compromiso: el tiempo durante el cual **una acción todavía puede cambiar su resultado.** Se abre cuando el compromiso nace (o cuando aparece la primera evidencia de deriva) y se cierra en el punto de no retorno. Su duración es **finita y variable** por compromiso. Es **el recurso escaso de toda la tesis** — lo que NEXUS administra. Fuera de la ventana, un compromiso ya no es una decisión: es solo **un resultado esperando ocurrir**.

## 5. Acción reversible
Una **intervención que, ejecutada DENTRO de la ventana**, cambia el resultado esperado de un compromiso (de incumplido-probable a cumplido-probable).
*Ejemplos:* reasignar un recurso, expeditar un insumo, renegociar el plazo con el cliente, reordenar prioridades.
**La sutileza:** la reversibilidad es propiedad del **timing**, no de la acción. La misma acción —reasignar un técnico— cambia el resultado **dentro** de la ventana y **no cambia nada fuera** de ella. Una acción no es "reversible" por su naturaleza, sino por **cuándo** se toma.

## 6. Valor económico expuesto
El **valor que se pierde si el compromiso se incumple**: el costo del resultado fallido. Incluye lo **directo** (penalidad contractual, retrabajo, segunda visita, margen perdido) y lo **indirecto/contingente** (cliente perdido y su valor de por vida, daño reputacional, contrato mayor en riesgo). Es la **magnitud de lo que está en juego** dentro de la ventana. **Un compromiso con alto valor expuesto y ventana abierta no atendida es donde más valor se destruye** — y donde priorizar.

---

## Cómo componen la ley (y por qué bastan seis)
El valor se destruye cuando: un **compromiso** con **valor económico expuesto** positivo alcanza su **punto de no retorno** con un **resultado** desfavorable, **sin que se haya tomado una acción reversible dentro de su ventana de reversibilidad** — porque nadie vio la ventana mientras estaba abierta.

Toda la operación de NEXUS se reduce a **una sola frase expresable solo con estos seis términos:**

> **Mantener visible la ventana de reversibilidad, y disponible la acción reversible, mientras la ventana siga abierta — priorizando por valor económico expuesto.**

**Regla de gobierno:** cualquier modelo, interfaz, métrica, agente o decisión futura debe poder definirse con estas seis palabras. Si necesita un séptimo concepto, o usa uno de estos seis con un significado distinto, **no pertenece a NEXUS** (o la ontología está incompleta y se reabre con evidencia, nunca por conveniencia).
