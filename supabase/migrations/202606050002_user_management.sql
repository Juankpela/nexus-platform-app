-- Sprint 1 — Foundation completion: user management write path.
--
-- Adds the missing write authorization for managing tenant members:
--   * a new `tenant.users.write` permission (granted to tenant_admin)
--   * profile visibility for co-members (so a manager can see who they manage)
--   * INSERT/UPDATE/DELETE RLS on tenant_memberships and membership_roles,
--     all gated by has_tenant_permission(tenant_id, 'tenant.users.write')
--
-- This migration is additive and idempotent. It does not alter any table
-- structure, so generated types do not change.

-- 1. New permission ---------------------------------------------------------
insert into public.permissions (key, description) values
  ('tenant.users.write', 'Invite, update, and remove tenant users')
on conflict (key) do nothing;

-- The foundation seed linked tenant_admin to the permissions that existed at
-- that time; link the new permission explicitly.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'tenant.users.write'
where role.key = 'tenant_admin'
on conflict do nothing;

-- 2. Co-member profile visibility -------------------------------------------
-- A user who can read users in a tenant may read the profiles of the active
-- members of that tenant. SECURITY DEFINER so it bypasses profiles' own RLS
-- (no recursion) and reuses has_tenant_permission for the authorization check.
create or replace function public.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships viewer
    join public.tenant_memberships target
      on target.tenant_id = viewer.tenant_id
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and target.user_id = target_profile_id
      and target.status = 'active'
      and public.has_tenant_permission(viewer.tenant_id, 'tenant.users.read')
  );
$$;

revoke all on function public.can_read_profile(uuid) from public, anon;
grant execute on function public.can_read_profile(uuid) to authenticated;

-- Additive SELECT policy (permissive: OR-combined with profiles_select_self).
drop policy if exists "profiles_select_comembers" on public.profiles;
create policy "profiles_select_comembers" on public.profiles
for select to authenticated
using (public.can_read_profile(id));

-- 3. Membership write policies ----------------------------------------------
drop policy if exists "memberships_insert_managers" on public.tenant_memberships;
create policy "memberships_insert_managers" on public.tenant_memberships
for insert to authenticated
with check (public.has_tenant_permission(tenant_id, 'tenant.users.write'));

drop policy if exists "memberships_update_managers" on public.tenant_memberships;
create policy "memberships_update_managers" on public.tenant_memberships
for update to authenticated
using (public.has_tenant_permission(tenant_id, 'tenant.users.write'))
with check (public.has_tenant_permission(tenant_id, 'tenant.users.write'));

drop policy if exists "memberships_delete_managers" on public.tenant_memberships;
create policy "memberships_delete_managers" on public.tenant_memberships
for delete to authenticated
using (public.has_tenant_permission(tenant_id, 'tenant.users.write'));

-- 4. Membership role assignment policies ------------------------------------
drop policy if exists "membership_roles_insert_managers" on public.membership_roles;
create policy "membership_roles_insert_managers" on public.membership_roles
for insert to authenticated
with check (public.has_tenant_permission(tenant_id, 'tenant.users.write'));

drop policy if exists "membership_roles_delete_managers" on public.membership_roles;
create policy "membership_roles_delete_managers" on public.membership_roles
for delete to authenticated
using (public.has_tenant_permission(tenant_id, 'tenant.users.write'));

-- 5. Harden helper functions installed by the foundation migration ----------
-- These are authorization primitives; they should not be callable by anon.
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_active_tenant_member(uuid) from public, anon;
revoke all on function public.has_tenant_permission(uuid, text) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_active_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_permission(uuid, text) to authenticated;
