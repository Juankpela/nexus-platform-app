"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { runAutoDispatchForCase, type AutoDispatchResult } from "@/modules/scheduling/composition"
import { requireSchedulingContext } from "@/modules/scheduling/presentation/require-scheduling-context"

const idSchema = z.uuid()

export type AutoDispatchActionState = {
  error: string | null
  result: AutoDispatchResult | null
}

/**
 * Dispara el despacho autónomo (ADR-033, Hito A) para un caso. La DECISIÓN es
 * 100% determinística (clasificación por reglas + motores existentes); esta
 * acción solo autoriza (schedulingWrite) y aplica. Reutiliza
 * `runAutoDispatchForCase`.
 */
export async function autoDispatchCaseAction(
  tenantSlug: string,
  caseId: string,
  /** Override del supervisor: agendar la opción encontrada aunque escale por SLA. */
  force = false,
): Promise<AutoDispatchActionState> {
  const parsed = idSchema.safeParse(caseId)
  if (!parsed.success) return { error: "Caso inválido.", result: null }

  try {
    const context = await requireSchedulingContext(
      tenantSlug,
      SERVICE_PERMISSIONS.schedulingWrite,
    )

    const result = await runAutoDispatchForCase({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      caseId: parsed.data,
      force,
    })

    revalidatePath(`/app/${tenantSlug}/cases/${caseId}`)
    revalidatePath(`/app/${tenantSlug}/dispatch`)
    revalidatePath(`/app/${tenantSlug}/dispatch/assisted`)
    revalidatePath(`/app/${tenantSlug}/work-orders`)
    return { error: null, result }
  } catch (error) {
    const message =
      error instanceof ApplicationError && error.code === "FORBIDDEN"
        ? "No tienes permiso para despachar."
        : "No se pudo ejecutar el despacho autónomo."
    return { error: message, result: null }
  }
}
