import { ApplicationError } from "@/lib/errors/application-error"
import type { IdentityProvisioningRepository } from "@/modules/platform/application/ports/identity-provisioning-repository"
import type { PlatformRepository } from "@/modules/platform/application/ports/platform-repository"
import { ORGANIZATION_SLUG_PATTERN } from "@/modules/platform/domain/organization"
import type { UUID } from "@/types/shared"

export type CreateOrganizationInput = {
  organizationName: string
  slug: string
  adminEmail: string
  adminFullName: string | null
  adminPassword: string
}

export type CreateOrganizationDeps = {
  platform: PlatformRepository
  identity: IdentityProvisioningRepository
}

/**
 * Provisions a new organization (tenant) and its first administrator.
 *
 * 1. Creates the auth user with a temporary password (admin API).
 * 2. Calls the atomic provision_organization RPC, which creates the tenant,
 *    activates the membership, assigns tenant_admin, and audits — all gated by
 *    is_platform_admin() at the database.
 */
export async function createOrganization(
  deps: CreateOrganizationDeps,
  input: CreateOrganizationInput,
): Promise<UUID> {
  const slug = input.slug.trim().toLowerCase()
  if (!ORGANIZATION_SLUG_PATTERN.test(slug)) {
    throw new ApplicationError("Invalid organization slug.", "INVALID_SLUG")
  }
  if (input.adminPassword.length < 8) {
    throw new ApplicationError("Password too short.", "WEAK_PASSWORD")
  }

  const userId = await deps.identity.createUser({
    email: input.adminEmail.trim().toLowerCase(),
    password: input.adminPassword,
    fullName: input.adminFullName?.trim() || null,
  })

  return deps.platform.provisionOrganization(userId, slug, input.organizationName.trim())
}
