-- Group 0 — Platform Console (provider backoffice).
--
-- Introduces the "platform plane": the provider (Nexus / Colibri IT) operating
-- its own customers — the organizations (tenants) it sells the product to.
-- This is distinct from the "tenant plane" where each organization manages its
-- own CRM data.
--
-- All write operations live in SECURITY DEFINER RPCs that validate
-- is_platform_admin() internally, so authorization is enforced at the database
-- regardless of the calling path. Each RPC also records an append-only audit
-- event atomically with the operation.
--
-- This migration is additive and idempotent. It creates no tables, so the
-- generated database types do not change.

-- 1. provision_organization --------------------------------------------------
-- Creates a tenant, activates its first administrator membership, assigns the
-- tenant_admin role, and audits the event — all atomically. The auth user must
-- already exist (created via the admin API in the application layer, since user
-- creation with a password is only possible through Supabase Auth's admin API).
create or replace function public.provision_organization(
  p_user_id uuid,
  p_slug text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_membership_id uuid;
  v_role_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform administrators may provision organizations'
      using errcode = '42501';
  end if;

  insert into public.tenants (slug, name, status)
  values (lower(p_slug), p_name, 'active')
  returning id into v_tenant_id;

  insert into public.tenant_memberships (tenant_id, user_id, status)
  values (v_tenant_id, p_user_id, 'active')
  returning id into v_membership_id;

  select id into v_role_id from public.roles where key = 'tenant_admin';
  if v_role_id is null then
    raise exception 'tenant_admin role is missing (run the foundation migration)';
  end if;

  insert into public.membership_roles (membership_id, tenant_id, role_id)
  values (v_membership_id, v_tenant_id, v_role_id);

  insert into public.audit_events
    (event_type, actor_type, actor_id, tenant_id, subject_type, subject_id, action, metadata)
  values
    ('platform.organization.created', 'user', auth.uid(), v_tenant_id, 'tenant',
     v_tenant_id::text, 'organization.created',
     jsonb_build_object('slug', lower(p_slug), 'name', p_name, 'admin_user_id', p_user_id));

  return v_tenant_id;
end;
$$;

revoke all on function public.provision_organization(uuid, text, text) from public, anon;
grant execute on function public.provision_organization(uuid, text, text) to authenticated;

-- 2. set_organization_status -------------------------------------------------
-- Suspends or reactivates an organization. RLS has no UPDATE policy on tenants,
-- so this DEFINER RPC is the only sanctioned write path.
create or replace function public.set_organization_status(
  p_tenant_id uuid,
  p_status public.tenant_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform administrators may change organization status'
      using errcode = '42501';
  end if;

  update public.tenants set status = p_status where id = p_tenant_id;
  if not found then
    raise exception 'Organization % not found', p_tenant_id;
  end if;

  insert into public.audit_events
    (event_type, actor_type, actor_id, tenant_id, subject_type, subject_id, action, metadata)
  values
    ('platform.organization.status_changed', 'user', auth.uid(), p_tenant_id, 'tenant',
     p_tenant_id::text, 'organization.status_changed',
     jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.set_organization_status(uuid, public.tenant_status) from public, anon;
grant execute on function public.set_organization_status(uuid, public.tenant_status) to authenticated;

-- 3. grant_platform_admin ----------------------------------------------------
-- Promotes a user to the platform super_admin role. Platform-level event, so
-- the audit row carries a null tenant_id.
create or replace function public.grant_platform_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform administrators may grant platform access'
      using errcode = '42501';
  end if;

  select id into v_role_id from public.platform_roles where key = 'super_admin';
  if v_role_id is null then
    raise exception 'super_admin platform role is missing';
  end if;

  insert into public.platform_user_roles (user_id, role_id)
  values (p_user_id, v_role_id)
  on conflict (user_id, role_id) do nothing;

  insert into public.audit_events
    (event_type, actor_type, actor_id, tenant_id, subject_type, subject_id, action, metadata)
  values
    ('platform.admin.granted', 'user', auth.uid(), null, 'user',
     p_user_id::text, 'platform_admin.granted', '{}'::jsonb);
end;
$$;

revoke all on function public.grant_platform_admin(uuid) from public, anon;
grant execute on function public.grant_platform_admin(uuid) to authenticated;

-- 4. Security fix — harden next_quote_number ---------------------------------
-- The original definition (202606060003) was SECURITY DEFINER with no caller
-- authorization, was not revoked from anon/public, and used search_path=public.
-- Any caller could increment another tenant's quote sequence. This replaces it
-- with the project-wide hardening standard.
create or replace function public.next_quote_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer;
  v_seq  integer;
begin
  if not public.has_tenant_permission(p_tenant_id, 'crm.quotes.write') then
    raise exception 'Not authorized to allocate quote numbers for this tenant'
      using errcode = '42501';
  end if;

  v_year := extract(year from now())::integer;
  insert into public.quote_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = public.quote_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('Q-%s-%s', v_year, lpad(v_seq::text, 3, '0'));
end;
$$;

revoke all on function public.next_quote_number(uuid) from public, anon;
grant execute on function public.next_quote_number(uuid) to authenticated;
