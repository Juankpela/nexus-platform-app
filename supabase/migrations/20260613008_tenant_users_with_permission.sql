-- Group 13 — Notifications (ADR-030): recipient resolution.
--
-- Returns the active members of a tenant that hold a given permission (via roles
-- OR permission sets) — the set-returning sibling of has_tenant_permission. The
-- notification fan-out (service role, from the cron) uses it to address the right
-- users. SECURITY DEFINER + pinned search_path, like the permission helpers.
-- Additive + idempotent.

create or replace function public.tenant_users_with_permission(
  p_tenant_id uuid,
  p_permission_key text
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.user_id
  from public.tenant_memberships membership
  where membership.tenant_id = p_tenant_id
    and membership.status = 'active'
    and (
      exists (
        select 1
        from public.membership_roles membership_role
        join public.role_permissions role_permission
          on role_permission.role_id = membership_role.role_id
        join public.permissions permission
          on permission.id = role_permission.permission_id
        where membership_role.membership_id = membership.id
          and membership_role.tenant_id = p_tenant_id
          and permission.key = p_permission_key
      )
      or exists (
        select 1
        from public.membership_permission_sets membership_set
        join public.permission_set_permissions set_permission
          on set_permission.permission_set_id = membership_set.permission_set_id
          and set_permission.tenant_id = p_tenant_id
        join public.permissions permission
          on permission.id = set_permission.permission_id
        where membership_set.membership_id = membership.id
          and membership_set.tenant_id = p_tenant_id
          and permission.key = p_permission_key
      )
    );
$$;

revoke all on function public.tenant_users_with_permission(uuid, text) from public;
grant execute on function public.tenant_users_with_permission(uuid, text)
  to authenticated, service_role;
