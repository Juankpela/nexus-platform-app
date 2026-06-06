import type { TenantRepository } from "@/modules/tenancy/application/ports/tenant-repository"
import type { UUID } from "@/types/shared"

export async function listUserTenants(
  repository: TenantRepository,
  userId: UUID,
) {
  return repository.listForUser(userId)
}
