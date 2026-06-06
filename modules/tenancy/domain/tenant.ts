import type { UUID } from "@/types/shared"

export type Tenant = {
  id: UUID
  slug: string
  name: string
}

export type TenantMembership = {
  id: UUID
  tenantId: UUID
  userId: UUID
}

export type TenantSummary = Tenant & {
  membershipId: UUID
}
