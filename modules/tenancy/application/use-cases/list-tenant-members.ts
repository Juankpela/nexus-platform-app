import type { IdentityAdminRepository } from "@/modules/identity/application/ports/identity-admin-repository"
import type { MemberRepository } from "@/modules/tenancy/application/ports/member-repository"
import type { TenantMember } from "@/modules/tenancy/domain/member"
import type { UUID } from "@/types/shared"

/**
 * Lists the members of a tenant, enriching tenant-schema membership records with
 * emails from the identity provider. Authorization is enforced by the caller
 * (page/action) and by RLS on the underlying tables.
 */
export async function listTenantMembers(
  members: MemberRepository,
  identity: IdentityAdminRepository,
  tenantId: UUID,
): Promise<TenantMember[]> {
  const records = await members.listMembers(tenantId)
  if (records.length === 0) return []

  const emails = await identity.getEmailsByIds(records.map((m) => m.userId))

  return records.map((record) => ({
    membershipId: record.membershipId,
    userId: record.userId,
    status: record.status,
    fullName: record.fullName,
    email: emails.get(record.userId) ?? null,
    roles: record.roles,
  }))
}
