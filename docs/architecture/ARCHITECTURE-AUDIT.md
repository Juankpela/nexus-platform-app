# NEXUS — Enterprise Architecture Audit

> Rol: Principal Software Architect (Salesforce / ServiceNow / HubSpot / FSM / SaaS multi-tenant).
> Objetivo: **encontrar lo que falta y lo que romperá** antes de que lleguen clientes enterprise.
> Método: hallazgos anclados en el código real (no genéricos). Cada hallazgo cita evidencia.
> Fecha: 2026-06-09 · Commit base: `ea830fd`.

---

## 0. Resumen ejecutivo (TL;DR)

NEXUS tiene **cimientos excelentes** para una arquitectura modular (hexagonal/DDD, RLS, auditoría, numeración atómica, CSP). Pero hoy es un **monolito serverless síncrono sin plano asíncrono, sin observabilidad y sin capacidades de plataforma SaaS** (billing, notificaciones, webhooks, API pública). En su forma actual:

- **Funciona muy bien hasta ~50–100 tenants y decenas de miles de registros.**
- **Se degrada y se vuelve frágil** al acercarse a 500k+ Work Orders y miles de tenants, por 3 razones concretas medibles en el código: (1) **agregaciones en memoria** (`getStats` trae todas las filas), (2) **`count:"exact"`** en todos los listados (full scan), (3) **auditoría síncrona en el request path** (50 llamadas `await audit.append`).
- **No es aún "enterprise-ready"** por ausencia de: rate limiting, MFA, observabilidad (logs/traces/errores), CI/CD, AI Gateway, eventos de dominio y billing.

Veredicto: **arquitectura correcta en lo pequeño, incompleta en lo grande.** El trabajo no es reescribir — es **añadir los planos que faltan** (asíncrono, observabilidad, plataforma) y endurecer 3–4 puntos calientes.

---

## 1. Lo que está BIEN diseñado (no tocar)

| Área | Evidencia | Por qué está bien |
|------|-----------|-------------------|
| Hexagonal / DDD | `modules/*/{domain,application,infrastructure,presentation,composition.ts}` | Dominio puro sin dependencias; puertos + adaptadores; `composition.ts` como raíz de composición por módulo. Inversión de dependencias real. |
| Defensa en profundidad | `proxy.ts` + `has_tenant_permission()` + `requirePermission` | 4 capas: edge → request-context → authorization (app) → RLS (DB). El permiso se evalúa **en SQL**, imposible saltarlo desde el cliente. |
| Aislamiento multi-tenant | `tenant_id` + FKs compuestas `(id, tenant_id)` + RLS en cada tabla | Integridad de tenant garantizada por el motor, no por convención. |
| Numeración concurrente | `next_quote_number`/`next_case_number`/`next_asset_number`/`next_work_order_number` | Secuencias atómicas `security definer` — sin colisiones bajo concurrencia. |
| Auditoría | `modules/audit` + 50 puntos de `audit.append` | Trazabilidad de actor/acción/subject en cada mutación. |
| Migraciones | `supabase/migrations/*` additivas + idempotentes | Cero downtime, re-ejecutables. |
| Edge security | `proxy.ts`: CSP con nonce + `strict-dynamic`, HSTS, X-Frame-Options DENY, nosniff | Cabeceras de seguridad por encima del promedio del mercado. |

**Conclusión:** el "core arquitectónico" es sólido y debe **preservarse como invariante**. Todo lo siguiente se construye encima, sin romperlo.

---

## 2. Lo que debe CORREGIRSE (deuda técnica con evidencia)

### 🔴 D1 — Agregaciones en memoria (`getStats` trae todas las filas)
**Evidencia:** `supabase-dashboard-stats-repository.ts`, `supabase-case-repository.ts:265`, `supabase-work-order-repository.ts:297` hacen `select(...)` de **todas las filas del tenant** y agregan en JS.
**Impacto:** O(n) por carga de dashboard. A 500k Work Orders, cada visita al dashboard transfiere y procesa cientos de miles de filas → timeouts, memoria, costo Supabase.
**Corrección:** mover agregaciones a **SQL** (RPC `count/group by`) o **vistas materializadas** refrescadas por evento/cron. → ADR-005.

