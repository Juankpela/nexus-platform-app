"use server"

import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { findEligibleTechnicians } from "@/modules/scheduling/composition"
import type { EligibilityResult } from "@/modules/scheduling/domain/eligibility"
import { getWorkOrderRecord } from "@/modules/service/composition"
import { SKILL_LEVELS } from "@/modules/service/domain/skill"
import {
  field,
  requireServiceContext,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const levelSchema = z.enum(SKILL_LEVELS)

export type EligibilityActionState = {
  error: string | null
  results: EligibilityResult[] | null
}

const FAIL = (error: string): EligibilityActionState => ({ error, results: null })

/**
 * Read-only: evaluates which technicians are eligible for a work order's window
 * given the dispatcher-supplied skill/zone criteria. Suggestion only — never
 * assigns (manual flow unchanged, ADR-028).
 */
export async function findEligibleTechniciansAction(
  _state: EligibilityActionState,
  formData: FormData,
): Promise<EligibilityActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const workOrderId = idSchema.safeParse(field(formData, "work_order_id"))
  if (!tenantSlug || !workOrderId.success) return FAIL("Solicitud inválida.")

  const skillRaw = field(formData, "skill_id")
  const zoneRaw = field(formData, "zone_id")
  let skillId: string | null = null
  if (skillRaw) {
    const parsed = idSchema.safeParse(skillRaw)
    if (!parsed.success) return FAIL("Habilidad inválida.")
    skillId = parsed.data
  }
  let zoneId: string | null = null
  if (zoneRaw) {
    const parsed = idSchema.safeParse(zoneRaw)
    if (!parsed.success) return FAIL("Zona inválida.")
    zoneId = parsed.data
  }
  const level = levelSchema.safeParse(field(formData, "level"))

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.schedulingRead,
    )
    const workOrder = await getWorkOrderRecord(context.tenantId, workOrderId.data)
    if (!workOrder) return FAIL("Orden de trabajo no encontrada.")
    if (!workOrder.scheduledStart || !workOrder.scheduledEnd) {
      return FAIL("La orden no tiene ventana programada (inicio y fin). Configúrala primero.")
    }

    const results = await findEligibleTechnicians(context.tenantId, {
      skillId,
      minLevel: skillId ? (level.success ? level.data : "junior") : null,
      zoneId,
      startsAt: workOrder.scheduledStart,
      endsAt: workOrder.scheduledEnd,
    })
    return { error: null, results }
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
      return FAIL("No tienes permiso para ver elegibilidad.")
    }
    return FAIL("No se pudo calcular la elegibilidad.")
  }
}
