# ADR-026 — Scheduling Source of Truth & Identity Boundaries

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Scheduling Engine (PR2 prep)
- **Relates:** ADR-014 (Technicians), ADR-015 (Scheduling Core), ADR-020/022 (Field Execution), Work Orders (Group 11)

## Context

El motor de scheduling (WO vencidas, auto-assign, reschedule) está por construirse
(PR2→PR5). Antes de automatizar nada, hay un conflicto de modelo que ADR-015 dejó
explícitamente diferido (ver ADR-015 §Negativas): **conviven dos representaciones
de "quién atiende una WO", y apuntan a espacios de identidad distintos.**

- `work_orders.assigned_technician_id` → **`auth.users.id`** (campo plano, legado).
  Hoy lo escribe la proyección de field-execution al aceptar una WO.
- `work_order_assignments.technician_id` → **`technicians.id`** (el agregado de
  scheduling, ADR-015).

Son IDs de tablas diferentes. Un join ingenuo entre ambos campos produce datos
corruptos **silenciosos** (no falla, simplemente no cruza). Si el auto-assignment
de PR5 o el analytics de scheduling eligen la fuente equivocada, el error es caro
y difícil de detectar. Esta decisión debe congelarse antes de PR2 porque condiciona
PR3 (skills/availability/zones se cuelgan de `technicians`), PR4 (elegibilidad),
PR5 (auto-assign) y todo el analytics/optimización futura.

## Decision

Se congela oficialmente:

1. **`work_order_assignments` es la ÚNICA fuente de verdad para scheduling.** Todo
   lo que sea "quién/cuándo/por cuánto" (asignación, disponibilidad, carga,
   elegibilidad, reagendamiento) se lee y se escribe sobre este agregado.

2. **`work_orders.assigned_technician_id` es legacy / projection-compatibility.** Se
   conserva como espejo derivado para UI y vistas existentes; **no es autoritativo**.
   Ningún código nuevo de scheduling lo lee para decidir, ni lo usa como join hacia
   `technicians`. A término, se deriva de la asignación primaria o se depreca.

3. **Scheduling NO depende de `auth.users`.** El dominio y los use-cases del motor
   operan exclusivamente sobre `technicians.id` (vía los reader ports de ADR-015).
   El puente `technicians.user_id → auth.users` pertenece a identity/field-execution,
   no al motor.

4. **Execution y Scheduling permanecen desacoplados** (ADR-020/022). Execution
   proyecta su sub-estado hacia macro-estados de WO/assignment, pero el motor no
   importa field-execution ni viceversa. La frontera sigue siendo `assignment_id`.

5. **El auto-assignment futuro (PR5) opera EXCLUSIVAMENTE sobre
   `work_order_assignments`** (create/reassign), reutilizando `findOverlapping` y las
   reglas de ADR-015. Nunca escribe `assigned_technician_id` como acción primaria; si
   ese espejo se mantiene, se actualiza como efecto secundario derivado, no como
   decisión.

### Por qué esta dirección y no la inversa
- `technicians` es el agregado de negocio con atributos operativos (status, y a
  futuro skills/zones/availability). `auth.users` es identidad/autenticación, no
  un recurso de campo. Colgar scheduling de `auth.users` mezclaría capas.
- ADR-015 ya construyó el motor sobre `technicians.id` con FKs compuestas
  `(technician_id, tenant_id)`. Esta decisión solo formaliza lo ya construido y
  cierra la ambigüedad del campo legado.

## Consequences

**Positivas**
- Una sola autoridad para scheduling: PR3/PR4/PR5 y analytics tienen un origen
  inequívoco. Sin joins cross-identity.
- El motor no toca `auth.users`; capas limpias (scheduling ⟂ identity).
- No requiere migración ni cambio de datos ahora: es una decisión de contrato.

**Negativas / deuda aceptada**
- El espejo `assigned_technician_id` (user id) y `technician_id` (technician id)
  coexisten temporalmente; cualquier UI que muestre "técnico asignado" debe saber
  cuál usa. Se documenta, no se migra todavía (no romper UX/field-execution).
- Reportes legacy que lean `assigned_technician_id` quedan marcados como no
  autoritativos hasta su deprecación.

## Risks

- **Drift del espejo:** si la proyección de execution y las asignaciones divergen
  (p.ej. reasignación manual sin pasar por execution), `assigned_technician_id`
  puede quedar desactualizado. Mitigación: tratarlo siempre como derivado/best-effort,
  nunca como verdad; las pantallas de scheduling leen el agregado.
- **Join accidental cross-identity:** mismo riesgo que motiva el ADR. Mitigación:
  revisión de código en PR2+ y, a futuro, deprecar el campo para eliminar la
  tentación.
- **Una WO con varias asignaciones** (reasignación histórica): "el técnico asignado"
  debe definirse como la asignación activa más reciente (`scheduled`/`in_progress`),
  no como el campo plano. PR2+ debe usar esa definición.

## Migración futura esperada (no en este ADR)

1. Añadir un derivador: la asignación activa primaria define el "técnico actual" de
   la WO (vista o columna calculada), en `technicians.id`.
2. Backfill: poblar/normalizar a partir de `work_order_assignments` existentes.
3. Deprecar `work_orders.assigned_technician_id` (o redefinirlo como FK a
   `technicians` derivada), una vez UI y field-execution consuman el derivador.
4. Hasta entonces: **congelado** — el motor ignora el campo legado para decidir.