### 🔴 D2 — `count: "exact"` en todos los listados
**Evidencia:** 10 usos de `count: "exact"`.
**Impacto:** en PostgreSQL, `exact` cuenta toda la tabla filtrada (full scan) en **cada** paginación. A escala, la paginación se vuelve el query más caro de la app.
**Corrección:** `count: "planned"` (estimado) para listados grandes; `exact` solo cuando el filtro garantiza pocas filas. → ADR-005.

### 🔴 D3 — Auditoría síncrona en el request path
**Evidencia:** 50 × `await audit.append(...)` dentro de use-cases que corren en la request del usuario.
**Impacto:** cada mutación paga la latencia de un INSERT extra (o varios — `change-status` hace 2). Acopla la respuesta del usuario a la escritura de auditoría. Si el INSERT de auditoría falla, ¿qué pasa con la transacción de negocio?
**Corrección:** patrón **transactional outbox** + worker asíncrono. → ADR-001, ADR-003.

### 🟠 D4 — `any`-casts y 10 errores de lint sin resolver
**Evidencia:** `anyFrom()` en `supabase-forecasting-repository.ts` (7 `no-explicit-any`), `create-member-dialog.tsx` (ref en render), `ai-insights-panel` (entidades sin escapar). `npm run lint` → 10 errores.
**Impacto:** erosión de type-safety + señal de que **no hay gate de calidad** (los errores llevan commits acumulándose).
**Corrección:** resolver y activar lint en CI como bloqueante. → ADR-006.

### 🟠 D5 — Dinero como `number` (float) en el dominio
**Evidencia:** `numeric(14,2)` en DB pero `number` en TS (`estimatedValue`, `unitPrice`, `purchaseCost`, `laborHours`). JS `number` es float64.
**Impacto:** errores de redondeo en cotizaciones/totales a escala. Riesgo legal/financiero.
**Corrección:** value object `Money` (enteros en centavos o `decimal.js`) en dominio. → ADR-007.

### 🟡 D6 — Tabla `activities` polimórfica ("god table")
**Evidencia:** 6 FKs nullable (`company/contact/opportunity/case/asset/work_order`) + CHECK "al menos uno".
**Impacto:** funciona, pero crecen los índices, no se garantiza un único target, y a millones de filas el timeline mezclado por tenant pesa. Smell de asociación polimórfica.
**Corrección:** evaluar tabla de enlace `activity_links(activity_id, target_type, target_id)` o partición por `tenant_id`/tiempo. → ADR-008 (diferible).

### 🟡 D7 — Módulo `service` creciendo sin sub-límites
**Evidencia:** `modules/service` ya contiene Cases + Assets + Work Orders (3 agregados).
**Impacto:** a futuro (Technicians, Scheduling, Inventory) será un módulo gigante.
**Corrección:** sub-bounded-contexts dentro de `service/` o split en `service-desk` vs `field-service`. → ADR-009 (diferible).

---

## 3. Lo que FALTA (capas y módulos ausentes)

### 3.1 Plano asíncrono / Event-Driven — **AUSENTE**
**Evidencia:** `grep eventbus|domain event|queue|enqueue|outbox|webhook` → **0 resultados** (solo el README de integrations).
Hoy todo es request/response síncrono. No hay forma de:
- Reaccionar a `work_order.completed` (notificar, facturar, actualizar métricas).
- Procesar trabajo pesado fuera del request (PDFs, IA, reportes, sync externo).
- Garantizar entrega (retries, dead-letter).
**Necesario:** Domain Events + Outbox + Worker (+ luego un Event Bus). → ADR-001, ADR-002, ADR-003.

