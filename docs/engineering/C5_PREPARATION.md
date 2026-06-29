# C5 — JUZGAR · Preparación conceptual (NO es la spec de C5)

> **Naturaleza.** Auditoría **conceptual** de la frontera antes de especificar C5. NO escribe C5. NO inventa APIs ni puertos. NO modifica canon ni componentes congelados. Donde el canon calla sobre cómo JUZGAR materializa algo, se registra una Architectural Question; **no se resuelve por intuición**. Base: ARQUITECTURA §3 acto 5 (JUZGAR), MOTOR gates G6/G7/G8 + §6 + §8 Freno 3, y la frontera de salida de C4 (`04-diagnosticar.md`, FROZEN). Fecha: 2026-06-29.

## Objetivo
Establecer con precisión **dónde termina DIAGNOSTICAR y dónde empieza JUZGAR**, qué debe quedar **exclusivamente** en JUZGAR, y qué riesgos de invasión existen hacia ARTICULAR / RECONCILIAR / ATENDER / OSE / DIAGNOSTICAR — de modo que C5 pueda especificarse sin poner en riesgo la arquitectura congelada.

---

## 1. ¿Dónde TERMINA DIAGNOSTICAR? (frontera de salida de C4, verificada)

DIAGNOSTICAR (G5) termina exactamente cuando devuelve su valor de retorno efímero `Diagnostico`:
- **Produce:** o bien `{ kind:"diagnostico", causas: CausaCandidata[], nodos, empatesDeclarados, confianza, esDisyuntiva }` — causas **derrotables**, ordenadas por soporte, cada una con su `Falsador` y su procedencia; o bien `{ kind:"abstencion" }` por **ausencia de causa fundamentable** o premisa no evaluada.
- **Recorrido:** SOLO `traverseUpstream` (hacia atrás). C4 tiene `traverseDownstream` **estructuralmente excluido** (`DiagnoseDeps` lo omite por `Pick<…>`).
- **NO hace** (frontera dura de C4, ya congelada): no decide suficiencia por consecuencia (G6), no proyecta hacia adelante (G7), no genera `intervencion` (E3), no se compromete (G8), no calibra `relacion_causal` (RECONCILIAR), no articula al rol (G9), no escribe sustancia, no promueve nada a HECHO.
- **Estado epistémico entregado:** `INFERENCIA | HIPOTESIS`, jamás HECHO; confianza topada por eslabón débil.

> **Punto exacto de corte:** C4 entrega la **confianza heredada** de las causas y se detiene. **No ejecuta el gate de suficiencia.** C4 lo declara explícitamente en `AQ-DIAG-UMBRAL-ABSTENCION`: *el umbral por consecuencia (G6) es del consumidor.* Ese consumidor es JUZGAR.

---

## 2. ¿Dónde EMPIEZA JUZGAR? (G6 primero)

JUZGAR empieza en **G6 — Suficiencia de evidencia** (MOTOR L118, *"¿Sé lo bastante para lo que está en juego?" · DIAGNOSTICAR→JUZGAR*). Es el **primer acto de JUZGAR**, no un trámite compartido:
- G6 toma el `Diagnostico` (con su confianza heredada) y el **costo de error del rol** (`RoleContext.costoDeError`) y decide si la confianza **alcanza para lo que está en juego**. Comprender no obliga a actuar; un diagnóstico sólido puede ser insuficiente para una decisión de alto stake.
- Si **no alcanza** → JUZGAR ejerce la **abstención deliberativa** (distinta de la abstención-por-ausencia de C4) o **escala / pide reobservar** (valor de la información, MOV §10 Clase 3 — frente abierto).
- Si **alcanza** → entra a G7.

Luego:
- **G7 — Proyectar la palanca HACIA ADELANTE.** Recorre el grafo causal **aguas abajo** (`traverseDownstream`) desde la causa diagnosticada, proyecta consecuencias, **poda por restricción**, y genera `intervencion`(es) (E3) candidatas contra la **causa, no el síntoma**.
- **G8 — Decidir / abstenerse / escalar.** Elige (o no) una palanca, **se compromete** (`compromiso`, A2), y **siembra la `expectativa` (B3) de resultado de la palanca** — la predicción que cerrará el bucle de aprendizaje cuando el OSE mida la sorpresa contra ella y RECONCILIAR calibre.

---

## 3. Responsabilidades que deben quedar EXCLUSIVAMENTE en JUZGAR

