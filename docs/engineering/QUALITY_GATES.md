# QUALITY GATES — Política oficial del Motor Cognitivo

> **Naturaleza.** Política **obligatoria** del proyecto. Todo componente futuro del Motor (C5 JUZGAR, C6 ARTICULAR, C7 RECONCILIAR, y cualquier re-trabajo) debe pasar **exactamente** por estos 9 gates, **en orden**. Un gate no se da por superado si su condición de bloqueo está activa. Estos gates codifican la disciplina ya aplicada de facto a C1–C4 (arquitectura congelada · ingeniería iterativa · falsación primero · persistencia versionada). Fecha: 2026-06-29.

## Principios que gobiernan todos los gates
1. La arquitectura (canon) permanece **CONGELADA**; ningún gate la modifica.
2. Ningún componente modifica componentes **congelados** (salvo corrección mecánica de trazabilidad/citas/inconsistencias previamente aprobada).
3. Ninguna Architectural Question se resuelve por **intuición**; lo no respondido por el canon se **registra**, no se inventa.
4. Toda decisión **transversal** pertenece a `docs/architecture/SYSTEM_DECISIONS.md`, no al componente.
5. Toda salida verificable se ancla al canon **por nombre** (sección/puerto/tipo/invariante), nunca por número de línea (`AQ-SYS-015`).

---

## Gate 1 — Architecture Compliance
- **Propósito:** confirmar que el componente respeta la arquitectura congelada — un solo acto/responsabilidad, su lugar en la cadena del Motor, sus gates del MOTOR, y que **no introduce conceptos nuevos**.
- **Criterios de entrada:** el componente anterior está CERRADO; existe `C{n}_PREPARATION.md` con la frontera auditada.
- **Criterios de salida:** responsabilidad única declarada; gates del MOTOR asignados; frontera dura (qué NO hace) escrita como prohibiciones verificables; cero conceptos/actos/tipos nuevos fuera del canon.
- **Condición de bloqueo:** el componente introduce un concepto nuevo, asume una responsabilidad de otro acto, o redefine el canon.

## Gate 2 — Interface Compliance
- **Propósito:** verificar que el componente **reusa** los puertos/tipos existentes (de C1 y de componentes anteriores) y solo añade puertos de SOLO LECTURA para su cuantificación calibrable.
- **Criterios de entrada:** Gate 1 superado; inventario de interfaces disponibles (ver `ARCHITECTURE_MILESTONE_REVIEW.md` §3).
- **Criterios de salida:** cada puerto consumido existe con la firma citada; las dependencias (`*Deps`) excluyen por construcción (`Pick<…>`) toda capacidad fuera de su frontera; los acoplamientos entre actos se justifican o se elevan a `SYSTEM_DECISIONS.md`.
- **Condición de bloqueo:** se inventa un puerto/método que no existe; se inyecta una capacidad prohibida (p. ej. una escritura o un recorrido que viola la frontera).

## Gate 3 — Canon Traceability
- **Propósito:** garantizar que cada claim, invariante y decisión del componente traza al canon **por nombre verificado**.
- **Criterios de entrada:** Gates 1–2 superados.
- **Criterios de salida:** tabla de trazabilidad completa (elemento → ancla canónica por §/puerto/tipo/invariante); cero citas por número de línea entre componentes (`AQ-SYS-015`).
- **Condición de bloqueo:** una cita no resuelve al canon, o usa número de línea para una referencia entre componentes.

## Gate 4 — Engineering Validation
- **Propósito:** demostrar que el componente es **implementable** en el stack real (hexagonal, Supabase/TS) sin resolver vacíos por intuición.
- **Criterios de entrada:** Gates 1–3 superados.
- **Criterios de salida:** tipos de dominio, contratos de entrada/salida, errores, pseudocódigo y pruebas unitarias presentes; todo vacío del canon registrado como AQ (enlazado a `SYSTEM_DECISIONS.md` si es transversal); ningún número de control (umbral/peso/profundidad) en el dominio.
- **Condición de bloqueo:** el pseudocódigo asume una resolución de AQ no marcada como placeholder; hay un número mágico de control en el dominio.

