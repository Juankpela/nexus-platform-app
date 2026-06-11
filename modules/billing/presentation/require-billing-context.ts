import { ApplicationError } from "@/lib/errors/application-error"
import { hasPermission } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

/**
 * Resolves the request context for a tenant and asserts the caller holds the given
 * billing permission. getRequestContext enforces authentication and tenant
 * membership; this adds the permission gate (defense in depth with RLS).
 */
export async function requireBillingContext(
  tenantSlug: string,
  permission: string,
) {
  const context = await getRequestContext(tenantSlug)
  if (!hasPermission(context.effectivePermissions, permission)) {
    throw new ApplicationError("Forbidden.", "FORBIDDEN")
  }
  return context
}

export type BillingActionState = { error: string | null; ok: boolean }

export function fail(message: string): BillingActionState {
  return { error: message, ok: false }
}
