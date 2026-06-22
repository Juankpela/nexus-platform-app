"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { broadcastFieldMonitorUpdate } from "@/lib/realtime/field-monitor-broadcast"
import {
  confirmCustomerOnAcceptance,
  notifyCustomerEnRoute,
  notifyCustomerWorkCompleted,
} from "@/modules/scheduling/composition"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { generateExpressInvoiceFromWorkOrderRecord } from "@/modules/billing/composition"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  advanceExecutionRecord,
  getMyAssignment,
  markWorkOrderBilling,
  projectExecution,
  resolveCurrentTechnician,
} from "@/modules/field-execution/composition"
import {
  NON_COMPLETION_REASONS,
  type NonCompletionReason,
} from "@/modules/field-execution/domain/disposition"
import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type WorkerActionState = { error: string | null; ok: boolean }

const idSchema = z.uuid()
const reasonSchema = z.enum(NON_COMPLETION_REASONS)
const coordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

function field(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== "string") return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

/**
 * Ubicación PUNTUAL del técnico capturada en el cliente al pulsar "Voy en camino".
 * Opcional por diseño: si falta o es inválida, devolvemos null y el aviso se envía
 * igual sin ETA. NEXUS coordina, no rastrea — esta es una lectura única, no tracking.
 */
function readTechnicianLocation(formData: FormData):
  | { lat: number; lng: number; accuracy: number | null; capturedAt: string | null }
  | null {
  const latRaw = field(formData, "tech_lat")
  const lngRaw = field(formData, "tech_lng")
  if (!latRaw || !lngRaw) return null
  const parsed = coordSchema.safeParse({ lat: Number(latRaw), lng: Number(lngRaw) })
  if (!parsed.success) return null
  const accuracyRaw = field(formData, "tech_accuracy")
  const accuracy =
    accuracyRaw && Number.isFinite(Number(accuracyRaw)) ? Number(accuracyRaw) : null
  return { lat: parsed.data.lat, lng: parsed.data.lng, accuracy, capturedAt: field(formData, "captured_at") }
}

/**
 * Sube la foto de evidencia del cierre al bucket público `reports` (mismo bucket
 * e infraestructura del intake) y devuelve su URL pública, o null. Opcional: no
 * bloquea el cierre si falla.
 */