### 3.2 Observabilidad — **AUSENTE**
**Evidencia:** sin Sentry/OpenTelemetry/logger estructurado en `package.json`; solo `console.error`.
Sin esto, en producción enterprise estás **ciego**: no hay traces, ni alertas de error, ni métricas, ni latencias por tenant.
**Necesario:** error monitoring (Sentry), logs estructurados con `request_id`/`tenant_id` (ya tienes `x-request-id` en `proxy.ts`), traces (OTel), dashboards. → ADR-004.

### 3.3 AI enterprise — **EMBRIONARIO**
**Evidencia:** un único `new Anthropic()` directo en `get-ai-revenue-insights.ts`.
Problemas: **vendor lock-in** (Anthropic hardcoded), sin gateway, sin gestión de prompts, sin evals, sin observabilidad de IA, sin memoria, sin presupuesto de tokens por tenant, sin fallback de proveedor.
**Necesario:** **AI Gateway** (puerto `LlmProvider` + adaptadores Anthropic/OpenAI/Bedrock), Prompt Registry, Tool Registry, AI Observability, Token Metering por tenant. → ADR-010.

### 3.4 Capacidades de plataforma SaaS — **AUSENTES (obligatorias)**
**Evidencia:** `grep stripe|billing|subscription|invoice|notification` → **0**. `feature-flags` solo tiene `domain/feature.ts` + `require-feature.ts` (sin persistencia ni UI). `integrations` = README.

| Capacidad | Estado | ¿Obligatoria para enterprise? |
|-----------|--------|-------------------------------|
| Billing & Subscriptions | ❌ | **Sí** — sin esto no hay negocio SaaS |
| Usage Metering | ❌ | **Sí** — planes por uso, límites |
| Notification Center (email/in-app/WhatsApp) | ❌ | **Sí** — Field Service necesita avisar al técnico/cliente |
| Webhooks (salientes) | ❌ | **Sí** — integraciones enterprise |
| Public API + API Keys | ❌ | **Sí** — ecosistema/partners |
| Workflow / Automation Engine | ❌ | Alta — reglas "si X entonces Y" |
| Feature Flags (completo, por tenant/plan) | 🟡 parcial | Alta |
| Integration Platform / Marketplace | ❌ | Media (Fase 3–4) |
| SSO / SAML / SCIM | ❌ | **Sí** para enterprise (provisioning) |

### 3.5 CI/CD — **AUSENTE**
**Evidencia:** no existe `.github/workflows/`. Solo **3 tests** en todo el repo.
**Impacto:** nada impide que un commit rompa tsc/lint/build/tests. Ya hay 10 errores de lint acumulados (prueba del punto).
**Necesario:** pipeline `tsc + lint + test + build` bloqueante + cobertura mínima. → ADR-006.

---

## 4. Multi-Tenancy — análisis a escala (miles de tenants)

**Bien:** RLS por `tenant_id`, FKs compuestas, resolución de tenant cacheada (`resolveCachedTenantAccess`).

**Riesgos a escala:**
1. **`has_tenant_permission()` en cada fila.** Es `security definer` SQL con **EXISTS anidados** (membership → membership_roles → role_permissions → permissions, y otra rama para permission_sets). En un `SELECT` que escanee muchas filas, RLS evalúa esto por fila. → Verificar plan de ejecución; considerar **cachear permisos efectivos en el JWT/claims** (custom claims) para que RLS lea un array del token en vez de 4 JOINs. **(Riesgo alto de performance.)** → ADR-011.
2. **Noisy neighbor.** Sin rate limiting por tenant, un tenant puede degradar a todos (mismo pool serverless + misma DB). → ADR-012.
3. **Sin estrategia de sharding / data residency.** Un solo Postgres para todos. A 1.000 tenants grandes, hay que planear pooling (pgbouncer/Supavisor), read replicas y, eventualmente, partición por tenant o "pods". → roadmap Fase 3.
4. **Cross-tenant en RPC `security definer`.** Las funciones `next_*_number` reciben `p_tenant_id` y son `security definer`; confían en el caller. Hoy se llaman desde repos server-side con el `tenant_id` del contexto — correcto. Pero **una RPC `security definer` mal expuesta es un vector cross-tenant.** Mantener invariante: nunca exponer estas RPC al cliente; validar `tenant_id == auth tenant` dentro de la función. → ADR-011.

