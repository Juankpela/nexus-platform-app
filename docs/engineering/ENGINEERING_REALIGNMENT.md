# ENGINEERING_REALIGNMENT — Registro de correcciones conceptuales

> **Naturaleza.** NO es gobernanza. Es el **registro de correcciones conceptuales** que realinean la ingeniería con el canon tras la reformulación ratificada de COMPRENDER. **La arquitectura es la fuente de verdad; la ingeniería se adapta a ella, nunca al revés.** No introduce arquitectura, componentes ni AQ nuevas. No modifica el canon. Fecha: 2026-06-29. Estado: **PROPUESTO — pendiente de ratificación + 1 decisión que toca el canon (§Sello).**

---

## Hallazgo raíz (prioridad absoluta): la brecha tratada como artefacto autorizado

**Deriva detectada.** Un único error conceptual, **replicado** en la ingeniería: tratar la `brecha` como un **artefacto que algún acto debe CREAR/AUTORIZAR por primera vez**, en lugar de una **propiedad emergente** del estado mantenido. Ese error generó una **familia de AQ-fantasma** ("autoría de la brecha") que pregunta "¿quién la crea?" — una pregunta mal planteada.

**Evidencia en el canon.** ARQUITECTURA-COGNITIVA:
- §3 acto 2 (COMPRENDER): *"el acto que mantiene la sustancia... actualizar estado, relaciones causales, **brecha** y trayectoria... su producto no es una salida sino un mejor entendimiento."*
- §1: *"...localiza la brecha..."* (localiza, no crea).
- §2c: *"El referente **convierte una observación en una brecha. Sin referente no hay brecha.**"*
La brecha es la **distancia estado-vs-referente**: existe en cuanto coexisten un estado y un referente normativo. **No hay acto que la "cree por primera vez"; emerge, y COMPRENDER la localiza al mantener el Modelo.**

**Corrección (transversal).** Sustituir, en toda la ingeniería, el marco **crear/génesis/autoría/emitir** por **emerger/localizar/mantener**. La autoridad cognitiva pertenece al **acto COMPRENDER** (implementado por C2/OSE), **nunca** a un componente-como-infraestructura, ni al binding adapter, ni a la persistencia.

**Impacto.** Se disuelve la familia de AQ-fantasma (ver §AQ que desaparecen). La implementación futura del Slice 01 deja de ser "génesis de brecha" y pasa a ser "**materialización delgada de COMPRENDER**: mantener el estado contra la norma → la brecha emerge → se persiste".

---

## El sello de la deriva — ⚠️ REQUIERE DECISIÓN DEL FOUNDER (toca el canon)

La mala lectura **entró por una frase del canon-OSE**, no por la ingeniería de C1–C5:
- `OPERATIONAL-STATE-ENGINE.md` §4.1 A4 paso 2: *"Recomputar el lado observado de la `brecha` (D) **ya existente**... El OSE **NO crea, NO genera, NO prioriza ni explica brechas**."*
- La ingeniería (C1 `AQ-AUTORIA-BRECHA`, C2 `AQ-OSE-AUTORIA-BRECHA`) **leyó** "NO crea / ya existente" como **"otro acto debe crearla primero"** → vacío de autoría.
- Pero ARQUITECTURA (fuente de verdad, que el propio OSE cita) dice que COMPRENDER **localiza/mantiene** la brecha. Leída correctamente, *"NO crea / ya existente"* significa **"la brecha no se autoriza; emerge — el OSE mantiene el estado y la distancia (brecha) se recomputa"**, que es exactamente la reformulación ratificada.

**Dos lecturas posibles — la decisión es tuya (no modifico el canon):**
- **(A)** El OSE-doc **ya es consistente** si "NO crea" se lee como "no autoriza; emerge". No se toca el canon; solo se corrige la **mala lectura** en la ingeniería. *(Recomendada — preserva el canon intacto y localiza toda la deriva en la ingeniería.)*
- **(B)** El OSE-doc necesita una **nota aclaratoria de una línea** (decisión de canon, tuya) para que "NO crea" no se vuelva a malinterpretar como vacío de autoría.

Hasta tu decisión, **no toco `OPERATIONAL-STATE-ENGINE.md` ni `SYSTEM_DECISIONS.md`**.

---

## Registro por componente

