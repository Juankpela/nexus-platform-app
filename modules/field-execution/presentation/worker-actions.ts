"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { broadcastFieldMonitorUpdate } from "@/lib/realtime/field-monitor-broadcast"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  advanceExecutionRecord,
  getMyAssignment,
  resolveCurrentTechnician,
} from "@/modules/field-execution/composition"
import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type WorkerActionState = { error: string | null; ok: boolean }

const idSchema = z.uuid()

function field(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== "string") return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

function describe(error: unknown): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case "FORBIDDEN":
        return "No tienes permiso para ejecutar trabajo de campo."
      case "NOT_A_TECHNICIAN":
        return "Tu usuario no está vinculado a un técnico."
      case "ASSIGNMENT_NOT_FOUND":
        return "Esta asignación no es tuya o no existe."
      case "INVALID_EXECUTION_TRANSITION":
        return "Acción no válida para el estado actual."
      case "EXECUTION_NOT_STARTED":
        return "Primero debes aceptar la asignación."
    }
  }
  return "No se pudo completar la acción."
}

async function transition(
  formData: FormData,
  target: Exclude<ExecutionStatus, "pending">,
  extras?: { resolutionNotes?: string | null; unableReason?: string | null },
): Promise<WorkerActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const assignmentId = idSchema.safeParse(field(formData, "assignment_id"))
  if (!tenantSlug || !assignmentId.success) {
    return { error: "Solicitud inválida.", ok: false }
  }

  try {
    const context = await getRequestContext(tenantSlug)
    if (!hasPermission(context.effectivePermissions, SERVICE_PERMISSIONS.fieldExecute)) {
      throw new ApplicationError("Forbidden.", "FORBIDDEN")
    }

    const technician = await resolveCurrentTechnician(
      context.tenantId,
      context.userId,
    )
    if (!technician) {
      throw new ApplicationError("Not a technician.", "NOT_A_TECHNICIAN")
    }

    // Ownership: the assignment must belong to this technician (defense in depth
    // with RLS — the worker can only ever act on their own work).
    const assignment = await getMyAssignment(
      context.tenantId,
      technician.id,
      assignmentId.data,
    )
    if (!assignment) {
      throw new ApplicationError("Assignment not found.", "ASSIGNMENT_NOT_FOUND")
    }

    await advanceExecutionRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technician.id,
      assignmentId: assignment.assignmentId,
      workOrderId: assignment.workOrderId,
      target,
      resolutionNotes: extras?.resolutionNotes,
      unableReason: extras?.unableReason,
    })
    // Notify the tenant's Field Monitor (admin live view) to refresh.
    await broadcastFieldMonitorUpdate(context.tenantId)
  } catch (error) {
    return { error: describe(error), ok: false }
  }

  revalidatePath(`/app/${tenantSlug}/worker`)
  revalidatePath(`/app/${tenantSlug}/worker/${assignmentId.data}`)
  return { error: null, ok: true }
}

export async function acceptAssignmentAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  return transition(formData, "accepted")
}

export async function arriveOnSiteAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  return transition(formData, "on_site")
}

export async function startWorkAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  return transition(formData, "working")
}

export async function completeWorkAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  return transition(formData, "completed", {
    resolutionNotes: field(formData, "resolution_notes"),
  })
}

export async function reportUnableAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  return transition(formData, "unable_to_complete", {
    unableReason: field(formData, "unable_reason"),
  })
}
