# Contrato de Génesis de Brecha (operativo, NO gobernanza)

> **Naturaleza.** Contrato **operativo** que define EL COMPORTAMIENTO por el cual una operación real produce una **brecha** observable que el Motor Cognitivo puede atender. **No** es framework, **no** es implementación, **no** diseña tablas/eventos/RPC/esquema. Define **solo comportamiento**. Resuelve la mayor incertidumbre arquitectónica viva del proyecto: la génesis de la brecha (huérfana del Milestone Review; `AQ-SYS-001`). Anclado al canon **CONGELADO** (MOV familias D/B; MOTOR Freno 1; frontera OSE PERCIBIR/COMPRENDER) y a los **módulos reales ya existentes** como fuentes de señal. Fecha: 2026-06-29. **Estado: CONGELADO — `CONTRACT FROZEN` (2026-06-29).** Fundamento operativo del primer slice ejecutable del Motor.

## Contexto en una frase
La `brecha` (D3) es el **átomo de entrada** del Motor: el primer acto (OBSERVAR/COMPRENDER, C2-OSE) no puede empezar sin ella, y ningún acto posterior (Atender → Diagnosticar → Juzgar → Coordinar → Aprender) opera sin ella. Este contrato fija **cuándo y cómo nace**, sin diseñar la maquinaria que la materializa.

## Principio rector (naturaleza de la brecha)
Una brecha es un **riesgo operacional objetivable con la evidencia disponible** en el momento — **no** una predicción, una intuición ni una hipótesis. NEXUS no actúa porque "cree": una brecha existe **solo** cuando la evidencia presente **demuestra** que la operación **ya no satisface** la norma vigente, o que **no podrá satisfacerla si las condiciones actuales permanecen**. La *hipótesis* entra después y en otro lugar — el **porqué** de la brecha es de DIAGNOSTICAR (estatus HIPÓTESIS por defecto, MOV R1); la brecha **misma es observada, no conjeturada**. Su confianza (eslabón débil, I-5) mide la **calidad de la evidencia**, no un grado de especulación.

---

## 1. ¿Qué constituye una señal operacional?
Una **señal operacional** es un hecho **observado** sobre la operación, emitido por el dominio de un módulo que **ya existe** (`service`, `crm`, `billing`, `inventory`, `scheduling`…), que cumple:
- **(a) Atribuible** a una entidad real y concreta (una WO, una factura, una oportunidad, un ítem de stock).
- **(b) Fechada** — porta un sello temporal (cuándo se observó).
- **(c) Acotada al tenant** — pertenece a una organización (`organization_id`).
- **(d) Comparable a una referencia normativa** — tiene relación medible con un `objetivo` (D1) o una `restriccion` (D2).

Una señal es **hecho observado puro** (nivel `observacion`, B1). **NO es todavía** una brecha, ni un diagnóstico, ni una alerta.
**NO son señales:** una opinión, una métrica absoluta sin referencia normativa, una predicción, un evento de interfaz, "algo que quizá importe". **Si no se puede medir contra una norma, no es señal operacional — es ruido.**

## 2. ¿Qué condiciones convierten una señal en una brecha?
Una señal cruza a **brecha (D3)** cuando —y solo cuando— se cumplen **todas**:
- **C-1 Existe norma.** Hay un `objetivo` (D1) o una `restriccion` (D2) **vigente** contra el cual medir la señal. *Sin norma no hay brecha:* la salud operacional se define **relativa a una meta**.
- **C-2 Hay desviación.** El estado observado **difiere** del estado que la norma requiere, más allá de una tolerancia. La desviación **es** el gap.
- **C-3 Es material a la salud operacional.** La desviación **amenaza** un compromiso, un recurso, un objetivo o una dependencia. Una desviación trivial dentro de tolerancia **no** es brecha.
- **C-4 Es vigente y no resuelta.** La desviación **persiste ahora**; no está ya cerrada ni superada por una observación posterior.
- **C-5 (anticipatoria, fundada en evidencia presente).** La brecha no exige que el incumplimiento esté **consumado**. Nace también cuando la **evidencia disponible en el presente** ya basta para concluir que la norma **no podrá satisfacerse si las condiciones actuales permanecen** — **sin** proyectar curvas, planificar ni modelar el futuro. La anticipación es, por tanto, una afirmación sobre el **estado presente** (la norma ya es insatisfactible bajo lo observado), **no** una predicción sobre un estado futuro. *Ej.: una WO cuyo trabajo aún no ha comenzado cuando la evidencia presente ya no deja margen para cumplir el compromiso es brecha ahora — porque el déficit se demuestra con lo observado, no porque se pronostique el futuro.*

La brecha nace en la **familia D** del MOV, portando **ambos lados** —el observado (de la señal) y el normativo (la norma)—. **Nace sin causa:** el *porqué* es de DIAGNOSTICAR.

## 3. ¿Quién tiene autoridad para crear la brecha?
- **Autoridad única: el OSE (C2).** Es el único acto que mantiene el lado observado del modelo de mundo y recomputa el lado observado de la brecha. **Ningún otro acto crea brechas:** ATENDER las lee, DIAGNOSTICAR las explica, JUZGAR actúa sobre ellas, RECONCILIAR aprende de su cierre.
- **Disparo exógeno (Freno 1).** El OSE **no se enciende a sí mismo** (MOTOR §8, Freno 1): la génesis se dispara por la **llegada de una señal operacional externa** desde un módulo existente, **nunca** por impulso interno del Motor.
- **El rol humano NO crea brechas.** Un humano puede **definir la norma** (fijar un SLA, un umbral de reorden) —autoría de norma, **fuera de este contrato**—, pero la brecha la **deriva el OSE** de señal + norma. Esto es lo que separa la supervisión autónoma de una herramienta de alertas manuales.

