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

## INT-1 Sprint C — Async Export (approved design + worker exception)

Async exports (Tier 2: Work Orders, Inventory Transactions) run outside the user's
request via an `export_jobs` queue drained by a Vercel Cron worker, uploading to a
private Supabase Storage bucket and served through short-TTL signed URLs.

### Worker exception to the ExportDataSource constraint (condition #1)
The ExportDataSource constraint above mandates RLS-scoped, session reads. The async
worker has **no user session**, so a bounded, explicit exception applies:
- The worker runs with the **service role** (RLS bypassed) **only** inside the export
  worker path.
- It MUST filter every read by the **`tenant_id` of the job** — never unscoped.
- The job's `tenant_id`/object permission are **validated at enqueue time** against
  the requesting user (`has_tenant_permission` / `requirePermission`); the worker
  trusts the already-authorized job.
- Every processed job is **audited** (`export.completed` / `export.failed`).
This mirrors the Inventory `SECURITY DEFINER` RPC pattern (elevated privilege +
mandatory explicit tenant filter). The synchronous (Sprint B) path is unchanged and
remains session/RLS-scoped. Tenant isolation is preserved by the mandatory filter +
enqueue-time authorization, not by RLS, on this path only.

### `export_jobs` — lease & retry fields (condition #2)
Beyond the base columns, the table includes:
- **`lease_until timestamptz`** — a processing lease. The worker claims jobs with
  `FOR UPDATE SKIP LOCKED` and sets `lease_until = now() + interval`; a job whose
  lease expires while still `processing` is reclaimable (crash recovery).
- **`attempt_count int not null default 0`** — incremented per claim; a job exceeding
  the max attempts is marked `failed` (no infinite retries).
- **`last_error text`** — the most recent failure message for monitoring/diagnosis.

### Snapshot semantics — "processing-time snapshot" (condition #3)
An async export reflects the data **as of the moment the worker processes it**, NOT
as of enqueue time. Filters are captured at enqueue; the actual rows are read when the
worker runs. Consequence: data may change between request and generation, and the file
is a **processing-time snapshot** (not transactional/point-in-time-of-request). This is
documented to consumers (the monitoring UI shows `completed_at` as the snapshot
instant). Acceptable for reporting/extraction; not a consistent cross-object snapshot.

### Permissions (condition #4)
**No new `integrations.exports.read` permission.** Enqueue, monitoring visibility, and
signed-URL download all **reuse the per-object read permission** (e.g.
`service.work_orders.read`, `inventory.stock.read`) plus ownership
(`requested_by = auth.uid()`) or an oversight role. The Cron worker authenticates via a
`CRON_SECRET` header (not a tenant permission).

## Consequences
**Positivas:** habilita ERP/CRM/partners a escala enterprise reutilizando lo probado;
aislamiento y auditoría preservados; evoluciones aditivas y acotadas.
**Deuda aceptada:** doble superficie API (UI sesión vs `/api/v1` máquina) — mitigada por
separación namespace/identidad; outbox/particionado pendientes para escala (INT-3 / ops).

## Scope note
Diseño aprobado; **implementación NO iniciada**. El foco operativo permanece en cerrar
**Inventory INV-1 (Sprint D → QA #2)** antes de comenzar INT-1.
