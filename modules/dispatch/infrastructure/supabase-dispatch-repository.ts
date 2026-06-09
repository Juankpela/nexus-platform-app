import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  DispatchRepository,
  RawTechnicianWorkload,
} from "@/modules/dispatch/application/ports/dispatch-repository"
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  type WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type WorkloadRpcRow =
  Database["public"]["Functions"]["dispatch_technician_workload"]["Returns"][number]

type AssignmentRow = Database["public"]["Tables"]["work_order_assignments"]["Row"]
type AssignmentRowWithRefs = AssignmentRow & {
  work_orders: { work_order_number: string; subject: string } | null
  technicians: { first_name: string; last_name: string } | null
}

const ASSIGNMENT_SELECT =
  "*, work_orders(work_order_number, subject), technicians(first_name, last_name)"

function toAssignment(row: AssignmentRowWithRefs): WorkOrderAssignment {
  const techName = row.technicians
    ? [row.technicians.first_name, row.technicians.last_name]
        .filter(Boolean)
        .join(" ")
    : null
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    workOrderNumber: row.work_orders?.work_order_number ?? null,
    workOrderSubject: row.work_orders?.subject ?? null,
    technicianId: row.technician_id,
    technicianName: techName,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseDispatchRepository implements DispatchRepository {
  async getWorkloads(
    tenantId: UUID,
    fromIso: string,
    toIso: string,
  ): Promise<RawTechnicianWorkload[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.rpc("dispatch_technician_workload", {
      p_tenant_id: tenantId,
      p_from: fromIso,
      p_to: toIso,
    })

    if (error) {
      throw new ApplicationError(
        "Unable to load dispatch workloads.",
        "DISPATCH_WORKLOAD_FAILED",
        error,
      )
    }

    return ((data ?? []) as WorkloadRpcRow[]).map((row) => ({
      technicianId: row.technician_id,
      technicianName: [row.first_name, row.last_name].filter(Boolean).join(" "),
      technicianStatus: row.status,
      assignmentCount: Number(row.assignment_count),
      scheduledMinutes: Number(row.scheduled_minutes),
    }))
  }

  async listDayAssignments(
    tenantId: UUID,
    fromIso: string,
    toIso: string,
  ): Promise<WorkOrderAssignment[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("tenant_id", tenantId)
      .in("status", ACTIVE_ASSIGNMENT_STATUSES)
      .gte("scheduled_start", fromIso)
      .lt("scheduled_start", toIso)
      .order("scheduled_start", { ascending: true })

    if (error) {
      throw new ApplicationError(
        "Unable to load day assignments.",
        "DISPATCH_DAY_ASSIGNMENTS_FAILED",
        error,
      )
    }
    return (data as unknown as AssignmentRowWithRefs[]).map(toAssignment)
  }
}
