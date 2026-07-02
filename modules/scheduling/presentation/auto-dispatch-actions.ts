"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  runAutoDispatchForCase,
  scheduleCaseOption,
  type AutoDispatchResult,
} from "@/modules/scheduling/composition"
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
    revalidatePath(`/app/${tenantSlug}/work-orders`)
    return { error: null, result }
  } catch (error) {
    let message = "No se pudo ejecutar el despacho autónomo."
    if (error instanceof ApplicationError) {
      if (error.code === "FORBIDDEN") {
        message = "No tienes permiso para despachar."
      } else if (error.code === "CASE_ALREADY_HAS_WORK_ORDER") {
        message = "Este caso ya tiene una orden de trabajo activa."
      }
    }
    return { error: message, result: null }
  }
}

const optionSchema = z.object({
  technicianId: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
})

export type ScheduleOptionActionState = {
  error: string | null
  workOrderId: string | null
}

/**
 * El supervisor agenda una de las ALTERNATIVAS de la salida asistida (opciones
 * fuera de las reglas del motor: sin especialidad verificada y/o fuera de SLA).
 * Decisión humana con plena consciencia; queda auditada como override.
 */
export async function scheduleCaseOptionAction(
  tenantSlug: string,
  caseId: string,
  option: { technicianId: string; startsAt: string; endsAt: string },
): Promise<ScheduleOptionActionState> {
  const parsedCase = idSchema.safeParse(caseId)
  const parsedOption = optionSchema.safeParse(option)
  if (!parsedCase.success || !parsedOption.success) {
    return { error: "Opción inválida.", workOrderId: null }
  }

  try {
    const context = await requireSchedulingContext(
      tenantSlug,
      SERVICE_PERMISSIONS.schedulingWrite,
    )

    const result = await scheduleCaseOption({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      caseId: parsedCase.data,
      technicianId: parsedOption.data.technicianId,
      startsAt: parsedOption.data.startsAt,
      endsAt: parsedOption.data.endsAt,
    })

    revalidatePath(`/app/${tenantSlug}/cases/${caseId}`)
    revalidatePath(`/app/${tenantSlug}/dispatch`)
    revalidatePath(`/app/${tenantSlug}/work-orders`)
    return { error: null, workOrderId: result.workOrderId }
  } catch (error) {
    let message = "No se pudo agendar la opción."
    if (error instanceof ApplicationError) {
      if (error.code === "FORBIDDEN") {
        message = "No tienes permiso para despachar."
      } else if (error.code === "CASE_ALREADY_HAS_WORK_ORDER") {
        message = "Este caso ya tiene una orden de trabajo activa."
      }
    }
    return { error: message, workOrderId: null }
  }
}