| Responsabilidad | Gate | Por qué es exclusiva |
|---|---|---|
| Decidir **suficiencia por consecuencia** (confianza vs costo de error del rol) | G6 | C4 entrega confianza pero NO ejecuta este gate (`AQ-DIAG-UMBRAL-ABSTENCION`) |
| **Recorrer el grafo HACIA ADELANTE** (`traverseDownstream`) | G7 | C4 lo tiene prohibido; "la escalera separa físicamente los dos sentidos" (MOTOR §3.2 inv (a)) |
| Generar `intervencion` (E3); proyectar consecuencias; podar por restricción para decidir | G7 | Ningún acto anterior genera palancas |
| **Comprometerse** (`compromiso`, A2); **abstención deliberativa**; escalar | G8 | Distinto de la abstención-por-ausencia de C4 |
| **Sembrar la `expectativa` (B3) de resultado de la palanca** | G8 | Es la predicción que el OSE medirá y RECONCILIAR calibrará — el costado de *outcome linkage* |

---

## 4. Frontera dura — riesgos de invasión (qué JUZGAR NO debe hacer)

| Si JUZGAR invadiera… | …estaría haciendo el trabajo de | Salvaguarda que C5 debe heredar |
|---|---|---|
| **Recorrer hacia ATRÁS / reclasificar la causa / re-abducir** | **DIAGNOSTICAR** (C4, G5) | JUZGAR **consume** el `Diagnostico`; no vuelve a diagnosticar. Si el diagnóstico es insuficiente, **devuelve el control** (reobservar / G6 abstención), no re-recorre upstream. |
| **Calibrar la confianza** de `relacion_causal` o de la palanca; ajustar priores; reclasificar papel **post-outcome** | **RECONCILIAR** (C7, MOTOR §10.4) | JUZGAR **lee** la confianza calibrada y **siembra** la expectativa; **no ajusta** confianzas. El ajuste ocurre *después* del outcome, y lo hace RECONCILIAR. |
| **Proyectar la decisión al rol en su lenguaje**; producir texto/pantalla | **ARTICULAR** (C6, G9) | JUZGAR produce la **decisión/compromiso** como dato; **no comunica**. ARTICULAR traduce al rol. |
| **Rankear salience / asignar foco / resolver preempción** | **ATENDER** (C3, G4/G0.5) | JUZGAR **recibe** el foco+diagnóstico ya priorizados; no rankea. |
| **Medir sorpresa / integrar hechos del mundo / emitir `perturbacion` / recomputar lado observado de la brecha** | **OSE** (C2, G0–G3) | JUZGAR escribe `intervencion`/`compromiso`/`expectativa`, pero **no percibe ni mantiene el modelo de mundo**. La sorpresa contra la expectativa la medirá el OSE *después*. |

> **Criterio de fallo de C5 (anticipado):** si JUZGAR recorriera hacia atrás (re-diagnosticar), calibrara confianzas (RECONCILIAR), redactara para el rol (ARTICULAR), rankeara atención (ATENDER) o midiera sorpresa (OSE), dejaría de ser el acto de juicio.

---

## 5. Cambio arquitectónico clave que C5 introduce

**JUZGAR es el PRIMER acto de consulta que ESCRIBE sustancia.** C3 (ATENDER) y C4 (DIAGNOSTICAR) son **estrictamente solo-lectura** (sus `Deps` excluyen toda escritura por `Pick<…>`). JUZGAR rompe ese patrón: **produce `intervencion` (E3), `compromiso` (A2) y `expectativa` (B3)**. Implicaciones para la spec de C5:
- C5 **sí** inyectará una capacidad de escritura — previsiblemente vía la RPC `mov_integrar` de C1 (familias A/B/E "con su propio permiso", como el canon habilita a actos distintos del OSE). **No se inventa un puerto nuevo**; se reusa el punto de escritura único de C1.
- C5 vuelve a abrir la cuestión de **atomicidad** (sembrar intervención + compromiso + expectativa de forma coherente) → hereda `AQ-OSE-ATOMICIDAD` / `AQ-19 BLOQUEO-SUBGRAFO`.
- Por tanto la **frontera R/O ↔ escritura** se desplaza: C1 escribe (sustrato), C2 escribe (mantiene mundo), C3/C4 **solo leen**, **C5 vuelve a escribir** (decisión). C5 debe declarar esta asimetría explícitamente y NO contaminar a C3/C4.

---

## 6. Entradas y salidas de JUZGAR (contrato conceptual)

- **Consume:** el `Diagnostico` de C4 (causas derrotables o abstención) · `RoleContext` (el `costoDeError` gobierna G6) · el grafo causal **hacia adelante** (`CausalGraphRepository.traverseDownstream`, ya existe en C1) · las `restriccion` (D2) para podar · políticas de SOLO LECTURA (suficiencia, proyección).
- **Produce:** `intervencion` (E3) · `compromiso` (A2) · `expectativa` (B3) de resultado de palanca · o una **abstención/escalada deliberativa**. Nunca texto para el rol (eso es C6).

