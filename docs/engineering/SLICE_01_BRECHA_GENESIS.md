# Slice 01 — Primer ciclo mínimo de supervisión operacional (génesis de brecha)

> **Naturaleza.** Definición del **primer slice ejecutable** del Motor Cognitivo. NO es implementación. Demuestra, de extremo a extremo, el **nacimiento del Motor**: observar una operación real, compararla con una norma vigente, objetivar una brecha **con evidencia presente** y persistirla disponible para el resto del Motor — y **termina ahí**. Fiel a `BRECHA_GENESIS_CONTRACT.md` (CONTRACT FROZEN). **Reutiliza solo infraestructura ya existente; no diseña tablas, RPC ni abstracciones.** Estado: **PROPUESTO — pendiente de aprobación.** Fecha: 2026-06-29.

## Afirmación a demostrar (criterio de éxito)
> *"Una operación real generó una brecha objetiva **antes del incumplimiento consumado**, usando únicamente **evidencia presente** y las reglas del Motor Cognitivo."*

## Canonical Home vs Execution Substrate (precisión arquitectónica)
- **Hogar canónico (inmutable):** la brecha pertenece al **MOV** (familia D). Es y seguirá siendo su hogar conceptual. Este slice **no** lo cambia.
- **Sustrato de ejecución (transitorio):** mientras el repositorio canónico del MOV no exista como código (`AQ-SYS-011`), la primera implementación usa `audit_events.metadata` **únicamente como soporte temporal de persistencia**. Es una decisión **exclusivamente de implementación**: no modifica el modelo conceptual, la arquitectura, la ontología ni la autoridad del MOV. Cuando exista el MOV, la brecha **migra a su hogar sin cambio conceptual**. El Ledger **no es el hogar de la brecha**; es el soporte temporal del primer slice.

## Sobre qué infra **congelada** se apoya (cero infra nueva)
| Pieza reutilizada (ya existe) | Rol en el slice |
|---|---|
| `WorkOrder` (`service/domain/work-order.ts`): `status`, `slaDueAt`, `scheduledEnd` | la señal y la norma operativa |
| `classifyWorkOrderTiming` (`scheduling/domain/overdue.ts`, **pura, reloj inyectado**) | el comparador de **evidencia presente** (now vs `slaDueAt`); devuelve `sla:"at_risk"` |
| `OverdueScanRepository.listOpenWithSla` + barrido por tenant/clock/`requestId` (`scan-overdue-work-orders.ts`) | leer las WO abiertas con SLA, de forma determinista y aislada por tenant |
| `AuditRepository.append(AuditEvent)` (`audit/...`, `audit_events.metadata`) | **sustrato de ejecución transitorio** del slice (soporte temporal de persistencia; **no** es el hogar de la brecha — ver §Canonical Home vs Execution Substrate) |
| **Lo único que añade el slice** | **un** caso de uso delgado que mapea `at_risk` → un registro de **brecha** en el Ledger. Sin tablas, sin RPC, sin abstracciones. |

---

## 1. ¿Cuál es exactamente la señal de entrada?
Una **Work Order abierta** (status ∉ `{completed, cancelled, on_hold}`) que **porta un plazo contractual** (`slaDueAt ≠ null`), de un tenant real, observada en un instante fijo `nowMs`. Es la entrada de `listOpenWithSla`. Hecho observado puro (nivel `observacion` B1): atribuible (id de la WO), fechado (`nowMs`), acotado al tenant.

## 2. ¿Cuál es exactamente la norma contra la que se compara?
La norma operativa vigente: **"una WO abierta debe completarse en/antes de su `slaDueAt`"** — ya codificada en el campo `slaDueAt` de la WO. Es el `objetivo`/`restriccion` (familia D) **operativo**. *(Formalizarla como entidad MOV D1/D2 es autoría de norma, fuera del contrato §6 → ver Bloqueo 2.)*

## 3. ¿Cuál es exactamente la evidencia utilizada?
**Solo evidencia presente**, sin proyección: `nowMs` (reloj), `slaDueAt` (plazo), `status` (que la WO sigue abierta y no en pausa), y `atRiskWindowMs` (umbral **calibrable** = contenido, no forma). `classifyWorkOrderTiming` es la función **pura** ya existente que computa el estado de tiempo a partir de estos. Ninguna curva, ninguna predicción.

## 4. ¿Qué condición convierte esa señal en brecha?
La WO está en estado **`sla === "at_risk"`**: `slaDueAt − nowMs ≤ atRiskWindowMs` **y** `slaDueAt ≥ nowMs`. Es decir, la **evidencia presente** muestra que el plazo está dentro del margen crítico y la WO no progresó — la norma **no podrá satisfacerse si las condiciones actuales permanecen**, **antes** de que `slaDueAt` pase. Esto satisface C-1…C-5 del contrato (existe norma · hay desviación · es material · es vigente · es anticipatoria por evidencia presente). *(`breached` —ya consumado— es la misma génesis sobre evidencia consumada; el slice demuestra el caso **anticipatorio** `at_risk`.)*