async function uploadEvidence(
  tenantId: string,
  photoDataUrl: string | null,
): Promise<string | null> {
  if (!photoDataUrl) return null
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(photoDataUrl)
  if (!match) return null
  const [, contentType, b64] = match
  const ext = contentType.endsWith("png") ? "png" : contentType.endsWith("webp") ? "webp" : "jpg"
  const bytes = Buffer.from(b64, "base64")
  if (bytes.byteLength > 5_242_880) return null
  const admin = createAdminSupabaseClient()
  const path = `${tenantId}/${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage
    .from("reports")
    .upload(path, bytes, { contentType, upsert: false })
  if (error) return null
  return admin.storage.from("reports").getPublicUrl(path).data.publicUrl
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
  extras?: {
    resolutionNotes?: string | null
    unableReason?: string | null
    nonCompletionReason?: NonCompletionReason | null
    photoDataUrl?: string | null
    /** Decisión facturable/no al completar (solo aplica a target "completed"). */
    billable?: boolean
  },
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

    // Evidencia fotográfica del cierre: se sube y su URL se anexa a las notas
    // (texto existente) — sin columnas ni tablas nuevas.
    const evidenceUrl = await uploadEvidence(context.tenantId, extras?.photoDataUrl ?? null)
    const resolutionNotes = [extras?.resolutionNotes, evidenceUrl ? `Foto: ${evidenceUrl}` : null]
      .filter(Boolean)
      .join("\n") || null

    await advanceExecutionRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technician.id,
      assignmentId: assignment.assignmentId,
      workOrderId: assignment.workOrderId,
      target,
      resolutionNotes,
      unableReason: extras?.unableReason,
      nonCompletionReason: extras?.nonCompletionReason,
    })

    // Project the transition onto the Work Order + assignment so the WO detail
    // and Dispatch board reflect the technician's live progress.
    await projectExecution({
      tenantId: context.tenantId,
      workOrderId: assignment.workOrderId,
      assignmentId: assignment.assignmentId,
      target,
      technicianUserId: context.userId,
      resolutionNotes,
      unableReason: extras?.unableReason,
    })

    // Notify the tenant's Field Monitor (admin live view) to refresh.
    await broadcastFieldMonitorUpdate(context.tenantId)

    // Hito D — cierre del lazo: solo al ACEPTAR se confirma la visita al cliente
    // (una vez, idempotente). Un fallo de email no debe revertir la aceptación.
    if (target === "accepted") {
      try {
        await confirmCustomerOnAcceptance({
          tenantId: context.tenantId,
          requestId: context.requestId,
          assignmentId: assignment.assignmentId,
          workOrderId: assignment.workOrderId,
        })
      } catch {
        // Best-effort: la aceptación ya ocurrió; la confirmación se reintenta
        // en una futura aceptación idempotente o vía reproceso.
      }
    }

    // Decisión de facturación que tomó el técnico al cerrar: marca la WO como
    // facturable + aprobada (queda "lista para facturar" para el coordinador) o
    // como cierre administrativo (no facturable). No crea la factura.
    if (target === "completed" && extras?.billable !== undefined) {
      await markWorkOrderBilling({
        tenantId: context.tenantId,
        workOrderId: assignment.workOrderId,
        billable: extras.billable,
        approvedByUserId: context.userId,
      })
      // Facturable → genera la factura borrador automática (cliente exprés desde
      // el reportante si la solicitud no tenía cliente). Best-effort: un fallo de
      // facturación NO revierte el cierre del trabajo.
      if (extras.billable) {
        try {
          await generateExpressInvoiceFromWorkOrderRecord({
            tenantId: context.tenantId,
            workOrderId: assignment.workOrderId,
            actorUserId: context.userId,
            requestId: context.requestId,
          })
        } catch {
          // La orden quedó completada y marcada facturable; la factura se puede
          // generar luego desde el detalle de la WO.
        }
      }
    }

    // Cierre del lazo: al COMPLETAR, avisa al cliente (idempotente, best-effort).
    // Un fallo de email no revierte el cierre del trabajo.
    if (target === "completed") {
      try {
        await notifyCustomerWorkCompleted({
          tenantId: context.tenantId,
          requestId: context.requestId,
          assignmentId: assignment.assignmentId,
          workOrderId: assignment.workOrderId,
          triggeredByUserId: context.userId,
        })
      } catch {
        // Best-effort: el trabajo ya quedó completado; el aviso es reintentable.
      }
    }

    // Refresh the oversight surfaces that reference this work order.
    revalidatePath(`/app/${tenantSlug}/work-orders/${assignment.workOrderId}`)
    revalidatePath(`/app/${tenantSlug}/dispatch`)
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

/**
 * Acción LATERAL (no transición): el técnico avisa al cliente que va en camino.
 * NO toca la máquina de estados — la ejecución permanece en `accepted`. Solo
 * válida tras aceptar y antes de llegar (`accepted`). Idempotente del lado del
 * caso de uso; un fallo del canal se reporta al técnico sin afectar la operación.
 */
export async function notifyEnRouteAction(
  _state: WorkerActionState,
  formData: FormData,
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

    const technician = await resolveCurrentTechnician(context.tenantId, context.userId)
    if (!technician) {
      throw new ApplicationError("Not a technician.", "NOT_A_TECHNICIAN")
    }

    const assignment = await getMyAssignment(
      context.tenantId,
      technician.id,
      assignmentId.data,
    )
    if (!assignment) {
      throw new ApplicationError("Assignment not found.", "ASSIGNMENT_NOT_FOUND")
    }

    // Solo se avisa "voy en camino" tras aceptar y antes de llegar al sitio.
    if (assignment.executionStatus !== "accepted") {
      throw new ApplicationError(
        "El aviso de salida solo está disponible tras aceptar y antes de llegar.",
        "INVALID_EXECUTION_TRANSITION",
      )
    }

    // Aviso al cliente: LATERAL y best-effort. Un fallo de notificación NO debe
    // bloquear la salida del técnico (mismo patrón que aceptar/completar). El
    // fallo queda registrado en auditoría (customer.enroute.failed) por el caso
    // de uso y es reintentable; la operación del técnico avanza igual.
    try {
      await notifyCustomerEnRoute({
        tenantId: context.tenantId,
        requestId: context.requestId,
        assignmentId: assignment.assignmentId,
        workOrderId: assignment.workOrderId,
        triggeredByUserId: context.userId,
        technicianLocation: readTechnicianLocation(formData),
      })
    } catch {
      // best-effort: el aviso es reintentable; nunca bloquea al técnico.
    }
  } catch (error) {
    return { error: describe(error), ok: false }
  }

  revalidatePath(`/app/${tenantSlug}/worker/${assignmentId.data}`)
  return { error: null, ok: true }
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
    photoDataUrl: field(formData, "photo"),
    // "true" = facturable; "false" = cierre no facturable; ausente = no decide.
    billable: field(formData, "billable") === "true",
  })
}

export async function reportUnableAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  const reasonParsed = reasonSchema.safeParse(field(formData, "non_completion_reason"))
  return transition(formData, "unable_to_complete", {
    unableReason: field(formData, "unable_reason"),
    nonCompletionReason: reasonParsed.success ? reasonParsed.data : null,
  })
}
