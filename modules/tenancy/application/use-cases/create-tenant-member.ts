import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { IdentityAdminRepository } from "@/modules/identity/application/ports/identity-admin-repository"
import type { MemberRepository } from "@/modules/tenancy/application/ports/member-repository"
import type { UUID } from "@/types/shared"

export type CreateTenantMemberDeps = {
  identity: IdentityAdminRepository
  members: MemberRepository
  audit: AuditRepository
}

export type CreateTenantMemberInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  email: string
  password: string
  fullName: string | null
  roleIds: UUID[]
}

/**
 * Creates an auth user and provisions them as an active member of the tenant.
 * Authorization is enforced upstream (server action + RLS).
 */
export async function createTenantMember(
  { identity, members, audit }: CreateTenantMemberDeps,
  input: CreateTenantMemberInput,
): Promise<UUID> {
  if (input.password.length < 8) {
    throw new ApplicationError(
      "Password must be at least 8 characters.",
      "WEAK_PASSWORD",
    )
  }

  const userId = await identity.createUser({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
  })

  const membershipId = await members.addMember(
    input.tenantId,
    userId,
    input.roleIds,
  )

  await audit.append({
    eventType: "tenant.member.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "membership",
    subjectId: membershipId,
    action: "member.created",
    metadata: {
      email: input.email,
      fullName: input.fullName,
      roleIds: input.roleIds,
    },
    requestId: input.requestId,
    source: "web",
  })

  return membershipId
}
