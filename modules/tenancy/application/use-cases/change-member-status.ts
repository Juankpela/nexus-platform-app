import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { MemberRepository } from "@/modules/tenancy/application/ports/member-repository"
import type { MembershipStatus } from "@/modules/tenancy/domain/member"
import type { UUID } from "@/types/shared"

export type ChangeMemberStatusDeps = {
  members: MemberRepository
  audit: AuditRepository
}

export type ChangeMemberStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  membershipId: UUID
  status: MembershipStatus
}

/**
 * Activates or deactivates a tenant member. Enforces the invariant that a
 * tenant must always retain at least one active administrator, and records an
 * audit event. Authorization is enforced upstream (action + RLS).
 */
export async function changeMemberStatus(
  { members, audit }: ChangeMemberStatusDeps,
  input: ChangeMemberStatusInput,
): Promise<void> {
  const summary = await members.getMembershipSummary(
    input.membershipId,
    input.tenantId,
  )
  if (!summary) {
    throw new ApplicationError("Member not found.", "MEMBER_NOT_FOUND")
  }

  if (summary.status === input.status) return

  if (input.status !== "active") {
    const admins = await members.listActiveAdminMembershipIds(input.tenantId)
    if (admins.length === 1 && admins[0] === input.membershipId) {
      throw new ApplicationError(
        "A tenant must keep at least one active administrator.",
        "LAST_ADMIN",
      )
    }
  }

  await members.setMemberStatus(input.membershipId, input.tenantId, input.status)

  await audit.append({
    eventType: "tenant.member.status_changed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "membership",
    subjectId: input.membershipId,
    action: "member.status_changed",
    metadata: {
      from: summary.status,
      to: input.status,
      targetUserId: summary.userId,
    },
    requestId: input.requestId,
    source: "web",
  })
}