---

## 5. Seguridad — gaps para entorno enterprise

| Control | Estado | Gap |
|---------|--------|-----|
| AuthN | Supabase Auth, password | ❌ **MFA/TOTP**, ❌ account lockout, ❌ política de contraseñas |
| AuthZ | RBAC + RLS | ✅ sólido; falta **permisos a nivel de campo/registro** (sharing rules estilo SF) |
| Sesión/JWT | cookies httpOnly, refresh en `proxy.ts` | Falta rotación/expiración configurable, revocación de sesión |
| Rate limiting | ❌ ausente | OWASP A07 — brute force en `/login`, abuso de API |
| Edge/CSP | ✅ nonce + strict-dynamic | Bien |
| Auditoría inmutable | 🟡 | La tabla audit ¿es append-only? Forzar `REVOKE UPDATE/DELETE` + retención |
| Secret management | env vars | Falta rotación; `SUPABASE_SERVICE_ROLE_KEY` solo server (ok) |
| OWASP A09 (logging/monitoring) | ❌ | Sin alertas de seguridad (ver Observabilidad) |
| SSO/SAML/SCIM | ❌ | Requisito enterprise para provisioning |
| Data encryption at rest/field | Supabase default | Falta cifrado a nivel de campo para PII sensible |

**Top 3 a cerrar antes de enterprise:** Rate limiting (login + API), MFA, Observabilidad de seguridad.

---

## 6. Escalabilidad — cuellos de botella concretos (a 500k WO / millones de filas)

1. **Dashboards (D1)** — agregación en memoria → **reescribir a SQL/materialized views.**
2. **Paginación (D2)** — `count exact` → **planned count.**
3. **Auditoría síncrona (D3)** — → **outbox asíncrono.**
4. **IA en request** — `get-ai-revenue-insights` llama a Claude **dentro del request** (timeout 1024→4096 tokens, segundos de latencia) → mover a **job asíncrono** con resultado cacheado/snapshot.
5. **Trabajo pesado futuro** (PDFs de cotización, reportes, sync) — no hay dónde ejecutarlo → **cola de jobs.**
6. **DB connections** — Next serverless + Supabase: asegurar **Supavisor/pgbouncer** en modo transaction; cada request abre cliente (`createServerSupabaseClient`) — ok con pooler, peligroso sin él.

---

## 7. Arquitectura objetivo (target)

```
                          ┌────────────────────────────────────────────┐
                          │                 EDGE (proxy.ts)             │
                          │  CSP · headers · session · RATE LIMIT (new) │
                          └───────────────┬────────────────────────────┘
                                          │
                 ┌────────────────────────▼─────────────────────────┐
                 │              APPLICATION (Next.js)                │
                 │  RSC · Server Actions · API Routes · PUBLIC API   │
                 │  composition roots → use-cases → ports            │
                 └───┬───────────────┬───────────────┬──────────────┘
                     │               │               │
        ┌────────────▼───┐   ┌───────▼───────┐  ┌────▼─────────────┐
        │  WRITE side    │   │  AI GATEWAY   │  │  READ side       │
        │  use-cases     │   │ LlmProvider   │  │  read-models /   │
        │  + OUTBOX (new)│   │ prompts/tools │  │  matviews (new)  │
        └────┬───────────┘   │ evals/obs     │  └──────────────────┘
             │               └───────────────┘
             │ transactional outbox
        ┌────▼───────────────────────────────────────────────┐
        │            EVENT BUS / WORKER (new)                 │
        │  domain events → handlers (async)                   │
        │  ├─ AuditWriter      ├─ NotificationDispatcher      │
        │  ├─ WebhookDispatcher├─ UsageMeter                  │
        │  ├─ AI jobs          └─ ReadModelProjector          │
        └────┬───────────────────────────────────────────────┘
             │
   ┌─────────▼─────────┐   ┌──────────────┐   ┌───────────────┐
   │ PostgreSQL (RLS)  │   │ Observability│   │ External      │
   │ + read replicas   │   │ Sentry/OTel  │   │ Stripe/Email/ │
   │ + partitioning    │   │ logs/traces  │   │ WhatsApp/SSO  │
   └───────────────────┘   └──────────────┘   └───────────────┘
```

