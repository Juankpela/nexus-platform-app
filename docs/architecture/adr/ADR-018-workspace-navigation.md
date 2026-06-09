# ADR-018 — Workspace Navigation & Experience

- **Status:** Accepted · Implemented
- **Date:** 2026-06-09
- **Sprint:** Sprint 5.5
- **Scope:** Solo experiencia (navegación/layout/dashboards). Sin dominio, tablas,
  repositorios ni migraciones nuevas.

## Context

La navegación estaba organizada **por objeto** (Companies, Contacts, Cases,
Assets, Work Orders, Technicians, Schedule, Dispatch, Calendar…). A medida que
Nexus crece, una lista plana de objetos escala mal y no comunica que CRM, Service
y Field Service son **productos** dentro de la plataforma.

## Decision

Reorganizar la experiencia **por área de trabajo** (como Salesforce/ServiceNow/
HubSpot/Zendesk), sin tocar la lógica de negocio.

### Organización por dominios (IA)
El sidebar agrupa en orden canónico (`NAVIGATION_GROUP_ORDER`):
`Dashboard` → `CRM` → `Service` → `Field Service` → `Analytics` → `Administration`.
Los grupos son **colapsables**, con estado activo destacado (item y grupo) y
auto-expansión del grupo activo.

### Dashboards especializados
Se elimina el "dashboard único". Ahora:
- `/dashboard` — home ejecutivo + accesos rápidos a las áreas.
- `/dashboard/crm` — pipeline, conversión (reusa `getTenantRevenueMetrics`).
- `/dashboard/service` — casos/SLA/activos (reusa `getTenantCaseStats`).
- `/dashboard/field-service` — carga/utilización (reusa Dispatch + WO stats).
Todos **consumen composiciones existentes**; cero queries nuevas, cero lógica
duplicada.

### Breadcrumbs
Helper puro `buildBreadcrumbs(pathname, tenantSlug)` deriva la jerarquía de
producto desde un registro `segment → {label, group}` construido a partir de la
definición de navegación. Render en un componente cliente bajo el header. La
jerarquía (p.ej. `Inicio › Field Service › Work Orders › Detalle`) es **independiente
de la forma de la URL**.

### URLs agrupadas vía redirects (sin mover archivos)
Se introducen redirects (`next.config.ts`) que hacen que las URLs de producto
(`/app/:t/crm/...`, `/service/...`, `/field-service/...`) resuelvan a las rutas
planas actuales. **Decisión deliberada:** NO se mueven físicamente las ~15
carpetas de rutas en este sprint.

**Por qué:** mover carpetas obliga a reescribir cientos de `Link href`,
`revalidatePath` y `redirect()` en 6 módulos sobre un demo en vivo — alto riesgo,
nulo valor de dominio. La percepción de "productos" se logra con grupos +
breadcrumbs + dashboards. La canonicalización física de URLs queda como un
follow-up **mecánico y reversible**, ya habilitado por esta estructura
(el registro de segmentos y el orden de grupos ya existen).

## Escalabilidad futura (sin volver a rediseñar la navegación)

- **Notifications / Event Bus:** un grupo o badge por área ya tiene su lugar en el
  sidebar; los contadores de notificaciones se cuelgan de los items existentes.
- **AI Agents:** un "Agent" o "Copilot" entra como nuevo grupo/sección sin tocar
  los demás; el registro de navegación es declarativo.
- **Route Optimization:** vive dentro de `Field Service` junto a Dispatch/Calendar.
- **Billing / Marketplace:** entran como nuevos grupos (`Billing`,
  `Marketplace`) en `NAVIGATION_GROUP_ORDER` — una línea — sin reestructurar.
- **Nuevos productos** (p.ej. `Inventory`, `Projects`): se añaden como grupos
  nuevos; la IA por área absorbe crecimiento linealmente.

## Consequences

**Positivas**
- Experiencia enterprise por producto; navegación que escala por grupos.
- Dashboards por rol/área sin duplicar lógica.
- Breadcrumbs y estado activo consistentes; tests puros de IA (14 casos).
- Cero riesgo de dominio: no se tocó ninguna tabla/repo/use-case.

**Negativas / deuda aceptada**
- URLs canónicas siguen siendo planas; las agrupadas funcionan vía redirect
  (transición, 307). La canonicalización física es follow-up.
- Items inexistentes del brief (Leads, Teams, Roles) no se añaden para no generar
  404; Reports se incluye como placeholder real.

## Permisos
Sin cambios. Cada item de navegación y cada dashboard se filtran por el permiso
existente del área (`crm.*`, `service.*`, `forecasting.read`, `tenant.*`).
