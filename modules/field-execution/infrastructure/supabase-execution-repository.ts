import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ExecutionPatch,
  ExecutionRepository,
} from "@/modules/field-execution/application/ports/execution-repository"
import type {
  Execution,
  WorkerAssignment,
} from "@/modules/field-execution/domain/execution"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type ExecutionRow = Database["public"]["Tables"]["work_order_executions"]["Row"]

type WorkerAssignmentRow = {
  id: string
  scheduled_start: string
  scheduled_end: string
  work_order_id: string
  work_orders: {
    work_order_number: string
    subject: string
    companies: { name: string } | null
    assets: { name: string; asset_number: string } | null
  } | null
  work_order_executions: { id: string; status: ExecutionRow["status"] }[] | null
}

const ASSIGNMENT_SELECT =
  "id, scheduled_start, scheduled_end, work_order_id, " +
  "work_orders(work_order_number, subject, companies(name), assets(name, asset_number)), " +
  "work_order_executions(id, status)"

function toExecution(row: ExecutionRow): Execution {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    workOrderId: row.work_order_id,
    technicianId: row.technician_id,
    status: row.status,
    acceptedAt: row.accepted_at,
    arrivedAt: row.arrived_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    resolutionNotes: row.resolution_notes,
    unableReason: row.unable_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toWorkerAssignment(row: WorkerAssignmentRow): WorkerAssignment {
  const wo = row.work_orders
  const exec = row.work_order_executions?.[0] ?? null
  return {
    assignmentId: row.id,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    workOrderId: row.work_order_id,
    workOrderNumber: wo?.work_order_number ?? null,
    workOrderSubject: wo?.subject ?? null,
    companyName: wo?.companies?.name ?? null,
    assetName: wo?.assets ? `${wo.assets.asset_number} · ${wo.assets.name}` : null,
    executionId: exec?.id ?? null,
    executionStatus: exec?.status ?? "pending",
  }
}

function patchToRow(patch: ExecutionPatch) {
  const row: Database["public"]["Tables"]["work_order_executions"]["Update"] = {
    status: patch.status,
  }
  if ("acceptedAt" in patch) row.accepted_at = patch.acceptedAt
  if ("arrivedAt" in patch) row.arrived_at = patch.arrivedAt
  if ("startedAt" in patch) row.started_at = patch.startedAt
  if ("completedAt" in patch) row.completed_at = patch.completedAt
  if ("resolutionNotes" in patch) row.resolution_notes = patch.resolutionNotes
  if ("unableReason" in patch) row.unable_reason = patch.unableReason
  return row
}

export class SupabaseExecutionRepository implements ExecutionRepository {
  async resolveTechnicianByUser(
    tenantId: UUID,
    userId: UUID,
  ): Promise<{ id: UUID } | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to resolve technician.",
        "TECHNICIAN_RESOLVE_FAILED",
        error,
      )
    }
    return data ? { id: data.id } : null
  }

  async listMyAssignments(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<WorkerAssignment[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .in("status", ["scheduled"])
      .order("scheduled_start", { ascending: true })

    if (error) {
      throw new ApplicationError(
        "Unable to load assignments.",
        "WORKER_ASSIGNMENTS_FAILED",
        error,
      )
    }
    return (data as unknown as WorkerAssignmentRow[]).map(toWorkerAssignment)
  }

  async getMyAssignment(
    tenantId: UUID,
    technicianId: UUID,
    assignmentId: UUID,
  ): Promise<WorkerAssignment | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .eq("id", assignmentId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load assignment.",
        "WORKER_ASSIGNMENT_FAILED",
        error,
      )
    }
    return data ? toWorkerAssignment(data as unknown as WorkerAssignmentRow) : null
  }

  async getExecutionByAssignment(
    tenantId: UUID,
    assignmentId: UUID,
  ): Promise<Execution | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_executions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("assignment_id", assignmentId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load execution.",
        "EXECUTION_LOAD_FAILED",
        error,
      )
    }
    return data ? toExecution(data) : null
  }

  async createExecution(
    tenantId: UUID,
    params: {
      assignmentId: UUID
      workOrderId: UUID
      technicianId: UUID
      patch: ExecutionPatch
    },
  ): Promise<Execution> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_executions")
      .insert({
        tenant_id: tenantId,
        assignment_id: params.assignmentId,
        work_order_id: params.workOrderId,
        technician_id: params.technicianId,
        ...patchToRow(params.patch),
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create execution.",
        "EXECUTION_CREATE_FAILED",
        error,
      )
    }
    return toExecution(data)
  }

  async updateExecution(
    tenantId: UUID,
    id: UUID,
    patch: ExecutionPatch,
  ): Promise<Execution> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_executions")
      .update(patchToRow(patch))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update execution.",
        "EXECUTION_UPDATE_FAILED",
        error,
      )
    }
    return toExecution(data)
  }
}
