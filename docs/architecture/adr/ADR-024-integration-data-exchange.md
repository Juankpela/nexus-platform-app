# ADR-024 — Integration & Data Exchange

- **Status:** Accepted (design) · Not yet implemented
- **Date:** 2026-06-10
- **Initiative:** INT-1 (Foundation) · precede a INT-2 (Enterprise APIs), INT-3 (Webhooks & Ecosystem)
- **Relates to:** ADR-020/021/022 (event emission points), ADR-023 (Inventory invariants)

## Context

Nexus tiene lógica server-side sólida (hexagonal, RLS, audit) pero está **cerrada a
integración máquina-a-máquina**. Auditoría (código real):
- **API:** un solo route handler, bajo `/app/[tenantSlug]/api/...`, auth por **sesión**
  (`getRequestContext`) + `requirePermission`. Sin API pública, sin API keys, sin
  versionado, sin rate limiting.
- **Import/Export:** existe solo el patrón CSV de Products (`import-products` use-case
  + componentes) — semilla reutilizable.
- **Reutilizable:** use-cases hexagonales, `has_tenant_permission`+RLS, `audit.append`,
  `request-context`, FKs compuestas, edge `proxy.ts`, RPCs atómicas, `count:"estimated"`.
- **Faltante:** identidad no-humana, API pública versionada, motor genérico
  import/export, rate limiting, webhooks, gobernanza de contratos, change tracking.

## Decision

Crear una capacidad transversal **`modules/integrations`** (hexagonal) que **reutiliza**
los activos existentes y **no duplica** ni rompe la arquitectura.

### Cambios obligatorios (condiciones del APPROVE WITH CHANGES)
1. **API pública separada y versionada** (`/api/v1`) con **identidad de máquina (API
   keys)** — **nunca** extender la API de sesión de la UI.
2. **Escrituras de integración solo vía use-cases/RPCs del dominio** — jamás tablas
   directo (preserva invariantes, especialmente Inventory).
3. **Jobs asíncronos + streaming** para import/export masivo (evita timeout/memoria
   serverless); URLs firmadas con TTL.
4. **Webhooks vía outbox transaccional**, reutilizando los puntos de emisión de eventos
   ya presentes (FWX/Inventory emiten a `audit`).
5. **Keyset pagination + cursores incrementales + tombstones** desde el día uno de la
   API de salida (offset no escala).

### Objetos prioritarios
- **Tier 1:** Accounts, Contacts, Products, Materials, Inventory (stock+transactions),
  Work Orders, Assets.
- **Tier 2:** Cases, Scheduling/Assignments, Quotes, Price Books, Opportunities.
- **Tier 3:** Field Executions, Technicians, Audit (export), Forecasting, Users/RBAC
  (export-only, restringido).

### Diseño hexagonal (`modules/integrations`)
- `domain/` ApiKey, Scope, ImportJob/Row, ExportRequest, IntegrationEvent, ExternalRef.
- `application/ports/` ApiKeyRepository, ImportJobRepository, ExportPort,
  ExternalRefRepository, RateLimiter, (futuro) OutboxRepository/WebhookSubscriptionRepository.
- `application/use-cases/` issueApiKey, revokeApiKey, resolveIntegrationContext,
  runImportJob, buildExport, (futuro) dispatchWebhook.
- `infrastructure/` Supabase repos, Csv/Xlsx exporters, RateLimiter.
- `presentation/` `/api/v1/*` (auth API key) + acciones de export in-app.
- **Boundary:** `integrations` depende de los use-cases de CRM/Service/Inventory;
  nadie depende de `integrations`.

### Seguridad
API keys hasheadas, scopes = subconjunto de permisos RBAC, rotación sin downtime,
revocación; el contexto se deriva de la key → mismas `effectivePermissions` + RLS;
allowlist de columnas en export; audit con `actorType:"service"`; rate-limit por
key/tenant; OAuth2 client-credentials preparado para INT-3.

### Gobernanza
Versionado `/v1`; evolución solo aditiva; breaking → `/v2`; deprecación con header
`Sunset` + ventana; contract tests; registro de consumidores; SLA por plan.

## Roadmap
- **INT-1 Foundation:** módulo skeleton + motor genérico export (CSV+XLSX, streaming,
  allowlist, RLS, audit) e import (staging + idempotencia + upsert por `external_id` +
  errores por fila) **in-app** (auth de sesión), Tier-1. Sin API pública/keys aún.
  Depende de INV-1 cerrado. Esfuerzo: Medio.
- **INT-2 Enterprise APIs:** `/api/v1` + API keys + inbound bulk/incremental + outbound
  resources (keyset/filtros/cursores) + rate limiting + idempotencia + gobernanza.
  Esfuerzo: Alto.
- **INT-3 Webhooks & Ecosystem:** outbox + dispatcher (retry/backoff/DLQ/HMAC) +
  subscripciones + OAuth2 + marketplace. Esfuerzo: Alto.

## ExportDataSource Architectural Constraint (INT-1, binding)

**Constraint:** every `ExportDataSource` MUST obtain its rows by delegating to an
existing **read use-case** of the owning module (via that module's `composition`).
An `ExportDataSource` MUST NOT:
- query Supabase / any table directly,
- use the service-role client,
- bypass RLS, or
- re-implement filtering/tenant-scoping that a module read already provides.

**Why:** the export layer is a *consumer*, not an owner, of data. Routing every
export read through the module's read use-case guarantees (1) **tenant isolation**
and **RLS** are inherited unchanged, (2) **column/permission semantics** stay
consistent with the rest of the app, and (3) `integrations` never couples to another
module's schema — only to its application boundary. This keeps the dependency arrow
one-way (`integrations → {inventory, crm, service}`; never the reverse) and prevents
the export surface from becoming a second, divergent data-access path.

**Enforcement:** the three Sprint B data sources comply
(`materialsFetch → searchInventoryMaterials`, `accountsFetch → listTenantCompanies`,
`contactsFetch → listTenantContacts`). Any new exportable object (Tier 2/3) MUST add
a read use-case in its module first, then a thin `ExportDataSource` that calls it.
Columns are declared only in the **centralized Column Registry** — never inline in a
data source or renderer.

## Consequences
**Positivas:** habilita ERP/CRM/partners a escala enterprise reutilizando lo probado;
aislamiento y auditoría preservados; evoluciones aditivas y acotadas.
**Deuda aceptada:** doble superficie API (UI sesión vs `/api/v1` máquina) — mitigada por
separación namespace/identidad; outbox/particionado pendientes para escala (INT-3 / ops).

## Scope note
Diseño aprobado; **implementación NO iniciada**. El foco operativo permanece en cerrar
**Inventory INV-1 (Sprint D → QA #2)** antes de comenzar INT-1.
