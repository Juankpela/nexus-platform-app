import type { Tenant } from "@/modules/tenancy/domain/tenant"
import type { UUID } from "@/types/shared"

export type RequestContext = {
  requestId: UUID
  userId: UUID
  tenantId: UUID
  membershipId: UUID
  effectivePermissions: readonly string[]
  enabledFeatures: readonly string[]
  /** Claves de los roles del usuario en el tenant (gating por rol en UI). */
  roleKeys: readonly string[]
  tenant: Tenant
}
