import type {
  AssignableRole,
  MembershipStatus,
} from "@/modules/tenancy/domain/member"
import type { UUID } from "@/types/shared"

/**
 * A member as stored in the tenant schema, without identity-provider data.
 * Email enrichment is the responsibility of the orchestrating use case via the
 * identity port, keeping this repository scoped to the tenancy bounded context.
 */
export type TenantMemberRecord = {
  membershipId: UUID
  userId: UUID
  status: MembershipStatus
  fullName: string | null
  roles: { id: UUID; key: string; name: string }[]
}

/** Minimal membership state used to enforce mutation invariants. */
export type MembershipSummary = {
  userId: UUID
  status: MembershipStatus
  roleKeys: string[]
}

export interface MemberRepository {
  listMembers(tenantId: UUID): Promise<TenantMemberRecord[]>
  listAssignableRoles(): Promise<AssignableRole[]>
  getMembershipSummary(
    membershipId: UUID,
    tenantId: UUID,
  ): Promise<MembershipSummary | null>
  /** Membership ids of the tenant's currently active administrators. */
  listActiveAdminMembershipIds(tenantId: UUID): Promise<UUID[]>
  setMemberStatus(
    membershipId: UUID,
    tenantId: UUID,
    status: MembershipStatus,
  ): Promise<void>
  replaceMemberRoles(
    membershipId: UUID,
    tenantId: UUID,
    roleIds: UUID[],
  ): Promise<void>

  /**
   * Inserts a new active membership for an existing auth user and optionally
   * assigns initial roles. Returns the new membership id.
   */
  addMember(tenantId: UUID, userId: UUID, roleIds: UUID[]): Promise<UUID>
}