## Gate 5 — Falsification Gate
- **Propósito:** intentar **destruir** el componente con igual esfuerzo que el de construirlo (refutadores independientes vs canon + componentes anteriores + código real).
- **Criterios de entrada:** Gates 1–4 superados.
- **Criterios de salida:** veredicto registrado `SURVIVED` (o `SURVIVED tras targeted rework`) en el propio doc; cada claim clasificado `SURVIVED` / `NEEDS_ADJUSTMENT` / `REFUTED`; 0 APIs inventadas, 0 conceptos nuevos, 0 invariantes rotos, 0 problemas estructurales; los `NEEDS_ADJUSTMENT` corregidos.
- **Condición de bloqueo:** veredicto `REFUTED` estructural, o un claim de lógica refutado sin corregir, o un API inventado.

## Gate 6 — Repository Persistence
- **Propósito:** asegurar que ningún avance vive solo en la conversación.
- **Criterios de entrada:** Gate 5 superado (o documento intermedio terminado).
- **Criterios de salida:** el documento está escrito en disco y **committeado en Git local** con mensaje descriptivo.
- **Condición de bloqueo:** hay cambios sin commit, riesgo de pérdida de trabajo, o el repo local queda inconsistente. *(Git local = fuente de verdad operativa, `AQ-SYS-016`.)*

## Gate 7 — Freeze
- **Propósito:** declarar el componente CERRADO/FROZEN con su ficha de cierre.
- **Criterios de entrada:** Gates 1–6 superados.
- **Criterios de salida:** ficha de cierre al inicio del doc (Estado · fecha · Falsification Gate · refutadores · claims · APIs inventadas=0 · invariantes rotos=0 · AQ abiertas · Ready for); veredicto de falsación registrado; las AQ abiertas siguen sin resolver pero no bloquean la spec.
- **Condición de bloqueo:** quedan `NEEDS_ADJUSTMENT` sin aplicar o claims refutados; la frontera con el siguiente acto no está auditada.

## Gate 8 — Dashboard Update
- **Propósito:** mantener `ENGINEERING_STATUS.md` como panel de control fiable.
- **Criterios de entrada:** Gate 7 superado.
- **Criterios de salida:** fila del componente → CERRADO con falsación/AQ/archivo; "siguiente componente autorizado" actualizado; conteos de AQ reales (verificados en disco, no de memoria); AQ transversales nuevas reflejadas en `SYSTEM_DECISIONS.md`.
- **Condición de bloqueo:** el dashboard contradice el estado real del repo.

## Gate 9 — Git Synchronization
- **Propósito:** sincronizar la **fuente de verdad compartida** (GitHub) en los puntos obligatorios.
- **Criterios de entrada:** Gates 6–8 superados; todo committeado en Git local.
- **Política de sincronización (`AQ-SYS-016`):** el push a GitHub es obligatorio **únicamente** antes de: (1) iniciar una nueva fase · (2) comenzar un nuevo componente · (3) cerrar un Milestone · (4) cualquier entrega externa · (5) abandonar una sesión. Entre esos puntos, el trabajo continúa sobre Git local si está committeado.
- **División de responsabilidades:** el **agente NO ejecuta el push** (GCM/auth interactiva fuera de su control); el agente **commitea, verifica consistencia local e informa los commits pendientes**. El **operador humano** ejecuta **un único `git push`** en el punto de sincronización.
- **Criterios de salida:** `git rev-parse HEAD` == `git rev-parse origin/main` (tras el push del operador).
- **Condición de bloqueo:** existe divergencia funcional entre ramas, conflicto de merge, o cambios sin commit. **Un fallo de autenticación del Git Credential Manager NO es condición de bloqueo arquitectónico** y NO detiene la producción de ingeniería mientras Git local sea consistente; solo retrasa la publicación remota hasta el push del operador.

---

## Tabla de cumplimiento por componente

| Componente | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 | G9 |
|---|---|---|---|---|---|---|---|---|---|
| C1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ pendiente push |
| C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ pendiente push |
| C3 | ✅ | ✅ | ✅ | ✅ | ✅ SURVIVED | ✅ | ✅ | ✅ | ⚠️ pendiente push |
| C4 | ✅ | ✅ | ✅ | ✅ | ✅ SURVIVED+rework | ✅ | ✅ | ✅ | ⚠️ pendiente push |
| C5 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

> "⚠️ pendiente push" = Git local committeado (Gate 6/7/8 ✅); el push a GitHub (Gate 9) está pendiente por el bloqueo de auth del GCM y se completará en el punto de sincronización del cierre de Milestone 1. No es un fallo de gate arquitectónico.
