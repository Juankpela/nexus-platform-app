import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ResolvedTenantAccess,
  TenantRepository,
} from "@/modules/tenancy/application/ports/tenant-repository"
import type {
  TenantBusinessProfile,
  TenantSummary,
} from "@/modules/tenancy/domain/tenant"

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

  /**
   * Reads issuer business fields. Uses the service-role client (no per-row RLS
   * on tenants); callers gate access in app code by tenant.settings.read.
   */
  async getBusinessProfile(tenantId: string): Promise<TenantBusinessProfile> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from("tenants")
      .select("legal_name, tax_id, phone, address, email")
      .eq("id", tenantId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load tenant profile.",
        "TENANT_PROFILE_LOAD_FAILED",
        error,
      )
    }
    return {
      legalName: data?.legal_name ?? null,
      taxId: data?.tax_id ?? null,
      phone: data?.phone ?? null,
      address: data?.address ?? null,
      email: data?.email ?? null,
    }
  }

  /** Updates issuer business fields. Gated in app code by tenant.settings.write. */
  async updateBusinessProfile(
    tenantId: string,
    profile: TenantBusinessProfile,
  ): Promise<void> {
    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from("tenants")
      .update({
        legal_name: profile.legalName,
        tax_id: profile.taxId,
        phone: profile.phone,
        address: profile.address,
        email: profile.email,
      })
      .eq("id", tenantId)

    if (error) {
      throw new ApplicationError(
        "Unable to update tenant profile.",
        "TENANT_PROFILE_UPDATE_FAILED",
        error,
      )
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
