"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { resolveTrackingMessage } from "@/modules/service/composition"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()

/**
 * El coordinador marca una solicitud del cliente (reagendar/cancelar) como
 * atendida. No muta la operación por sí sola — solo cierra la bandera una vez
 * que el coordinador tomó la decisión correspondiente sobre la WO.
 */
export async function resolveTrackingMessageAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const workOrderId = idSchema.safeParse(field(formData, "workOrderId"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    await resolveTrackingMessage(context.tenantId, id.data, context.userId)
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
      return fail("No tienes permiso para atender solicitudes.")
    }
    return fail("No se pudo marcar como atendida.")
  }

  if (workOrderId.success) {
    revalidatePath(`/app/${tenantSlug}/work-orders/${workOrderId.data}`)
  }
  return { error: null, ok: true }
}
