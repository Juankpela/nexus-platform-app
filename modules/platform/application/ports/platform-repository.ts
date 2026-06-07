import type {
  Organization,
  OrganizationStatus,
} from "@/modules/platform/domain/organization"
import type { UUID } from "@/types/shared"

export interface PlatformRepository {
  /** True if the authenticated user holds the super_admin platform role. */
  isCurrentUserPlatformAdmin(): Promise<boolean>
  listOrganizations(): Promise<Organization[]>
  /** Atomic: creates the tenant, activates the admin membership, audits. */
  provisionOrganization(userId: UUID, slug: string, name: string): Promise<UUID>
  setOrganizationStatus(
    tenantId: UUID,
    status: OrganizationStatus,
  ): Promise<void>
  grantPlatformAdmin(userId: UUID): Promise<void>
}