### C4 — Contenedores (texto)
- **Web/App** (Next.js): UI + Server Actions + API pública + API keys.
- **Worker** (nuevo): consume outbox/eventos; corre handlers async (audit, notif, webhooks, AI, projections). Puede ser Vercel Cron + Supabase Edge Functions, o un servicio dedicado (Railway/Fly).
- **Postgres** (Supabase): OLTP + RLS + read-models (matviews) + outbox table.
- **AI Gateway** (módulo + posible servicio): abstrae proveedores LLM.
- **Observability**: Sentry (errores), OTel collector (traces/metrics).
- **External**: Stripe (billing), proveedor email/WhatsApp (notif), IdP SAML/OIDC (SSO).

---

## 8. Architecture Decision Records (ADRs)

> Formato: Contexto · Decisión · Consecuencias · Cambios concretos.

### ADR-001 — Introducir Domain Events
- **Contexto:** lógica reactiva (notificar, facturar, proyectar métricas) hoy imposible sin acoplar use-cases entre sí.
- **Decisión:** cada agregado emite eventos de dominio inmutables (`WorkOrderCompleted`, `CaseEscalated`, `QuoteAccepted`…).
- **Consecuencias:** desacopla efectos secundarios; base para outbox/bus.
- **Cambios:**
  - `modules/shared/domain/domain-event.ts` (tipo base).
  - Cada use-case retorna/registra eventos en vez de llamar a `audit.append` directo.
  - Carpeta `modules/<m>/domain/events/*.ts`.

### ADR-002 — Event Bus + handlers
- **Decisión:** un bus in-process (fase 1) → bus durable (fase 2, p.ej. pg-boss/Supabase queue).
- **Cambios:** `modules/shared/application/event-bus.ts` (puerto) + adaptador; registro de handlers en composición.

### ADR-003 — Transactional Outbox para auditoría y efectos
- **Contexto:** D3 (auditoría síncrona) + entrega garantizada.
- **Decisión:** escribir eventos en tabla `outbox` **en la misma transacción** que el cambio de negocio; un worker los publica.
- **Cambios:**
  - Tabla `outbox(id, tenant_id, type, payload jsonb, status, attempts, created_at, processed_at)` + índice `(status, created_at)`.
  - `AuditWriter` pasa a ser handler async.
  - Worker: Vercel Cron / Supabase Edge Function cada N segundos.

### ADR-004 — Observabilidad (Sentry + OTel + logs estructurados)
- **Decisión:** Sentry para errores; logger estructurado JSON con `request_id` (ya disponible) + `tenant_id` + `user_id`; OTel traces.
- **Cambios:** `lib/observability/{logger.ts,sentry.ts,tracing.ts}`; instrumentar `proxy.ts`, server actions y repos.

### ADR-005 — Read models (SQL aggregation / matviews) para stats y count
- **Contexto:** D1 + D2.
- **Decisión:** `getStats` → RPC SQL `group by`; listas grandes → `count: "planned"`; dashboards pesados → vista materializada refrescada por evento.
- **Cambios:** RPCs `tenant_case_stats`, `tenant_work_order_stats`; migración matview `mv_dashboard_<tenant>`; repos consumen RPC.

### ADR-006 — CI/CD con gate de calidad
- **Decisión:** GitHub Actions: `tsc --noEmit`, `lint` (bloqueante tras limpiar los 10 errores), `test`, `build`. Preview deploys.
- **Cambios:** `.github/workflows/ci.yml`; subir cobertura de 3 tests → casos de use-cases críticos.

### ADR-007 — Value Object `Money`
- **Decisión:** dinero en enteros (centavos) o `decimal.js`; nunca float.
- **Cambios:** `modules/shared/domain/money.ts`; refactor quotes/products/assets/work-orders.

