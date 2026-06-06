import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ResolvedTenantAccess,
  TenantRepository,
} from "@/modules/tenancy/application/ports/tenant-repository"
import type { TenantSummary } from "@/modules/tenancy/domain/tenant"

export class SupabaseTenantRepository implements TenantRepository {
  async resolveAccessBySlug(slug: string): Promise<ResolvedTenantAccess | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.rpc("resolve_request_context", {
      tenant_slug: slug,
    })

    if (error) {
      throw new ApplicationError(
        "Unable to resolve tenant access.",
        "TENANT_RESOLUTION_FAILED",
        error,
      )
    }

    const access = data[0]
    if (!access) return null

    return {
      id: access.tenant_id,
      slug: access.resolved_tenant_slug,
      name: access.tenant_name,
      membershipId: access.membership_id,
      effectivePermissions: access.effective_permissions,
      enabledFeatures: access.enabled_features,
    }
  }

  async listForUser(userId: string): Promise<TenantSummary[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("tenant_memberships")
      .select("id, tenants!inner(id, slug, name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at")

    if (error) {
      throw new ApplicationError(
        "Unable to list tenants.",
        "TENANT_LIST_FAILED",
        error,
      )
    }

    return data.map((membership) => {
      const tenant = membership.tenants as { id: string; slug: string; name: string }
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        membershipId: membership.id,
      }
    })
  }
}
