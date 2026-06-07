import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { PlatformRepository } from "@/modules/platform/application/ports/platform-repository"
import type {
  Organization,
  OrganizationStatus,
} from "@/modules/platform/domain/organization"
import type { UUID } from "@/types/shared"

type RpcResult<T> = { data: T; error: { message: string } | null }
type RpcFn = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult<unknown>>

type OrganizationRow = {
  id: string
  slug: string
  name: string
  status: OrganizationStatus
  created_at: string
  tenant_memberships: { count: number }[] | null
}

export class SupabasePlatformRepository implements PlatformRepository {
  async isCurrentUserPlatformAdmin(): Promise<boolean> {
    const client = await createServerSupabaseClient()
    const rpc = client.rpc.bind(client) as unknown as RpcFn
    const { data, error } = await rpc("is_platform_admin")
    if (error) {
      throw new ApplicationError(
        "Unable to verify platform access.",
        "PLATFORM_CHECK_FAILED",
        error,
      )
    }
    return data === true
  }

  async listOrganizations(): Promise<Organization[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("tenants")
      .select("id, slug, name, status, created_at, tenant_memberships(count)")
      .order("created_at", { ascending: false })

    if (error) {
      throw new ApplicationError(
        "Unable to load organizations.",
        "ORGANIZATIONS_READ_FAILED",
        error,
      )
    }

    return (data as unknown as OrganizationRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      memberCount: row.tenant_memberships?.[0]?.count ?? 0,
      createdAt: row.created_at,
    }))
  }

  async provisionOrganization(
    userId: UUID,
    slug: string,
    name: string,
  ): Promise<UUID> {
    const client = await createServerSupabaseClient()
    const rpc = client.rpc.bind(client) as unknown as RpcFn
    const { data, error } = await rpc("provision_organization", {
      p_user_id: userId,
      p_slug: slug,
      p_name: name,
    })

    if (error) {
      // Unique violation on tenants.slug surfaces as a Postgres 23505.
      const code = error.message.includes("duplicate key")
        ? "SLUG_TAKEN"
        : "PROVISION_FAILED"
      throw new ApplicationError(
        "Unable to provision organization.",
        code,
        error,
      )
    }

    return data as UUID
  }

  async setOrganizationStatus(
    tenantId: UUID,
    status: OrganizationStatus,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const rpc = client.rpc.bind(client) as unknown as RpcFn
    const { error } = await rpc("set_organization_status", {
      p_tenant_id: tenantId,
      p_status: status,
    })
    if (error) {
      throw new ApplicationError(
        "Unable to change organization status.",
        "STATUS_CHANGE_FAILED",
        error,
      )
    }
  }

  async grantPlatformAdmin(userId: UUID): Promise<void> {
    const client = await createServerSupabaseClient()
    const rpc = client.rpc.bind(client) as unknown as RpcFn
    const { error } = await rpc("grant_platform_admin", { p_user_id: userId })
    if (error) {
      throw new ApplicationError(
        "Unable to grant platform access.",
        "GRANT_FAILED",
        error,
      )
    }
  }
}