### ADR-008 — Rediseño de timeline polimórfico *(diferible)*
- **Decisión:** evaluar `activity_links` o partición; medir antes de actuar.

### ADR-009 — Sub-bounded-contexts en `service` *(diferible)*
- **Decisión:** separar `service-desk` (cases) de `field-service` (assets/work-orders/technicians/scheduling) cuando crezca.

### ADR-010 — AI Gateway
- **Contexto:** 3.3, vendor lock-in.
- **Decisión:** puerto `LlmProvider` + adaptadores; Prompt Registry versionado; Tool Registry; AI Observability (tokens, latencia, costo por tenant); evals offline.
- **Cambios:**
  - `modules/ai/application/ports/llm-provider.ts`
  - `modules/ai/infrastructure/{anthropic,openai,bedrock}-provider.ts`
  - `modules/ai/domain/prompt.ts` + `prompts/` versionados
  - `modules/ai/application/ai-gateway.ts` (routing, fallback, token budget)
  - `forecasting` deja de importar `@anthropic-ai/sdk` directo → usa el gateway.

### ADR-011 — Permisos en claims del JWT (RLS performante)
- **Contexto:** §4.1 — `has_tenant_permission` con JOINs por fila.
- **Decisión:** materializar permisos efectivos en custom claims (refrescados al cambiar roles); RLS lee el array del token.
- **Cambios:** hook de Supabase Auth (custom access token) + simplificación de policies; mantener `has_tenant_permission` como fallback.

### ADR-012 — Rate limiting + MFA
- **Decisión:** rate limit por IP+tenant en `proxy.ts` (Upstash/Redis o Postgres token-bucket); MFA TOTP vía Supabase.
- **Cambios:** `lib/security/rate-limit.ts`; enforcement en `/login` y API pública; activar MFA.

### ADR-013 — Capacidades de plataforma SaaS
- **Decisión:** módulos `billing` (Stripe), `notifications`, `webhooks`, `usage`, `public-api` (+ API keys), `workflow` (motor de reglas), `feature-flags` (completar).
- **Cambios:** un módulo hexagonal por capacidad; tablas dedicadas; todos disparados por eventos (ADR-001).

---

## 9. Roadmap a plataforma enterprise

### FASE 1 — Endurecer cimientos (semanas 1–4) · *prerrequisito de todo lo demás*
- ADR-006 CI/CD + limpiar 10 errores de lint.
- ADR-004 Observabilidad (Sentry + logs estructurados).
- ADR-012 Rate limiting + MFA.
- ADR-005 (parte 1): `count: planned` + `getStats` en SQL.
- ADR-007 Money value object.
**Resultado:** base segura, observable y con gate de calidad. Sin esto, escalar es peligroso.

### FASE 2 — Plano asíncrono + IA (semanas 5–10)
- ADR-001/002/003 Domain Events + Outbox + Worker.
- Migrar auditoría e IA a async (resuelve D3 + IA-en-request).
- ADR-010 AI Gateway (rompe lock-in, añade observabilidad de IA).
- ADR-005 (parte 2): read models / matviews para dashboards.
**Resultado:** reactividad, escalabilidad de lecturas, IA enterprise.

### FASE 3 — Capacidades SaaS (semanas 11–20)
- ADR-013: Billing + Subscriptions + Usage Metering (Stripe).
- Notification Center (email/in-app/WhatsApp) — ya hay infra WhatsApp en env.
- Webhooks salientes + Public API + API Keys.
- Feature Flags completo por plan/tenant.
- SSO/SAML/SCIM.
**Resultado:** NEXUS es vendible y operable como SaaS multi-plan.

### FASE 4 — Escala y ecosistema (semanas 21+)
- Workflow/Automation engine.
- Read replicas, partición por tenant, Supavisor pooling, data residency.
- ADR-011 permisos en claims (RLS a escala).
- Integration Platform / Marketplace.
- Field Service avanzado: Technicians, Scheduling, Route Planning, Inventory, Mobile/GPS.
**Resultado:** comparable a Salesforce FSM / ServiceNow en su vertical.

