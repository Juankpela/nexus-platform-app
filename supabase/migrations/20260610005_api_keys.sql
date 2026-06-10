-- INT-2 Sprint B — Public API Foundation (ADR-025).
--
-- API keys (env-prefixed, hashed, scoped, deny-by-default), a windowed rate counter,
-- and the atomic consume_rate_limit RPC. Read-only public API; no business logic here.
-- Additive + idempotent. NOT YET APPLIED.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'api_key_status') then
    create type public.api_key_status as enum ('active', 'revoked');
  end if;
end
$$;

-- ── API keys ─────────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id           uuid                   primary key default gen_random_uuid(),
  tenant_id    uuid                   not null references public.tenants(id) on delete cascade,
  prefix       text                   not null check (prefix in ('nxs_live', 'nxs_test')),
  key_hash     text                   not null,                 -- sha256 of the full secret
  label        text                   not null,
  scopes       text[]                 not null default '{}',    -- deny-by-default (ADR-025 #16)
  status       public.api_key_status  not null default 'active',
  expires_at   timestamptz,
  last_used_at timestamptz,
  rotated_from uuid,
  created_at   timestamptz            not null default now(),
  unique (id, tenant_id),
  unique (key_hash)
);
create index if not exists api_keys_tenant_idx on public.api_keys (tenant_id, status);

drop trigger if exists api_keys_no_op on public.api_keys; -- (no updated_at on keys)

-- ── Rate-limit event log (true sliding window) ──────────────────────────────
-- One row per accepted request, per scope ('key' and 'tenant'). A sliding window
-- counts events in (now - window, now] — exact, not a fixed-window approximation.
create table if not exists public.api_rate_events (
  id          bigserial   primary key,
  scope       text        not null check (scope in ('key', 'tenant')),
  scope_id    uuid        not null,
  occurred_at timestamptz not null default now()
);
create index if not exists api_rate_events_scope_idx
  on public.api_rate_events (scope, scope_id, occurred_at);

-- Atomic sliding-window consume evaluating BOTH per-key AND per-tenant limits
-- (ADR-025 #12). Serialized per tenant via an advisory xact lock so concurrent
-- requests cannot over-allow. Returns {allowed, limit, remaining, reset}.
create or replace function public.consume_rate_limit(
  p_api_key_id     uuid,
  p_tenant_id      uuid,
  p_key_limit      integer,
  p_tenant_limit   integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff       timestamptz := now() - make_interval(secs => p_window_seconds);
  v_key_count    integer;
  v_tenant_count integer;
  v_allowed      boolean;
  v_reset        timestamptz := now() + make_interval(secs => p_window_seconds);
  v_oldest       timestamptz;
begin
  -- Serialize all rate-limit ops for this tenant (count→decide→insert atomic).
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));

  -- Housekeeping: drop expired events for the scopes we touch.
  delete from public.api_rate_events
   where occurred_at <= v_cutoff
     and ((scope = 'key' and scope_id = p_api_key_id)
       or (scope = 'tenant' and scope_id = p_tenant_id));

  select count(*) into v_key_count from public.api_rate_events
   where scope = 'key' and scope_id = p_api_key_id and occurred_at > v_cutoff;
  select count(*) into v_tenant_count from public.api_rate_events
   where scope = 'tenant' and scope_id = p_tenant_id and occurred_at > v_cutoff;

  v_allowed := v_key_count < p_key_limit and v_tenant_count < p_tenant_limit;

  if v_allowed then
    insert into public.api_rate_events (scope, scope_id) values
      ('key', p_api_key_id), ('tenant', p_tenant_id);
    v_key_count    := v_key_count + 1;
    v_tenant_count := v_tenant_count + 1;
  else
    -- Next slot frees when the oldest in-window event of an exceeded scope expires.
    select min(occurred_at) into v_oldest from public.api_rate_events
     where occurred_at > v_cutoff
       and ((v_key_count >= p_key_limit and scope = 'key' and scope_id = p_api_key_id)
         or (v_tenant_count >= p_tenant_limit and scope = 'tenant' and scope_id = p_tenant_id));
    if v_oldest is not null then
      v_reset := v_oldest + make_interval(secs => p_window_seconds);
    end if;
  end if;

  return jsonb_build_object(
    'allowed',   v_allowed,
    'limit',     least(p_key_limit, p_tenant_limit),
    'remaining', least(
                   greatest(0, p_key_limit - v_key_count),
                   greatest(0, p_tenant_limit - v_tenant_count)
                 ),
    'reset',     v_reset
  );
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- The public API resolves/uses keys via the SERVICE ROLE (no session). Tenant admins
-- may VIEW their own keys (metadata only; never the hash) through the app session.
alter table public.api_keys        enable row level security;
alter table public.api_rate_events enable row level security;

drop policy if exists "api_keys_select_admin" on public.api_keys;
create policy "api_keys_select_admin" on public.api_keys
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'tenant.settings.read'));
-- No insert/update/delete for authenticated: issuance/rotation/revocation go through
-- service-role use-cases (issue/rotate/revoke). No policies on api_rate_events →
-- only the SECURITY DEFINER RPC / service role touches it.
