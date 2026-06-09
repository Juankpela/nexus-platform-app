# ADR-014 — Technicians Module (Field Service workforce)

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** Sprint 2
- **Supersedes / relates:** Work Orders (Group 11), Assets (Group 11)

## Context

Field Service necesita una entidad de **fuerza de trabajo** (técnicos) como base para
Work Order Assignment, Scheduling, Dispatch y Route Optimization. Hasta ahora, la
asignación de Work Orders usaba `auth.users` (miembros del tenant) como proxy de técnico.
Eso no escala: un técnico tiene atributos propios (employee_id, skills, certificaciones,
territorios, estado laboral) que no pertenecen a la identidad de autenticación.

## Decision

Crear el módulo `technicians` dentro del bounded context `service`, siguiendo la
arquitectura hexagonal existente (domain → application/ports → use-cases →
infrastructure → composition → presentation).

Decisiones de diseño clave:

1. **Técnico ≠ usuario auth.** `technicians` es un registro de workforce por tenant,
   independiente de `auth.users`. Una migración futura podrá añadir
   `technicians.user_id → auth.users` para login móvil sin romper nada.
2. **Soft delete obligatorio.** Nunca se borra físicamente; `deleted_at` preserva el
   historial para Work Orders ya asignadas. La desactivación además fija `status='inactive'`.
3. **Unicidad scoped a tenant y a registros vivos.** Índices únicos parciales
   `(tenant_id, lower(email)) WHERE deleted_at IS NULL` y
   `(tenant_id, employee_id) WHERE deleted_at IS NULL` — permiten reutilizar email/ID
   de un técnico desactivado, y validan en el motor (no solo en la app).
4. **Reglas en el dominio + defensa en DB.** Los use-cases validan unicidad
   (`findByEmail`/`findByEmployeeId`) para dar errores legibles; el índice único es el
   backstop ante carreras de concurrencia.
5. **Readiness para Field Service.** `unique (id, tenant_id)` habilita FKs compuestas
   tenant-safe desde futuras tablas `technician_skills`, `technician_certifications`,
   `technician_territories` y la relación con `work_orders`.
6. **Namespace de permisos `service.technicians.*`** consistente con el resto de la
   vertical de operaciones.

## Consequences

**Positivas**
- Base sólida y escalable para asignación, agenda y dispatch.
- Aislamiento multi-tenant garantizado por RLS + índices únicos por tenant.
- Soft delete mantiene integridad referencial histórica.
- 6 use-case tests nuevos; CI sigue verde (tsc + lint + test).

**Negativas / deuda aceptada**
- La asignación de Work Orders sigue usando `auth.users` por ahora; un sprint futuro
  migrará `work_orders.assigned_technician_id` para referenciar `technicians`
  (o se añadirá `technician_id` adicional). No se refactoriza aún para no romper datos.
- Skills/Certifications/Territories quedan como secciones "preparadas" en la UI
  (placeholders), no implementadas — por alcance del sprint.

## Database

```sql
type technician_status = ('active','inactive','on_leave')

table technicians (
  id, tenant_id, first_name, last_name, email, phone, employee_id,
  status, created_at, updated_at, deleted_at,
  unique (id, tenant_id)
)
-- partial unique: (tenant_id, lower(email)) WHERE deleted_at IS NULL
-- partial unique: (tenant_id, employee_id)  WHERE deleted_at IS NULL AND employee_id IS NOT NULL
-- indexes: (tenant_id, status), (tenant_id, last_name, first_name)  WHERE deleted_at IS NULL
-- RLS: select/insert/update gated by has_tenant_permission(service.technicians.*)
```

## Auditoría
`technician.created`, `technician.updated`, `technician.deactivated`.

## Permisos
- `service.technicians.read` — tenant_admin, supervisor, sales_representative, technician
- `service.technicians.write` — tenant_admin, supervisor
