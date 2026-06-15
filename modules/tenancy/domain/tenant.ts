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

/** Issuer data shown on quotes/invoices PDFs. All optional. */
export type TenantBusinessProfile = {
  legalName: string | null
  taxId: string | null
  phone: string | null
  address: string | null
  email: string | null
}