## 4. ¿Qué evidencia mínima debe existir?
Ninguna brecha nace sin:
- **E-1 La señal** (lado observado): hecho atribuible, fechado, acotado al tenant.
- **E-2 La norma** (lado normativo): el `objetivo` (D1) o `restriccion` (D2) referenciado. *Sin norma solo hay una `observacion` (B1), no una brecha.*
- **E-3 La desviación medida:** la diferencia explícita observado-vs-requerido, con su magnitud y dirección; si la brecha es **anticipatoria** (C-5), la **evidencia presente** que demuestra que la norma no se satisface bajo las condiciones actuales.
- **E-4 Procedencia:** traza a la(s) `observacion`(es) raíz que la fundaron (disciplina de fundamentación: toda afirmación ligada a la observación que la fundó).
- **E-5 Sello:** sello **epistémico + temporal** (MOV.I-0: *no existe entidad desnuda*).

**NO se requiere** —y su presencia sería error de categoría—: una causa, un diagnóstico, una recomendación o una decisión.

## 5. ¿Qué invariantes debe cumplir la creación de una brecha?
- **I-1 Relativa a norma.** Referencia exactamente un D1 o D2. Sin norma ⇒ no es brecha (es B1).
- **I-2 Bilateral.** Porta el lado observado y el normativo. Es una **relación**, no un hecho.
- **I-3 Fundamentada.** Procedencia no vacía; traza a observaciones raíz.
- **I-4 Sin causa.** No porta causa/diagnóstico/recomendación (frontera con DIAGNOSTICAR).
- **I-5 Eslabón débil.** Confianza de la brecha ≤ confianza de la señal que la funda (MOV §0.7). Señal ruidosa ⇒ brecha de **baja confianza**, no falsa certeza.
- **I-6 Derrotable.** Es estado **revisable** del modelo; se **cierra/supersede** cuando la señal vuelve a la norma — no se borra (la historia se conserva).
- **I-7 Idempotente.** Una misma desviación persistente **no** genera una brecha nueva por cada señal repetida: **actualiza la existente**. (Evita inundar el Motor; es comportamiento, no mecanismo.)
- **I-8 Acotada y sellada.** `organization_id` + sello obligatorios (multi-tenant + MOV.I-0).
- **I-9 Anticipatoria legítima.** Una brecha anticipatoria (C-5) se funda en **evidencia presente suficiente**, no en proyección; **no se inventa** una brecha futura sin base observada ahora.

## 6. ¿Qué queda explícitamente FUERA de este contrato?
- **El porqué (causa):** poblar `relacion_causal`, diagnosticar — es DIAGNOSTICAR (C4) y **`AQ-SYS-002` (población del grafo causal), que este contrato NO resuelve.**
- **La autoría de la norma:** quién/cómo se define un `objetivo` (D1) o `restriccion` (D2). El contrato **asume que las normas existen**; no define su creación.
- **Priorizar/atender** (C3) · **juzgar/decidir** (C5) · **coordinar** (C6) · **aprender/reconciliar** (C7).
- **Toda la infraestructura:** mecanismo de ingesta, esquema de tablas, eventos, RPC, binding técnico. Este contrato define **comportamiento**, no maquinaria.
- **Los números de tolerancia/umbral:** la **FORMA** ("desviación más allá de tolerancia") es de este contrato; la **CUANTIFICACIÓN** es contenido calibrable tras política (blindaje forma/contenido, MOTOR §9).
- **Encender la cadena completa** más allá de la brecha (orquestación; `AQ-JUZGAR-DISPARO` y afines).

---

## Resolución de AQ (a reflejar en `SYSTEM_DECISIONS.md` como siguiente paso)
- **`AQ-SYS-001` (génesis de brecha): `RESOLVED BY CONTRACT — PENDING OPERATIONAL VALIDATION`.** El contrato elimina la incertidumbre **arquitectónica** (qué es señal, cuándo deviene brecha, quién la crea, con qué evidencia y bajo qué invariantes). **No** se sobreafirma como resuelta en **ejecución**: la validación **operacional** —que el comportamiento se sostenga sobre una operación real— se cierra cuando el **primer slice observe una brecha real**. Ese es su criterio de cierre definitivo.
- **`AQ-SYS-002` (población del grafo causal): SIGUE ABIERTA.** Este contrato **no** la resuelve: la brecha es **normativa** (familia D, gap observado-vs-norma) y es **lógicamente anterior e independiente** del conocimiento causal (familia C, el *porqué*) — se observa un gap **antes** de saber su causa. Marcarla resuelta aquí sería **falsa resolución**. Queda como la **siguiente** incertidumbre a atacar, ya acotada (citada en §6).

> **Test del founder aplicado:** se resuelve **solo** lo que el contrato elimina realmente, **y solo al nivel en que lo elimina**. AQ-SYS-001 → resuelta **arquitectónicamente**, pendiente de validación **operacional**. AQ-SYS-002 → no eliminada, permanece abierta.