## 5. ¿Qué escribe el Motor?
**Un registro de brecha** cuyo **hogar canónico es el MOV** (familia D); el slice lo persiste en el **sustrato de ejecución transitorio** (`audit_events.metadata`) vía `AuditRepository.append`, con `eventType: "motor.brecha.detected"` (string libre, mismo patrón que `SLA_ALERT_EVENT`). Su `metadata` porta la **sustancia de la brecha** que exige el contrato (E-1…E-5), y **nada más**:
- **lado observado:** `workOrderId`, `status`, `observadoEnMs` (= `nowMs`);
- **lado normativo:** `slaDueAt` (la norma) y su tipo (`sla_deadline`);
- **desviación:** `estado:"at_risk"`, `margenRestanteMs` (= `slaDueAt − nowMs`);
- **procedencia:** la WO observada y el reloj (traza a la observación raíz);
- **sello:** epistémico (confianza heredada de la fiabilidad de la señal, eslabón débil) + temporal (`nowMs`);
- **tenant:** `organization_id`.
Escribe **una** brecha por WO en `at_risk`, **idempotente** (no duplica si ya existe una brecha viva para esa WO — reusa el patrón de dedup del scan). **No escribe causa, ni diagnóstico, ni recomendación, ni decisión** (I-4).

## 6. ¿Qué NO hace este slice?
- **No prioriza** (ATENDER) · **no diagnostica la causa** (DIAGNOSTICAR / `relacion_causal`) · **no decide/actúa** (JUZGAR) · **no comunica al rol** (ARTICULAR) · **no reconcilia/aprende** (RECONCILIAR).
- **No construye la tabla MOV** ni el módulo `ose` completo · **no formaliza la norma como entidad D** · **no diseña RPC/eventos/APIs nuevos**.
- **No modifica ni reemplaza** la feature operativa `sla_alert` existente (esa es una **alerta de producto**; esta brecha es **sustancia del Motor**, con propósito y forma distintos).
- No continúa más allá de "dejar la brecha disponible".

## 7. ¿Cómo sabremos objetivamente que funcionó?
Test demostrable sobre staging: sembrar **una** WO abierta con `slaDueAt` a ~1h (dentro de la ventana at-risk por defecto de 2h), sin `on_hold`. Correr el caso de uso con un `nowMs` fijo. **Éxito objetivo si:**
1. Se produce **exactamente un** evento `motor.brecha.detected` en `audit_events`.
2. Su `metadata` contiene los **dos lados** (observado + norma), la desviación `at_risk`, procedencia, sello y tenant — y **ninguna** causa/decisión.
3. La WO **no ha incumplido** aún (`slaDueAt > nowMs`) → la brecha es **anticipatoria**.
4. Re-correr el caso **no duplica** la brecha (idempotencia).
5. La brecha es **consultable** vía `AuditRepository.listRecentByEventType("motor.brecha.detected")`.
Si los 5 se cumplen, queda demostrada la afirmación de éxito.

## 8. ¿Qué componente será el siguiente consumidor de esa brecha?
**ATENDER (C3, gate G4):** *"Lee `brecha` (D3) y `objetivo` (D1)"* para rankear salience. El slice deja la brecha **durable y consultable** para que C3 la consuma después. *(En la spec C3 lee vía `MovRepository`; aquí la brecha se persiste en el **sustrato de ejecución transitorio** → el binding de lectura **canónico** para C3 es `AQ-SYS-011`, ver Bloqueo 1.)*

---

## Bloqueos registrados (con evidencia — NO resueltos por intuición)
- **Bloqueo 1 — `AQ-SYS-011`: la entidad/repositorio MOV `brecha` (D3) no existe como código.** Evidencia: `glob modules/mov/**` → vacío. **Hogar canónico:** el MOV (inmutable). **Sustrato de ejecución transitorio:** `audit_events.metadata`, soporte temporal de persistencia para este slice — decisión **exclusivamente de implementación**, no cambia el modelo conceptual ni la autoridad del MOV. **Diferido:** la migración al hogar canónico MOV y el lado-lectura `MovRepository` para C3. No se resuelve aquí.
- **Bloqueo 2 — la norma no es una entidad MOV D1/D2.** Evidencia: `work-order.ts` L84-85 (`slaDueAt`). El slice usa la **SLA operativa** como norma; la autoría de norma está **fuera del contrato (§6)**. Diferido.
- **Bloqueo 3 — el módulo OSE (C2) no existe como código.** Evidencia: `glob modules/ose/**` → vacío. El slice realiza la **conducta de génesis** como un caso de uso delgado que reusa `classifyWorkOrderTiming`; **no** es el OSE completo. Diferido a la implementación de C2.

> Los tres bloqueos consolidan en `AQ-SYS-011` (ya registrada). El slice **realiza el comportamiento** del contrato con infra existente y **declara** lo que queda diferido — sin inventar resolución.
