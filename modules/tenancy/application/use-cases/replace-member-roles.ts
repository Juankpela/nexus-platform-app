import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { MemberRepository } from "@/modules/tenancy/application/ports/member-repository"
import { TENANT_ADMIN_ROLE_KEY } from "@/modules/tenancy/domain/member"
import type { UUID } from "@/types/shared"

export type ReplaceMemberRolesDeps = {
  members: MemberRepository
  audit: AuditRepository
}

export type ReplaceMemberRolesInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  membershipId: UUID
  roleIds: UUID[]
}

/**
 * Replaces the full set of roles assigned to a member. Validates that every
 * role exists, enforces the last-active-administrator invariant, delegates the
 * atomic write to the repository (RPC), and records an audit event.
 */
export async function replaceMemberRoles(
  { members, audit }: ReplaceMemberRolesDeps,
  input: ReplaceMemberRolesInput,
): Promise<void> {
  const summary = await members.getMembershipSummary(
    input.membershipId,
    input.tenantId,
  )
  if (!summary) {
    throw new ApplicationError("Member not found.", "MEMBER_NOT_FOUND")
  }

  const roles = await members.listAssignableRoles()
  const rolesById = new Map(roles.map((role) => [role.id, role]))
  const requestedIds = Array.from(new Set(input.roleIds))

  for (const roleId of requestedIds) {
    if (!rolesById.has(roleId)) {
      throw new ApplicationError("Unknown role.", "UNKNOWN_ROLE")
    }
  }

  const willRetainAdmin = requestedIds.some(
    (roleId) => rolesById.get(roleId)?.key === TENANT_ADMIN_ROLE_KEY,
  )

  if (!willRetainAdmin) {
    const admins = await members.listActiveAdminMembershipIds(input.tenantId)
    if (admins.length === 1 && admins[0] === input.membershipId) {
      throw new ApplicationError(
        "A tenant must keep at least one active administrator.",
        "LAST_ADMIN",
      )
    }
  }

  await members.replaceMemberRoles(
    input.membershipId,
    input.tenantId,
    requestedIds,
  )

  await audit.append({
    eventType: "tenant.member.roles_changed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "membership",
    subjectId: input.membershipId,
    action: "member.roles_changed",
    metadata: {
      from: summary.roleKeys,
      toRoleIds: requestedIds,
      targetUserId: summary.userId,
    },
    requestId: input.requestId,
    source: "web",
  })
}
