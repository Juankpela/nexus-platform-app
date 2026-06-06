-- Sprint 1 — Foundation completion: atomic role reassignment.
--
-- Replacing a membership's roles is a multi-row delete + insert that must be
-- atomic and authorized. RLS alone cannot guarantee atomicity across the two
-- statements, so this is exposed as a single SECURITY DEFINER function that
-- enforces the same permission gate (tenant.users.write) used by the RLS
-- policies and validates that the membership belongs to the tenant.
--
-- Additive and idempotent. No table structure changes.

create or replace function public.replace_membership_roles(
  p_membership_id uuid,
  p_tenant_id uuid,
  p_role_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Authorization: same gate as the membership_roles write policies.
  if not public.has_tenant_permission(p_tenant_id, 'tenant.users.write') then
    raise exception 'insufficient privilege to manage members'
      using errcode = '42501';
  end if;

  -- Integrity: the membership must belong to the target tenant.
  if not exists (
    select 1
    from public.tenant_memberships membership
    where membership.id = p_membership_id
      and membership.tenant_id = p_tenant_id
  ) then
    raise exception 'membership % not found in tenant %', p_membership_id, p_tenant_id
      using errcode = 'P0002';
  end if;

  -- Atomic replace (single function body = single transaction).
  delete from public.membership_roles
  where membership_id = p_membership_id
    and tenant_id = p_tenant_id;

  insert into public.membership_roles (membership_id, tenant_id, role_id)
  select p_membership_id, p_tenant_id, role_id
  from unnest(p_role_ids) as role_id
  on conflict (membership_id, role_id) do nothing;
end;
$$;

revoke all on function public.replace_membership_roles(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.replace_membership_roles(uuid, uuid, uuid[]) to authenticated;
