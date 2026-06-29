# Slice 01 — Criterio de Aceptación

> **Pregunta única.** ¿Qué evidencia **objetiva** debe observar **un tercero** para afirmar que el Motor Cognitivo acaba de demostrar su **primer comportamiento operacional**? Este documento es el criterio de aceptación del Slice 01. Estado: **PROPUESTO — pendiente de aprobación.** Fecha: 2026-06-29.

## La afirmación que la evidencia debe sostener
> *"El sistema observó una operación real y, con la evidencia disponible en el presente, **objetivó una brecha** —un riesgo de incumplir una norma vigente— **antes de que el incumplimiento ocurriera**, sin predecir, sin diagnosticar causa y sin decidir."*

## Evidencia objetiva que el tercero debe poder observar (sin leer el código)
Mirando **solo los datos**, un tercero debe poder verificar, sobre una Work Order real de un tenant real:

1. **Operación real.** La WO existe, es identificable, tiene `slaDueAt` y estado abiertos. No es un dato sintético fabricado para la demo.
2. **El sistema produjo un registro de brecha** asociado a esa WO, recuperable por una consulta estable (`eventType = "motor.brecha.detected"`).
3. **Fue anticipatoria.** El instante de creación de la brecha es **anterior** a `slaDueAt` (`creado_en < plazo`): el incumplimiento **no había ocurrido** cuando nació.
4. **Es bilateral.** El registro nombra **ambos lados**: lo observado (la WO y su estado en ese instante) y la norma (el `slaDueAt` contra el que se mide).
5. **Es solo evidencia presente.** No contiene predicción, curva, causa, diagnóstico, recomendación ni decisión. Solo el gap objetivado, con su procedencia y su sello (instante + confianza).
6. **Es objetiva y reproducible.** Con los mismos datos y el mismo reloj, el resultado es idéntico; re-ejecutar **no** crea una segunda brecha (idempotencia).
7. **Quedó disponible** para el siguiente acto (consultable), sin que ATENDER/DIAGNOSTICAR/JUZGAR hayan intervenido.

## Procedimiento de observación (reproducible por un tercero)
1. Identificar/sembrar en staging una WO abierta con `slaDueAt` en el **futuro cercano** (dentro de la ventana at-risk) — el plazo aún **no** ha pasado.
2. Ejecutar la conducta de génesis con un reloj fijo `nowMs < slaDueAt`.
3. Consultar `audit_events` por `eventType = "motor.brecha.detected"` para esa WO.
4. Verificar los 7 puntos sobre el registro observado.
5. Re-ejecutar y confirmar que **no** aparece un segundo registro.

## Qué FALSARÍA la afirmación (criterio honesto, no teatro)
La demostración **fracasa** si ocurre **cualquiera** de:
- no se crea brecha para una WO genuinamente at-risk; o
- se crea **después** de `slaDueAt` (no fue anticipatoria); o
- el registro contiene causa, decisión o predicción (no fue objetivación de evidencia presente); o
- falta uno de los dos lados (no fue bilateral); o
- re-ejecutar **duplica** la brecha (no fue determinista/idempotente); o
- la brecha no es consultable por un tercero.

## Veredicto de aceptación
Si los **7 puntos** se observan y **ningún** falsador ocurre, un tercero puede afirmar —con evidencia, sin confiar en el implementador—:
> **"El Motor Cognitivo acaba de demostrar su primer comportamiento operacional: observar una operación real y objetivar una brecha anticipatoria con evidencia presente."**
