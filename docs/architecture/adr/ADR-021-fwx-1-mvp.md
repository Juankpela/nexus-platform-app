# ADR-021 — FWX-1 (Field Worker Experience MVP)

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** FWX-1
- **Implementa:** Fase 1 de FIELD-WORKER-EXPERIENCE.md sobre el dominio de ADR-020,
  respetando la auditoría de autorización.

## Context

NEXUS planifica el trabajo (Work Orders → Assignments → Dispatch → Calendar) pero
no lo **ejecuta** en campo. FWX-1 entrega la experiencia móvil mínima del técnico
para **validar el dominio Execution** antes de añadir complejidad.

## Decision

Crear el área `/app/[tenantSlug]/worker` (shell móvil propio) y el agregado
**Execution** (ADR-020), con permisos granulares y *least privilege*.

### Por qué se EXCLUYEN offline / fotos / GPS / firma / push (alcance)
- El riesgo de FWX no está en la cámara o el service worker; está en **el modelo de
  estados y los límites de permiso**. Si el ciclo `pending→accepted→on_site→working→
  completed|unable_to_complete` y el record-scope no son correctos, agregar offline/
  fotos encima solo **amplifica** el error y lo hace más caro de corregir.
- Validar primero el dominio con transiciones reales end-to-end nos da una base firme.
  Offline (IndexedDB+outbox), evidencia (fotos/firma) y geo se construyen en FWX-2/3
  **sobre** un agregado ya probado, sin retrabajo conceptual.
- Mantiene el sprint pequeño, testeable y de bajo riesgo (CI verde).

### Cómo valida el dominio
- Implementa Execution como agregado independiente con su propio estado y
  **transiciones guardadas** (`canTransition`), probadas con tests de transición
  válida/ inválida y de arranque (`accept` crea la ejecución).
- Conexión por **eventos de dominio** (ADR-020): cada transición emite el evento
  (`assignment_accepted`, `technician_arrived`, `work_started`, `work_completed`,
  `execution_failed`) — hoy registrado en el **audit trail** como punto de emisión;
  cuando exista el Event Bus, son sus topics sin cambios.
- **No** toca Work Order ni Scheduling salvo por reacción futura (policies) — el
  técnico solo muta Execution.

### Seguridad (cierra hallazgos de la auditoría de autorización)
- **Permisos nuevos:** `service.field.read`, `service.field.execute`.
- **Least privilege:** se **elimina** `service.work_orders.write` del rol `technician`
  (ya no administra órdenes; solo ejecuta).
- **Record-level scope:** `technicians.user_id` mapea el usuario autenticado a su
  técnico; RLS sobre `work_order_executions` restringe lectura/escritura a
  *self* (técnico asignado) + una política de **oversight** (supervisor/admin con
  `work_orders.read`) para lectura.
- **Defensa en profundidad:** la UI worker solo muestra acciones de ejecución; la
  Server Action revalida permiso + propiedad de la asignación; la RLS bloquea a
  nivel de fila. Tenant isolation intacto (FKs compuestas + RLS).
- El técnico **no puede** crear/cancelar/editar WOs ni ver trabajo ajeno.

### Experiencia (mobile-first, no reusa back-office)
- `WorkspaceChrome` se aparta en `/worker`; `WorkerShell` provee top-bar + bottom-nav
  (Inicio / Mi agenda / Perfil) optimizado para teléfono.
- Pantallas: Home (resumen del día + próxima parada), Mi agenda, Detalle de
  asignación (con acciones), Perfil. Acción primaria grande por estado.

## Cómo prepara FWX-2

- El agregado Execution ya tiene timestamps (`accepted/arrived/started/completed_at`)
  → base directa de "time on site / travel" (reporting).
- Los puntos de emisión de eventos están listos para que Notifications/Event Bus se
  enganchen sin tocar la lógica de ejecución.
- Las pantallas de detalle son el lugar natural para **fotos** (antes/después) y
  **firma**; el cierre (`completed`) ya es el gate donde esas obligatoriedades
  encajarán.
- El record-scope (`technicians.user_id` + RLS) ya soporta el modo offline:
  sincronizar "mis asignaciones" es exactamente lo que la PWA descargará.

## Consequences

**Positivas**
- Flujo end-to-end real: aceptar → llegar → iniciar → completar / no completar.
- Dominio Execution validado con 64 tests verdes (incl. transiciones).
- Seguridad mejorada: technician pasa a least-privilege; scope por registro.

**Negativas / deuda aceptada**
- Requiere `technicians.user_id` poblado para que un técnico vea su trabajo
  (operación: vincular usuario↔técnico). Sin vínculo → estado "no vinculado".
- Sin offline/fotos/firma/geo (por diseño; FWX-2/3).
- `assignment_status` aún conserva `in_progress`/`completed` (deuda de ADR-020 a
  deprecar como espejo derivado).

## Permisos
- `service.field.read` — technician, supervisor, tenant_admin.
- `service.field.execute` — technician, supervisor, tenant_admin.
- **Removido:** `service.work_orders.write` del rol `technician`.
