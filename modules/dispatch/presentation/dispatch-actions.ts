"use server"

import { revalidatePath } from "next/cache"

import { ApplicationError } from "@/lib/errors/application-error"
import { hasPermission } from "@/modules/authorization/domain/permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type DispatchActionState = { error: string | null; ok: boolean }

/**
 * Re-fetches the dispatch board by revalidating the route. The board is a
 * read-only server-rendered view; refresh = invalidate the cache.
 */
export async function refreshDispatchBoardAction(
  tenantSlug: string,
): Promise<DispatchActionState> {
  try {
    const context = await getRequestContext(tenantSlug)
    if (
      !hasPermission(
        context.effectivePermissions,
        SERVICE_PERMISSIONS.dispatchRead,
      )
    ) {
      throw new ApplicationError("Forbidden.", "FORBIDDEN")
    }
  } catch {
    return { error: "No tienes acceso al tablero de despacho.", ok: false }
  }

  revalidatePath(`/app/${tenantSlug}/dispatch`)
  return { error: null, ok: true }
}
