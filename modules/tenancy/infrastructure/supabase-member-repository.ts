import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  MemberRepository,
  MembershipSummary,
  TenantMemberRecord,
} from "@/modules/tenancy/application/ports/member-repository"
import {
  type AssignableRole,
  type MembershipStatus,
  TENANT_ADMIN_ROLE_KEY,
} from "@/modules/tenancy/domain/member"
import type { UUID } from "@/types/shared"

type EmbeddedRole = { id: string; key: string; name: string } | null

export class SupabaseMemberRepository implements MemberRepository {
  async listMembers(tenantId: UUID): Promise<TenantMemberRecord[]> {
    const client = await createServerSupabaseClient()

    const { data: memberships, error } = await client
      .from("tenant_memberships")
      .select("id, user_id, status, membership_roles(roles(id, key, name))")
      .eq("tenant_id", tenantId)
      .order("created_at")

    if (error) {
      throw new ApplicationError(
        "Unable to list members.",
        "MEMBER_LIST_FAILED",
        error,
      )
    }

    // Profiles are fetched separately: there is no foreign key between
    // tenant_memberships.user_id and profiles.id (both reference auth.users),
    // so PostgREST cannot embed them. RLS scopes this to readable co-members.
    const userIds = memberships.map((membership) => membership.user_id)
    const profileNames = new Map<string, string | null>()

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await client
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      if (profileError) {
        throw new ApplicationError(
          "Unable to load member profiles.",
          "MEMBER_PROFILE_LOAD_FAILED",
          profileError,
        )
      }

      for (const profile of profiles) {
        profileNames.set(profile.id, profile.full_name)
      }
    }

    return memberships.map((membership) => {
      const roles = (membership.membership_roles ?? [])
        .map((membershipRole) => membershipRole.roles as EmbeddedRole)
        .filter((role): role is NonNullable<EmbeddedRole> => role !== null)
        .map((role) => ({ id: role.id, key: role.key, name: role.name }))

      return {
        membershipId: membership.id,
        userId: membership.user_id,
        status: membership.status,
        fullName: profileNames.get(membership.user_id) ?? null,
        roles,
      }
    })
  }

  async listAssignableRoles(): Promise<AssignableRole[]> {
    const client = await createServerSupabaseClient()

    const { data, error } = await client
      .from("roles")
      .select("id, key, name, description")
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to list roles.",
        "ROLE_LIST_FAILED",
        error,
      )
    }

    return data.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
    }))
  }

  async getMembershipSummary(
    membershipId: UUID,
    tenantId: UUID,
  ): Promise<MembershipSummary | null> {
    const client = await createServerSupabaseClient()

    const { data, error } = await client
      .from("tenant_memberships")
      .select("user_id, status, membership_roles(roles(key))")
      .eq("id", membershipId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load member.",
        "MEMBER_LOAD_FAILED",
        error,
      )
    }
    if (!data) return null

    const roleKeys = (data.membership_roles ?? [])
      .map((membershipRole) => (membershipRole.roles as { key: string } | null))
      .filter((role): role is { key: string } => role !== null)
      .map((role) => role.key)

    return { userId: data.user_id, status: data.status, roleKeys }
  }

  async listActiveAdminMembershipIds(tenantId: UUID): Promise<UUID[]> {
    const client = await createServerSupabaseClient()

    // Resolved in discrete steps to avoid filtering on embedded resources.
    const { data: adminRole, error: roleError } = await client
      .from("roles")
      .select("id")
      .eq("key", TENANT_ADMIN_ROLE_KEY)
      .maybeSingle()

    if (roleError) {
      throw new ApplicationError(
        "Unable to resolve administrator role.",
        "ADMIN_ROLE_LOOKUP_FAILED",
        roleError,
      )
    }
    if (!adminRole) return []

    const { data: adminRows, error: adminError } = await client
      .from("membership_roles")
      .select("membership_id")
      .eq("tenant_id", tenantId)
      .eq("role_id", adminRole.id)

    if (adminError) {
      throw new ApplicationError(
        "Unable to list administrators.",
        "ADMIN_LIST_FAILED",
        adminError,
      )
    }
    if (adminRows.length === 0) return []

    const adminMembershipIds = adminRows.map((row) => row.membership_id)

    const { data: activeRows, error: activeError } = await client
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .in("id", adminMembershipIds)

    if (activeError) {
      throw new ApplicationError(
        "Unable to verify active administrators.",
        "ADMIN_ACTIVE_CHECK_FAILED",
        activeError,
      )
    }

    return activeRows.map((row) => row.id)
  }

  async setMemberStatus(
    membershipId: UUID,
    tenantId: UUID,
    status: MembershipStatus,
  ): Promise<void> {
    const client = await createServerSupabaseClient()

    const { error } = await client
      .from("tenant_memberships")
      .update({ status })
      .eq("id", membershipId)
      .eq("tenant_id", tenantId)

    if (error) {
      throw new ApplicationError(
        "Unable to update member status.",
        "MEMBER_STATUS_UPDATE_FAILED",
        error,
      )
    }
  }

  async replaceMemberRoles(
    membershipId: UUID,
    tenantId: UUID,
    roleIds: UUID[],
  ): Promise<void> {
    const client = await createServerSupabaseClient()

    const { error } = await client.rpc("replace_membership_roles", {
      p_membership_id: membershipId,
      p_tenant_id: tenantId,
      p_role_ids: roleIds,
    })

    if (error) {
      throw new ApplicationError(
        "Unable to update member roles.",
        "MEMBER_ROLES_UPDATE_FAILED",
        error,
      )
    }
  }

  async addMember(tenantId: UUID, userId: UUID, roleIds: UUID[]): Promise<UUID> {
    const client = await createServerSupabaseClient()

    const { data, error } = await client
      .from("tenant_memberships")
      .insert({ tenant_id: tenantId, user_id: userId, status: "active" as MembershipStatus })
      .select("id")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to add member to workspace.",
        "MEMBER_ADD_FAILED",
        error ?? undefined,
      )
    }

    if (roleIds.length > 0) {
      await this.replaceMemberRoles(data.id, tenantId, roleIds)
    }

    return data.id
  }
}