| # | Deriva detectada | Evidencia en el canon | Corrección mínima (sin reescribir) | Impacto |
|---|---|---|---|---|
| **C1 MOV** · *DERIVA MENOR* | `AQ-AUTORIA-BRECHA`: *"el canon NO nombra qué acto CREA la brecha... creación sin dueño"*. Partición "lado observado mutable" + verbo `updateGapObservedSide`. | COMPRENDER "localiza"; §2c "sin referente no hay brecha". **C1 ya tiene la condición de emergencia: `MOV.I-6` rechaza brecha sin referente.** | Reescribir `AQ-AUTORIA-BRECHA` → nota de cierre (emergente, sin autor). Renombrar `updateGapObservedSide`→`recomputeGapDistance`; aclarar que `integrar(D3)` **persiste** la distancia localizada, no la crea cognitivamente. | La AQ-fantasma se cierra. El esquema queda fiel (ya lo era en `MOV.I-6`). |
| **C2 OSE** · *DERIVA MENOR* | §3 L61 / §10.2 L492: *"No crea la brecha por primera vez... el OSE NO la crea → AQ-OSE-AUTORIA-BRECHA"*. Heredado del canon-OSE, no fabricado por C2. | ARQUITECTURA §3 acto 2 (COMPRENDER mantiene la brecha) + el propio OSE-doc §1.1 (*"el OSE es exactamente PERCIBIR + COMPRENDER"*). | Reformular L61/L492: el OSE, **como implementación de COMPRENDER, localiza la brecha emergente** al mantener estado-vs-referente; lo que NO hace es **explicarla** (DIAGNOSTICAR) ni **priorizarla** (ATENDER). **Acotar `OSE.INV-9`**: conserva "nunca escribe C / nunca `episodio` / nunca lee vencimiento como veredicto" (corte con RECONCILIAR, intacto); elimina solo "NUNCA crear [la brecha]". | Cierra `AQ-OSE-AUTORIA-BRECHA`. Queda un delta real: el puerto de escritura del lado observado D (hoy `NormativeRepository` no lo expone) → `AQ-OSE-PUERTOS-C1-FALTANTES` (ya existe, vacío real, NO fantasma). |
| **C3 ATENDER** · *ALINEADO* | Vocabulario: "candidato de foco" para la `perturbacion` roza "evento recibido". | "Modelo rico en brechas" (cita verbatim); la brecha se **consulta** vía `listGaps`. | 3 aclaraciones de una línea: ambos orígenes son **filas vigentes del MOV consultadas**, no payloads recibidos. | Ninguna AQ es fantasma. Referencia de fidelidad. |
| **C4 DIAGNOSTICAR** · *ALINEADO* | Ninguna. (Segundo meta-hallazgo candidato: NO se confirma.) | §3 acto 4: *"trazando... **distinguida** de síntoma y de restricción"* (consulta, no asignación). C4: *"clasificación de LECTURA... no escribe la clasificación en el grafo"*. | Opcional cosmético: frase de propósito L57 "distinguiéndolas"→"clasificándolas (lectura)". | COMPRENDER **mantiene** la clasificación; DIAGNOSTICAR la **consulta**. Tensión canónica resuelta correctamente. |
| **C5 JUZGAR** · *ALINEADO* | Ninguna. Su frase "primer escritor de sustancia tras el OSE" **depende** de que C2/OSE abarque el mantenimiento de COMPRENDER. | §3 acto 5 (*"consulta deliberativa sobre la sustancia"*); G7/G8 escriben E3/A2/B3. | Ninguna (se valida sola al corregir C2). | Consume la sustancia mantenida; escribe su decisión. Fiel. |
| **BRECHA_GENESIS_CONTRACT** · *DERIVA MAYOR (§3)* | §3: *"Autoridad única: el OSE (C2)... Ningún otro acto crea brechas"* — reubica autoridad en el componente y usa lenguaje "crear". | Autoridad = acto COMPRENDER; brecha **emergente**; infra sin autoridad cognitiva. | Reformular §3: *"La brecha es propiedad emergente del estado que mantiene COMPRENDER (acto 2, implementado por C2/OSE). El binding adapter entrega evidencia y la persistencia registra — ninguno tiene autoridad cognitiva. El disparo es exógeno (Freno 1)."* El título "génesis" se lee como **emergencia**, no creación. | El núcleo conductual (Q1–Q6: señal/condiciones/evidencia/invariantes) queda intacto y fiel — describe la brecha como estado-vs-referente, que **es** la propiedad emergente. |
| **SLICE_01** · *DERIVA MENOR (lenguaje)* | "conducta de génesis / crea la brecha". | Misma reforma. | Reencuadrar: "**materialización delgada de COMPRENDER**: mantener estado contra norma → la brecha emerge → persistir en el sustrato de ejecución". (La autoridad ya se corrigió del binding adapter hacia COMPRENDER.) | Técnicamente intacto (lee timing=evidencia → compara vs norma=comprensión → persiste). Solo cambia el marco. |

---

## La familia de AQ-fantasma que se disuelve (mal planteadas desde una interpretación incorrecta)

| AQ | Por qué desaparece |
|---|---|
| `AQ-SYS-001` (Autoría de la brecha) | La brecha emerge; no hay "autor". Se sostenía citando `OSE.INV-9` como única evidencia — **circular**. (Hoy figura `RESOLVED BY CONTRACT`, pero por la razón correcta: emergencia, no "el OSE crea".) |
| `AQ-AUTORIA-BRECHA` (C1) | El propio esquema de C1 (`MOV.I-6`) ya codifica la condición de emergencia (estado + referente). La pregunta "¿quién la crea?" se contradice con su propio modelo. |
| `AQ-OSE-AUTORIA-BRECHA` (C2) | El OSE, como COMPRENDER, localiza la brecha al mantener el estado. No hay creación externa que falte asignar. |

**AQ que NO se tocan (vacíos reales, no fantasma):** `AQ-SYS-002` (población del grafo causal — familia C, el *porqué*, distinto e independiente), `AQ-OSE-PUERTOS-C1-FALTANTES` (delta real de puerto: escribir el lado observado D), `AQ-DIAG-*` de C4 (vacíos reales heredados de C1), `AQ-ATENDER-DISPARO`/`AQ-OSE-RELOJ-MUNDO` (qué enciende el acto — Freno 1). Disciplina: solo se disuelve lo que el canon ya respondía.

---

## Criterio de sincronización

La arquitectura y la ingeniería vuelven a estar sincronizadas cuando: (1) tú decides el §Sello (A o B); (2) se aplican las correcciones mínimas de la tabla a los specs de ingeniería; (3) no quedan más derivas conceptuales relevantes. **Solo entonces** se retoma la implementación del Slice 01 — que será, por construcción, *"una traducción del canon, no una reinterpretación del canon"*.
