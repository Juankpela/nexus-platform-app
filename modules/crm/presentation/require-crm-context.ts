import { ApplicationError } from "@/lib/errors/application-error"
import { hasPermission } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

/**
 * Resolves the request context for a tenant and asserts the caller holds the
 * given CRM permission. getRequestContext already enforces authentication and
 * tenant membership; this adds the permission gate (defense in depth with RLS).
 */
export async function requireCrmContext(tenantSlug: string, permission: string) {
  const context = await getRequestContext(tenantSlug)
  if (!hasPermission(context.effectivePermissions, permission)) {
    throw new ApplicationError("Forbidden.", "FORBIDDEN")
  }
  return context
}

export type CrmActionState = { error: string | null; ok: boolean }

export function fail(message: string): CrmActionState {
  return { error: message, ok: false }
}

/** Reads a FormData string, returning null for missing/blank values. */
export function field(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
