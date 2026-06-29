# C5 — JUZGAR · CONTRATO (autoridad para toda la ingeniería posterior)

> **Naturaleza.** Contrato del componente, NO diseño ni implementación ni pseudocódigo. Define la frontera dura de JUZGAR antes de escribir su Engineering Spec. Toda la ingeniería de C5 debe ser fiel a este contrato. Base: ARQUITECTURA §3 acto 5; MOTOR gates G6/G7/G8 + §6 + §8 Freno 3; frontera de salida de C4 (FROZEN); auditoría conceptual previa en `C5_PREPARATION.md`. No introduce conceptos nuevos; donde el canon calla, se registrará AQ en la spec. Fecha: 2026-06-29. Estado: **BORRADOR — pendiente de aprobación**.

## Qué hace C5
JUZGAR es el **quinto acto del Motor** y el **acto de decisión**. Dado un `Diagnostico` derrotable (la causa que produjo C4), JUZGAR:
1. **(G6) Decide la suficiencia por consecuencia:** ¿la confianza heredada alcanza para lo que está en juego, dado el costo de error del rol?
2. **(G7) Proyecta la palanca HACIA ADELANTE contra la causa:** recorre el grafo causal aguas abajo, poda por restricción, y genera `intervencion`(es) candidatas.
3. **(G8) Decide / se compromete / se abstiene / escala:** elige (o no) una palanca, **siembra la `expectativa` del resultado** de la palanca (la predicción que cerrará el bucle de aprendizaje) y registra el compromiso.

Es el **primer acto que vuelve a ESCRIBIR sustancia** tras el OSE (C3 y C4 son solo-lectura).

## Qué NO hace C5
- **No diagnostica:** no recorre el grafo hacia atrás, no re-abduce la causa, no reclasifica síntoma/causa/restricción.
- **No calibra:** no ajusta la confianza de ninguna `relacion_causal`, palanca ni prior (eso es RECONCILIAR, post-outcome).
- **No articula:** no produce texto ni pantalla para el rol.
- **No atiende:** no rankea salience ni asigna foco/presupuesto.
- **No percibe:** no mide sorpresa, no integra hechos del mundo, no emite `perturbacion`, no recomputa el lado observado de la brecha.
- **No promueve a HECHO:** una `intervencion` nace HIPÓTESIS; la decisión es derrotable.

## Entradas
- El `Diagnostico` de C4 (causas derrotables con su falsador y procedencia, o abstención).
- `RoleContext` (su `costoDeError` gobierna el umbral de G6).
- Las `restriccion` (D2) vigentes, para podar la proyección.
- El grafo causal **hacia adelante** (`CausalGraphRepository.traverseDownstream`, ya existe en C1 — reuso).
- Políticas de **SOLO LECTURA** para suficiencia (G6) y elección de palanca (G7/G8); cuantificación calibrada por RECONCILIAR.

## Salidas
- `intervencion` (E3) · `compromiso` (A2) · `expectativa` (B3) de resultado de palanca — escritas vía el punto de escritura único de C1 (`mov_integrar`, con permiso propio; reuso, no API nueva).
- O una **abstención/escalada deliberativa** (distinta de la abstención-por-ausencia-de-causa de C4).
- **Nunca** texto para el rol, ni ranking, ni recálculo de sustancia ajena.

## Invariantes (candidatos; la spec los numerará y dará guard)
- **Recorrido solo HACIA ADELANTE** (`traverseDownstream`); nunca hacia atrás.
- **Actúa contra la CAUSA, no el síntoma** (consume la causa diagnosticada por C4).
- **Suficiencia relativa al costo de error del rol** (G6), bajo blindaje forma/contenido (el umbral es forma; su cuantificación, contenido calibrable).
- **Eslabón débil heredado:** la confianza de la decisión no excede la del diagnóstico que la funda.
- **Nada a HECHO:** la `intervencion` nace HIPÓTESIS (`estado_ejecucion='considerada'`).
- **Derrotabilidad/trazabilidad:** la decisión porta su falsador (la `expectativa` sembrada) y traza a la causa y a las observaciones raíz.
- **No calibra:** lee política R/O; jamás escribe priores/confianzas de relaciones causales.
- **Abstención deliberativa de primera clase**, declarando qué falta y qué la rescataría.
- **Presupuesto bajo techo absoluto** independiente del stake (MOTOR §8 Freno 3).

## Responsabilidades exclusivas
- Ejecutar el **gate de suficiencia G6** (que C4 explícitamente NO ejerce).
- **Proyectar consecuencias hacia adelante** y **generar palancas** (`intervencion`).
- **Comprometerse / abstenerse deliberativamente / escalar** (G8).
- **Sembrar la `expectativa`** de resultado — el seam de *outcome linkage* hacia OSE (que la medirá) y RECONCILIAR (que calibrará).

## Frontera con otros componentes
- **OSE (C2):** JUZGAR escribe E3/A2/B3 pero **no percibe ni mantiene el modelo de mundo**; la sorpresa contra la `expectativa` sembrada la medirá el OSE *después*. JUZGAR no llama `perceiveSignal`/`writePerturbation`/`updateGapObservedSide`.
- **ATENDER (C3):** JUZGAR **recibe** el foco/diagnóstico ya priorizados; no rankea salience ni inyecta `SaliencePolicyPort`.
- **DIAGNOSTICAR (C4):** JUZGAR **consume** el `Diagnostico`; no re-diagnostica. Si es insuficiente (G6), devuelve el control (reobservar/abstención), no recorre upstream.
- **ARTICULAR (C6):** JUZGAR produce la **decisión como dato**; **no la comunica** al rol en su lenguaje. Esa traducción es de ARTICULAR.
- **RECONCILIAR (C7):** JUZGAR **lee** la confianza calibrada y **siembra** la expectativa; el ajuste post-outcome de confianzas/priores/papeles es exclusivo de RECONCILIAR.

## Riesgos de invasión (qué vigilar en la spec)
- **Re-diagnosticar** (recorrer hacia atrás / re-abducir) → invade C4.
- **Calibrar** confianzas o priores → invade RECONCILIAR.
- **Redactar para el rol** (texto/pantalla) → invade ARTICULAR.
- **Rankear salience / reasignar foco** → invade ATENDER.
- **Medir sorpresa / integrar hechos / emitir perturbación** → invade OSE.
- **Fijar la cuantificación** del umbral o de la palanca en el dominio → viola el blindaje forma/contenido (debe vivir tras puerto R/O).

## Dependencias sistémicas (de SYSTEM_DECISIONS.md)
La **spec** de C5 puede cerrarse, pero su **operación** depende de: `AQ-SYS-001` (génesis de brecha), `AQ-SYS-002` (población del grafo causal), `AQ-SYS-005` (atomicidad de escritura — C5 escribe E3+A2+B3), `AQ-SYS-006` (calibración de la política de suficiencia/palanca), `AQ-SYS-012` (recogida de deuda de preempción). Ninguna se resuelve aquí.
