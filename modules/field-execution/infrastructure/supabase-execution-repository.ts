import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ExecutionPatch,
  ExecutionRepository,
} from "@/modules/field-execution/application/ports/execution-repository"
import type {
  Execution,
  ExecutionStatus,
  WorkerAssignment,
} from "@/modules/field-execution/domain/execution"
import {
  ACTIVE_EXECUTION_STATUSES,
  type FieldMonitorBoard,
  type FieldMonitorEntry,
  type FieldMonitorJob,
} from "@/modules/field-execution/domain/field-monitor"
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
  work_order_executions:
    | {
        id: string
        status: ExecutionRow["status"]
        resolution_notes: string | null
        unable_reason: string | null
      }[]
    | null
}

const ASSIGNMENT_SELECT =
  "id, scheduled_start, scheduled_end, work_order_id, " +
  "work_orders(work_order_number, subject, companies(name), assets(name, asset_number)), " +
  "work_order_executions(id, status, resolution_notes, unable_reason)"

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
    unableToCompleteAt: row.unable_to_complete_at,
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
    notes: exec?.resolution_notes ?? exec?.unable_reason ?? null,
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
  if ("unableToCompleteAt" in patch)
    row.unable_to_complete_at = patch.unableToCompleteAt
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
    // Filter by the EXECUTION lifecycle (page-side), not assignment.status —
    // once a job is accepted the assignment becomes in_progress (projection),
    // but it must remain in the technician's inbox until execution closes.
    const { data, error } = await client
      .from("work_order_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
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

  async getTechnicianAssignments(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<WorkerAssignment[]> {
    // Oversight read (dispatcher/admin): all of a technician's assignments with
    // their execution status. RLS allows it via the work_orders.read policy.
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .order("scheduled_start", { ascending: false })

    if (error) {
      throw new ApplicationError(
        "Unable to load technician assignments.",
        "TECHNICIAN_ASSIGNMENTS_FAILED",
        error,
      )
    }
    return (data as unknown as WorkerAssignmentRow[]).map(toWorkerAssignment)
  }

  async getTechnicianInfo(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<{ id: UUID; name: string; status: string } | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("id, first_name, last_name, status")
      .eq("tenant_id", tenantId)
      .eq("id", technicianId)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load technician.",
        "TECHNICIAN_LOAD_FAILED",
        error,
      )
    }
    if (!data) return null
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim()
    return { id: data.id, name: name || "Técnico", status: data.status }
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

  async getFieldMonitor(tenantId: UUID): Promise<FieldMonitorBoard> {
    const client = await createServerSupabaseClient()

    const [techRes, execRes] = await Promise.all([
      client
        .from("technicians")
        .select("id, first_name, last_name, status")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("first_name", { ascending: true }),
      client
        .from("work_order_executions")
        .select(
          "assignment_id, work_order_id, technician_id, status, " +
            "accepted_at, arrived_at, started_at, completed_at, " +
            "unable_to_complete_at, resolution_notes, unable_reason, updated_at, " +
            "work_orders(work_order_number, subject, priority, companies(name))",
        )
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    ])

    if (techRes.error) {
      throw new ApplicationError(
        "Unable to load technicians.",
        "FIELD_MONITOR_FAILED",
        techRes.error,
      )
    }
    if (execRes.error) {
      throw new ApplicationError(
        "Unable to load field executions.",
        "FIELD_MONITOR_FAILED",
        execRes.error,
      )
    }

    const startOfTodayUtc = new Date()
    startOfTodayUtc.setUTCHours(0, 0, 0, 0)

    const execRows = (execRes.data ?? []) as unknown as FieldExecutionRow[]
    const byTechnician = new Map<
      string,
      { active: FieldMonitorJob | null; completedToday: number }
    >()

    for (const row of execRows) {
      const bucket = byTechnician.get(row.technician_id) ?? {
        active: null,
        completedToday: 0,
      }
      if (
        row.status === "completed" &&
        row.completed_at &&
        new Date(row.completed_at) >= startOfTodayUtc
      ) {
        bucket.completedToday += 1
      }
      // Rows arrive newest-first, so the first active one we see is the latest.
      if (!bucket.active && ACTIVE_EXECUTION_STATUSES.includes(row.status)) {
        bucket.active = toFieldMonitorJob(row)
      }
      byTechnician.set(row.technician_id, bucket)
    }

    const entries: FieldMonitorEntry[] = (techRes.data ?? []).map((t) => {
      const bucket = byTechnician.get(t.id)
      const name = [t.first_name, t.last_name].filter(Boolean).join(" ").trim()
      return {
        technicianId: t.id,
        technicianName: name || "Técnico",
        technicianStatus: t.status,
        activeJob: bucket?.active ?? null,
        completedToday: bucket?.completedToday ?? 0,
      }
    })

    // Active technicians first, then by name (the map preserves insert order).
    entries.sort((a, b) => {
      const aActive = a.activeJob ? 0 : 1
      const bActive = b.activeJob ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return a.technicianName.localeCompare(b.technicianName)
    })

    return { generatedAt: new Date().toISOString(), entries }
  }
}

type FieldExecutionRow = {
  assignment_id: string | null
  work_order_id: string
  technician_id: string
  status: ExecutionStatus
  accepted_at: string | null
  arrived_at: string | null
  started_at: string | null
  completed_at: string | null
  unable_to_complete_at: string | null
  resolution_notes: string | null
  unable_reason: string | null
  updated_at: string
  work_orders: {
    work_order_number: string
    subject: string
    priority: string | null
    companies: { name: string } | null
  } | null
}

function sinceFor(row: FieldExecutionRow): string | null {
  switch (row.status) {
    case "accepted":
      return row.accepted_at
    case "on_site":
      return row.arrived_at
    case "working":
      return row.started_at
    case "completed":
      return row.completed_at
    case "unable_to_complete":
      return row.unable_to_complete_at
    default:
      return null
  }
}

function toFieldMonitorJob(row: FieldExecutionRow): FieldMonitorJob {
  const wo = row.work_orders
  return {
    assignmentId: row.assignment_id,
    workOrderId: row.work_order_id,
    workOrderNumber: wo?.work_order_number ?? null,
    workOrderSubject: wo?.subject ?? null,
    companyName: wo?.companies?.name ?? null,
    priority: wo?.priority ?? null,
    executionStatus: row.status,
    since: sinceFor(row),
    notes: row.resolution_notes ?? row.unable_reason ?? null,
    updatedAt: row.updated_at,
  }
}
