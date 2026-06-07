import "server-only"

import { cache } from "react"

import {
  createOrganization,
  type CreateOrganizationInput,
} from "@/modules/platform/application/use-cases/create-organization"
import { grantPlatformAdmin } from "@/modules/platform/application/use-cases/grant-platform-admin"
import { listOrganizations } from "@/modules/platform/application/use-cases/list-organizations"
import {
  setOrganizationStatus,
  type SetOrganizationStatusInput,
} from "@/modules/platform/application/use-cases/set-organization-status"
import { SupabaseIdentityProvisioningRepository } from "@/modules/platform/infrastructure/supabase-identity-provisioning-repository"
import { SupabasePlatformRepository } from "@/modules/platform/infrastructure/supabase-platform-repository"
import type { UUID } from "@/types/shared"

export const isCurrentUserPlatformAdmin = cache(() =>
  new SupabasePlatformRepository().isCurrentUserPlatformAdmin(),
)

export const listCachedOrganizations = cache(() =>
  listOrganizations(new SupabasePlatformRepository()),
)

// Mutations are intentionally not cached.
export function createPlatformOrganization(input: CreateOrganizationInput) {
  return createOrganization(
    {
      platform: new SupabasePlatformRepository(),
      identity: new SupabaseIdentityProvisioningRepository(),
    },
    input,
  )
}

export function setPlatformOrganizationStatus(input: SetOrganizationStatusInput) {
  return setOrganizationStatus(new SupabasePlatformRepository(), input)
}

export function grantPlatformAdminAccess(userId: UUID) {
  return grantPlatformAdmin(new SupabasePlatformRepository(), userId)
}
