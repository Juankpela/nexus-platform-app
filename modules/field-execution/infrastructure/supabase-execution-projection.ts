import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

// Projects an Execution transition (ADR-020) onto the linked Work Order and its
// assignment, so every surface that references the order — Work Order detail,
// Dispatch board — reflects the technician's live progress. This closes the
// FWX-1 debt where execution sub-states were not mirrored to the macro states.
//
// Runs with the service-role client: the technician deliberately lacks
// `work_orders.write` (least privilege), so the projection is performed with
// elevated privilege on the server after the technician's own action succeeds.

type Target = Exclude<ExecutionStatus, "pending">
type WorkOrderStatus = Database["public"]["Tables"]["work_orders"]["Row"]["status"]
type AssignmentStatus =
  Database["public"]["Tables"]["work_order_assignments"]["Row"]["status"]

const WORK_ORDER_STATUS: Record<Target, WorkOrderStatus> = {
  accepted: "in_progress",
  on_site: "in_progress",
  working: "in_progress",
  completed: "completed",
  unable_to_complete: "on_hold",
}

const ASSIGNMENT_STATUS: Record<Target, AssignmentStatus | null> = {
  accepted: "in_progress",
  on_site: "in_progress",
  working: "in_progress",
  completed: "completed",
  unable_to_complete: null, // leave the assignment; dispatcher decides next step
}

export async function projectExecutionToWorkOrder(input: {
  tenantId: UUID
  workOrderId: UUID
  assignmentId: UUID
  target: Target
  /** The acting technician's user id → shown as "Técnico asignado" on the WO. */
  technicianUserId: UUID
  /** Technician's closing comment, mirrored to the WO so the admin sees it. */
  resolutionNotes?: string | null
  unableReason?: string | null
  now: string
}): Promise<void> {
  const admin = createAdminSupabaseClient()

  const assignmentStatus = ASSIGNMENT_STATUS[input.target]
  if (assignmentStatus) {
    await admin
      .from("work_order_assignments")
      .update({ status: assignmentStatus })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.assignmentId)
  }

  const woPatch: Database["public"]["Tables"]["work_orders"]["Update"] = {
    status: WORK_ORDER_STATUS[input.target],
  }
  if (input.target === "accepted") {
    woPatch.assigned_technician_id = input.technicianUserId
  }
  if (input.target === "working") {
    woPatch.actual_start = input.now
  }
  if (input.target === "completed") {
    woPatch.actual_end = input.now
    if (input.resolutionNotes) {
      woPatch.completion_notes = input.resolutionNotes
      woPatch.resolution_summary = input.resolutionNotes
    }
  }
  if (input.target === "unable_to_complete") {
    woPatch.actual_end = input.now
    if (input.unableReason) {
      woPatch.resolution_summary = `No completado: ${input.unableReason}`
      woPatch.completion_notes = input.unableReason
    }
  }

  await admin
    .from("work_orders")
    .update(woPatch)
    .eq("tenant_id", input.tenantId)
    .eq("id", input.workOrderId)
}

/**
 * Decisión de facturación que toma el técnico al cerrar (señal operacional, no
 * crea la factura). Marca la WO como facturable + aprobada para facturación (de
 * modo que aparezca "lista para facturar" al coordinador), o como NO facturable
 * (cierre administrativo). Corre con admin: el técnico carece de work_orders.write
 * por diseño (mínimo privilegio), igual que la proyección de ejecución.
 */
export async function setWorkOrderBilling(input: {
  tenantId: UUID
  workOrderId: UUID
  billable: boolean
  /** Usuario (técnico) que tomó la decisión, para la traza de aprobación. */
  approvedByUserId: UUID
  now: string
}): Promise<void> {
  const admin = createAdminSupabaseClient()
  const patch: Database["public"]["Tables"]["work_orders"]["Update"] = {
    billable: input.billable,
    billing_approved_at: input.billable ? input.now : null,
    billing_approved_by: input.billable ? input.approvedByUserId : null,
  }
  await admin
    .from("work_orders")
    .update(patch)
    .eq("tenant_id", input.tenantId)
    .eq("id", input.workOrderId)
}
