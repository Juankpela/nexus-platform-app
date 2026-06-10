# ADR-025 — Public API (INT-2)

- **Status:** Accepted (design) · Not yet implemented
- **Date:** 2026-06-10
- **Initiative:** INT-2 — Public APIs
- **Relates to:** [ADR-024 Integration & Data Exchange](ADR-024-integration-data-exchange.md)
  (extends its INT-2 section and its service-role "worker exception" to the public API path)

## Context

NEXUS needs an official, secure public API so external systems (Salesforce,
Agentforce, ERPs, customer portals, mobile apps, Power BI) can consume tenant data.
This ADR freezes the architectural contract of INT-2 **before any implementation**,
so the API is built as a real enterprise public API — not a thin HTTP layer over the
app. 16 decisions are frozen below. v1 is **read-only**.

## Frozen decisions

### A. Approved foundations (6)
1. **Auth v1 = API Keys per tenant.** Forward-compatible to OAuth client-credentials
   (future); the key/client maps to the same scope model.
2. **Data access = service-role + explicit `tenant_id` filter + scope check at the
   boundary**, reusing existing READ use-cases (no business logic in the API; no
   direct Supabase/table access). Formal extension of ADR-024's worker exception:
   tenant isolation on this path is guaranteed by the mandatory explicit filter +
   key-derived scope, not by session RLS (RLS still governs the UI path).
3. **Dedicated `modules/api`** presentation module. One-way dependency
   `api → {crm, inventory, service}` via their use-cases; nobody depends on `api`.
4. **v1 is read-only** (GET). Mutations are a later initiative.
5. **Keyset/cursor pagination** on the public API (`limit`+`cursor`, order by
   `(updated_at, id)`); never offset. Differs deliberately from the internal UI's offset.
6. **OpenAPI 3.1** is the published contract (served + versioned).

### B. Frozen constraints (7)
7. **API scopes independent of RBAC.** Own curated catalog `<resource>:<action>`; RBAC
   changes never alter the API surface. v1 catalog (read-only):
   `materials:read`, `inventory:read`, `companies:read`, `contacts:read`,
   `work_orders:read`. Additive only. The endpoint declares its required scope; the
   scope — not an RBAC permission — is the contract.
8. **Key rotation strategy.** `api_keys(id, tenant_id, prefix, key_hash, label,
   scopes[], status, created_at, expires_at?, last_used_at, rotated_from?)`. Hash at
   rest; secret revealed once. Overlap rotation (create → migrate → revoke); N active
   keys per tenant; immediate revocation (checked every request); optional expiry.
9. **Versioning / deprecation.** Major version in path (`/api/v1`); additive-only
   within a version (never remove/rename a field — mark `deprecated` in OpenAPI);
   breaking → `/v2`. Deprecation via `Deprecation` + `Sunset` headers + ≥6-month
   window + consumer-registry notice.
10. **Public IDs = internal UUIDs** (non-enumerable, non-sequential, no PII). URLs use
    the UUID. Never expose `tenant_id` or correlative numbers. FKs in payloads are
    UUIDs. Forward-compat: prefixed handles (`mat_<uuid>`) may be accepted later
    without breaking.
11. **Idempotency contract (future writes).** v1 GETs are safe/idempotent. Reserved
    from day 1: future mutations MUST honor an `Idempotency-Key` header (server stores
    key → request-hash + response with TTL; replay returns stored response; same key +
    different body → 409).
12. **Rate limiting.** Sliding window per **API key** AND per **tenant**. Backend v1 =
    Postgres via atomic RPC `consume_rate_limit(api_key_id, limit, window_seconds)`
    returning allowed/remaining/reset (KV/Redis when off Hobby). Default ~600 req/min
    per key (configurable per plan) + tenant ceiling. Over limit → `429` +
    `Retry-After` + `X-RateLimit-Limit/Remaining/Reset`.
13. **OpenAPI as a release requirement.** No public endpoint ships without its OpenAPI
    entry; CI **contract tests** validate runtime responses against the spec. Spec
    served at `/api/v1/openapi.json` (+ docs UI), versioned with the API.

### C. Additional hardenings (3)
14. **Environment-prefixed API keys, mandatory from day 1:** `nxs_live_…` and
    `nxs_test_…`. The prefix is validated **before any DB lookup** (fast reject) and
    prevents using production keys in test environments; enables future sandboxes.
15. **Mandatory request correlation.** Every public request generates an
    **`X-Request-Id`** that MUST appear in: audit logs, the `problem+json` body, server
    logs, and (future) metrics. Not optional.
16. **Scope deny-by-default.** A newly created API key has **0 scopes**. Scopes are
    never assigned automatically. Lifecycle: `create key → no permissions → assign
    scopes → activate usage`. Prevents accidental over-grant.

## Security posture (summary)
Tenant derived from the key (never from input); cross-tenant resource → 404; column
allowlist (no `select *`); hashed keys + rotation + immediate revocation + expiry;
TLS-only; rate limiting + payload caps + read-only v1; `api.request` /
`api.request_denied` audit events with `actorId = api_key_id`, `tenantId`,
`X-Request-Id`. Threats addressed: enumeration, data leakage, key compromise/rotation,
revocation, replay (TLS now; HMAC signing optional in v2), endpoint abuse.

## Consequences
- INT-2 contract is frozen and durable, ready for an enterprise public API.
- Sprint B (API Foundation) builds: `api_keys` + `api_rate_counters` + RPC
  `consume_rate_limit`, `ApiContext` resolver (prefix check → key lookup → tenant +
  scopes), `/api/v1` router, auth+scope+rate-limit middleware, RFC 7807 errors,
  `api.request` audit, OpenAPI skeleton + contract test, and a single pilot endpoint
  **`GET /api/v1/materials`** (read-only, keyset, filter/sort allowlist) as the
  reference for the rest of the platform.
- **No implementation, migrations, or endpoints created by this ADR.**

## Roadmap
A (Architecture Review — done) → **B (API Foundation + pilot `GET /api/v1/materials`)**
→ C (Inventory + CRM read APIs) → D (Work Orders + Tier 2) → E (Hardening + full
OpenAPI + OAuth-readiness). v1 read-only throughout.