---

## 10. Priorización (matriz impacto × esfuerzo)

| Prioridad | Item | Impacto | Esfuerzo |
|-----------|------|---------|----------|
| **P0** | CI/CD + lint limpio (ADR-006) | Alto | Bajo |
| **P0** | Observabilidad (ADR-004) | Alto | Bajo-Medio |
| **P0** | Rate limiting + MFA (ADR-012) | Alto (seguridad) | Bajo-Medio |
| **P1** | `count planned` + stats en SQL (ADR-005.1) | Alto (escala) | Bajo |
| **P1** | Outbox + auditoría async (ADR-001/003) | Alto | Medio |
| **P1** | AI Gateway (ADR-010) | Alto (lock-in) | Medio |
| **P2** | Money VO (ADR-007) | Medio-Alto | Medio |
| **P2** | Billing/Subscriptions (ADR-013) | Alto (negocio) | Alto |
| **P2** | Notifications + Webhooks (ADR-013) | Alto | Medio-Alto |
| **P3** | Read models/matviews (ADR-005.2) | Medio | Medio |
| **P3** | Permisos en claims (ADR-011) | Alto a escala | Alto |
| **P3** | Public API + SSO (ADR-013) | Alto enterprise | Alto |
| **P4** | Timeline redesign / service split (ADR-008/009) | Medio | Medio |

---

## 11. Cambios de estructura sugeridos (carpetas)

```
modules/
  shared/                      # NUEVO — kernel compartido
    domain/{domain-event.ts, money.ts, result.ts}
    application/{event-bus.ts, outbox.ts}
  ai/                          # NUEVO — AI Gateway (saca IA de forecasting)
    domain/{prompt.ts, tool.ts}
    application/{ai-gateway.ts, ports/llm-provider.ts}
    infrastructure/{anthropic-provider.ts, openai-provider.ts}
  billing/                     # NUEVO (Fase 3)
  notifications/               # NUEVO (Fase 3)
  webhooks/                    # NUEVO (Fase 3)
  usage/                       # NUEVO (Fase 3)
  public-api/                  # NUEVO (Fase 3)
  workflow/                    # NUEVO (Fase 4)
  feature-flags/               # COMPLETAR (persistencia + UI + por plan)
  integrations/                # IMPLEMENTAR (hoy solo README)
  service/                     # eventual split: service-desk / field-service
lib/
  observability/{logger.ts, sentry.ts, tracing.ts}   # NUEVO
  security/rate-limit.ts                              # NUEVO
.github/workflows/ci.yml                              # NUEVO
supabase/migrations/
  *_outbox.sql                 # NUEVO
  *_read_models.sql            # NUEVO (RPC stats + matviews)
```

## 12. Tablas nuevas mínimas (Fase 1–2)

```sql
-- Outbox (ADR-003)
outbox(id uuid pk, tenant_id uuid, type text, payload jsonb,
       status text default 'pending', attempts int default 0,
       created_at timestamptz, processed_at timestamptz)   -- idx (status, created_at)

-- Read model stats (ADR-005) → RPC en vez de tabla, o matview:
mv_tenant_service_stats(tenant_id, open_cases, open_work_orders, sla_pct, ...) -- refresh por evento

-- Fase 3
subscriptions, plans, usage_events, notifications, notification_prefs,
webhooks, webhook_deliveries, api_keys
```

---

### Cierre
NEXUS está **bien parido pero a medio crecer**. El núcleo hexagonal/multi-tenant es de calidad; lo que falta es el **plano asíncrono, la observabilidad y las capacidades de plataforma**. La recomendación firme: **no añadir más módulos de negocio (Technicians, Scheduling) sobre la base actual sin completar al menos la FASE 1 (P0)** — de lo contrario, cada módulo nuevo hereda la deuda de auditoría síncrona, dashboards en memoria y cero observabilidad, y el costo de corregir se multiplica.
