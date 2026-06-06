import type { Tenant } from "@/modules/tenancy/domain/tenant"
import type { UUID } from "@/types/shared"

export type RequestContext = {
  requestId: UUID
  userId: UUID
  tenantId: UUID
  membershipId: UUID
  effectivePermissions: readonly string[]
  enabledFeatures: readonly string[]
  tenant: Tenant
}
