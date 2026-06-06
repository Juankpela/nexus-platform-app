"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  FOUNDATION_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import {
  changeTenantMemberStatus,
  replaceTenantMemberRoles,
} from "@/modules/tenancy/composition"

export type MemberActionState = { error: string | null; ok: boolean }

const initialError = (message: string): MemberActionState => ({
  error: message,
  ok: false,
})

const statusSchema = z.object({
  tenantSlug: z.string().min(1),
  membershipId: z.uuid(),
  status: z.enum(["active", "suspended"]),
})

const rolesSchema = z.object({
  tenantSlug: z.string().min(1),
  membershipId: z.uuid(),
  roleIds: z.array(z.uuid()),
})

/**
 * Resolves the request context for the tenant and asserts the caller may manage
 * users. getRequestContext already enforces authentication and tenant access;
 * this adds the write-permission gate (defense in depth alongside RLS).
 */
async function requireUserManagementContext(tenantSlug: string) {
  const context = await getRequestContext(tenantSlug)
  if (!hasPermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.usersWrite)) {
    throw new ApplicationError("Forbidden.", "FORBIDDEN")
  }
  return context
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "LAST_ADMIN") {
    return "A tenant must keep at least one active administrator."
  }
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage users."
  }
  return "The change could not be completed."
}

export async function updateMemberStatusAction(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = statusSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    membershipId: formData.get("membershipId"),
    status: formData.get("status"),
  })
  if (!parsed.success) return initialError("Invalid request.")

  try {
    const context = await requireUserManagementContext(parsed.data.tenantSlug)
    await changeTenantMemberStatus({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      membershipId: parsed.data.membershipId,
      status: parsed.data.status,
    })
  } catch (error) {
    return initialError(describeError(error))
  }

  revalidatePath(`/app/${parsed.data.tenantSlug}/users`)
  return { error: null, ok: true }
}

export async function updateMemberRolesAction(
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = rolesSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    membershipId: formData.get("membershipId"),
    roleIds: formData.getAll("roleIds"),
  })
  if (!parsed.success) return initialError("Invalid request.")

  try {
    const context = await requireUserManagementContext(parsed.data.tenantSlug)
    await replaceTenantMemberRoles({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      membershipId: parsed.data.membershipId,
      roleIds: parsed.data.roleIds,
    })
  } catch (error) {
    return initialError(describeError(error))
  }

  revalidatePath(`/app/${parsed.data.tenantSlug}/users`)
  return { error: null, ok: true }
}
