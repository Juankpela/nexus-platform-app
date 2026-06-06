import type { MemberRepository } from "@/modules/tenancy/application/ports/member-repository"
import type { AssignableRole } from "@/modules/tenancy/domain/member"

/**
 * Lists the roles that can be assigned to a tenant membership. Roles are
 * platform-defined (is_system) and shared across tenants in Sprint 1.
 */
export async function listAssignableRoles(
  members: MemberRepository,
): Promise<AssignableRole[]> {
  return members.listAssignableRoles()
}
