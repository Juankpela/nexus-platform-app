import type { UUID } from "@/types/shared"

export type MembershipStatus = "invited" | "active" | "suspended"

/**
 * The role key that grants tenant administration. Used to enforce the
 * "a tenant must always have at least one active administrator" invariant.
 */
export const TENANT_ADMIN_ROLE_KEY = "tenant_admin"

export type MemberRole = {
  id: UUID
  key: string
  name: string
}

/**
 * A member of a tenant, as presented to user-management screens. Identity data
 * (email) is sourced from the auth provider; profile/role data from the tenant
 * schema. Composed by the listTenantMembers use case.
 */
export type TenantMember = {
  membershipId: UUID
  userId: UUID
  status: MembershipStatus
  fullName: string | null
  email: string | null
  roles: MemberRole[]
}

/** A role that can be assigned to a membership. */
export type AssignableRole = {
  id: UUID
  key: string
  name: string
  description: string | null
}