---

## 7. Puertos / recorridos que C5 necesitará (forma canónica; cuantificación = AQ)

> Se describe la **forma** que el canon implica; **no se fijan firmas ni cuantificación** (eso es la spec + RECONCILIAR). Lo desconocido se registra como AQ.

- **`traverseDownstream`** (C1 `CausalGraphRepository`, R/O) — ya existe; es el espejo de `traverseUpstream`. **Reuso, no invención.**
- **Punto de escritura** para E3/A2/B3 — reuso de `mov_integrar` (C1) con permiso propio. **No se crea puerto nuevo.**
- **Un puerto de política de SOLO LECTURA para G6** (suficiencia por consecuencia) — análogo a `RelevanceThresholdPort`/`SaliencePolicyPort`/`PlausibilityPolicyPort`. Su **forma** (orden: suficiente/insuficiente relativo al costo de error) es ley; su **cuantificación** la calibra RECONCILIAR → `AQ-C5-UMBRAL-SUFICIENCIA` (hereda `AQ-DIAG-UMBRAL-ABSTENCION`).
- **Un puerto de política de proyección/elección de palanca** (G7/G8) — forma: orden por rendimiento esperado bajo restricción y techo de presupuesto (Freno 3); cuantificación = contenido → `AQ-C5-POLITICA-PALANCA`.

---

## 8. Architectural Questions que C5 hereda / debe abrir (NO resueltas)

| AQ (provisional) | Origen | Naturaleza |
|---|---|---|
| `AQ-C5-UMBRAL-SUFICIENCIA` | hereda `AQ-DIAG-UMBRAL-ABSTENCION` | G6: forma del umbral por consecuencia es ley; cuantificación = RECONCILIAR. JUZGAR ejerce, no calibra. |
| `AQ-C5-POLITICA-PALANCA` | nuevo | G7/G8: orden de palancas por rendimiento esperado bajo restricción; cuantificación diferida. |
| `AQ-C5-EXPECTATIVA-OUTCOME` | nuevo | ¿Cómo se siembra la `expectativa` (B3) de resultado de palanca y cómo el OSE la recoge para medir sorpresa? Es el seam de *outcome linkage* C5→C2→C7. |
| `AQ-C5-ESCRITURA-ATOMICA` | hereda `AQ-OSE-ATOMICIDAD` / `AQ-19` | E3+A2+B3 deben sembrarse coherentemente o fallar atómicamente. |
| `AQ-C5-PREEMPCION-RECOGIDA` | hereda `AQ-DIAG-HOGAR-DIAGNOSTICO` / `AQ-ATENDER-PREEMPCION-PROTOCOLO` | Cómo JUZGAR recoge la deuda viva de un diagnóstico preemptado al retomarlo. |
| `AQ-C5-VALOR-INFORMACION` | hereda MOV §10 Clase 3 (frente abierto) | La rama "abstenerse vs reobservar" en G6 depende del valor de la información — no modelado. |
| `AQ-C5-DEPENDE-DE-HUERFANAS` | milestone review H1–H2 | JUZGAR opera sobre causas; si nadie pobló `relacion_causal` (H2) ni creó la brecha (H1), JUZGAR no tiene sobre qué juzgar. **No bloquea la spec; bloquea la operación.** |

---

## 9. Checklist — ¿puede empezar C5 sin riesgo para la arquitectura?

| Condición | Estado |
|---|---|
| La frontera DIAGNOSTICAR↔JUZGAR es nítida (corte exacto en G6) | ✅ |
| Las responsabilidades exclusivas de JUZGAR (G6/G7/G8) están identificadas | ✅ |
| Los riesgos de invasión (ARTICULAR/RECONCILIAR/ATENDER/OSE/DIAGNOSTICAR) están mapeados con salvaguardas | ✅ |
| El cambio R/O→escritura está señalado (JUZGAR es el primer escritor tras C2) | ✅ |
| Los recorridos/puertos se reusan de C1 (downstream, mov_integrar), sin inventar | ✅ |
| Lo desconocido está registrado como AQ, no resuelto por intuición | ✅ |

**Conclusión:** C5 **puede especificarse** siguiendo la misma disciplina (13 secciones + falsación + AQ), reusando `traverseDownstream` y `mov_integrar` de C1, declarando su asimetría de escritura, y heredando las AQ anteriores. **Recordatorio:** C5 razona sobre causas que **dependen de las responsabilidades huérfanas H1/H2** (génesis de brecha y de `relacion_causal`); su spec puede cerrarse, pero su **operación** espera la Fase D del roadmap. **No empezar a redactar C5 hasta que el founder lo autorice explícitamente** (este documento es solo preparación).
