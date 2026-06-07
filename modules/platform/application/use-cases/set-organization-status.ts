import type { PlatformRepository } from "@/modules/platform/application/ports/platform-repository"
import type { OrganizationStatus } from "@/modules/platform/domain/organization"
import type { UUID } from "@/types/shared"

export type SetOrganizationStatusInput = {
  tenantId: UUID
  status: OrganizationStatus
}

export function setOrganizationStatus(
  platform: PlatformRepository,
  input: SetOrganizationStatusInput,
) {
  return platform.setOrganizationStatus(input.tenantId, input.status)
}
