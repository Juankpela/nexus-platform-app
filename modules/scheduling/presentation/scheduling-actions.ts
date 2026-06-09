"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  assignWorkOrderRecord,
  reassignWorkOrderRecord,
  unassignWorkOrderRecord,
} from "@/modules/scheduling/composition"
import {
  fail,
  field,
  requireSchedulingContext,
  type SchedulingActionState,
} from "@/modules/scheduling/presentation/require-scheduling-context"

const idSchema = z.uuid()

function parseTimestamp(raw: string | null): string | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case "FORBIDDEN":
        return "No tienes permiso para gestionar la agenda."
      case "WORK_ORDER_NOT_FOUND":
        return "Orden de trabajo no encontrada."
      case "TECHNICIAN_NOT_FOUND":
        return "Técnico no encontrado."
      case "TECHNICIAN_UNAVAILABLE":
        return "El técnico no está disponible (inactivo o en licencia)."
      case "ASSIGNMENT_OVERLAP":
        return "El técnico ya tiene una asignación en ese horario."
      case "INVALID_TIME_WINDOW":
        return "La hora de fin debe ser posterior a la de inicio."
      case "ASSIGNMENT_NOT_FOUND":
        return "Asignación no encontrada."
    }
  }
  return "No se pudo completar la acción."
}

function revalidate(tenantSlug: string, id?: string) {
  revalidatePath(`/app/${tenantSlug}/schedule`)
  if (id) revalidatePath(`/app/${tenantSlug}/schedule/${id}`)
}

export async function assignWorkOrderAction(
  _state: SchedulingActionState,
  formData: FormData,
): Promise<SchedulingActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const workOrderId = idSchema.safeParse(field(formData, "work_order_id"))
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const start = parseTimestamp(field(formData, "scheduled_start"))
  const end = parseTimestamp(field(formData, "scheduled_end"))
  if (!tenantSlug || !workOrderId.success || !technicianId.success || !start || !end) {
    return fail("Completa orden, técnico y horario.")
  }

  try {
    const context = await requireSchedulingContext(
      tenantSlug,
      SERVICE_PERMISSIONS.schedulingWrite,
    )
    await assignWorkOrderRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: {
        workOrderId: workOrderId.data,
        technicianId: technicianId.data,
        scheduledStart: start,
        scheduledEnd: end,
      },
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug)
  return { error: null, ok: true }
}

export async function reassignWorkOrderAction(
  _state: SchedulingActionState,
  formData: FormData,
): Promise<SchedulingActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const start = parseTimestamp(field(formData, "scheduled_start"))
  const end = parseTimestamp(field(formData, "scheduled_end"))
  if (!tenantSlug || !id.success || !technicianId.success || !start || !end) {
    return fail("Completa técnico y horario.")
  }

  try {
    const context = await requireSchedulingContext(
      tenantSlug,
      SERVICE_PERMISSIONS.schedulingWrite,
    )
    await reassignWorkOrderRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      technicianId: technicianId.data,
      scheduledStart: start,
      scheduledEnd: end,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}

export async function unassignWorkOrderAction(
  _state: SchedulingActionState,
  formData: FormData,
): Promise<SchedulingActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireSchedulingContext(
      tenantSlug,
      SERVICE_PERMISSIONS.schedulingWrite,
    )
    await unassignWorkOrderRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug)
  return { error: null, ok: true }
}
