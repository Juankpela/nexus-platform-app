import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  type AssignmentFilters,
  type AssignmentStatus,
  type WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import type { SchedulingStats } from "@/modules/scheduling/domain/scheduling-stats"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type AssignmentRow = Database["public"]["Tables"]["work_order_assignments"]["Row"]
type AssignmentRowWithRefs = AssignmentRow & {
  work_orders: { work_order_number: string; subject: string } | null
  technicians: { first_name: string; last_name: string } | null
}

const SELECT_WITH_REFS =
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

export class SupabaseSchedulingRepository implements SchedulingRepository {
  async list(
    tenantId: UUID,
    filters: AssignmentFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<WorkOrderAssignment>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("work_order_assignments")
      .select(SELECT_WITH_REFS, { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (filters.technicianId) query = query.eq("technician_id", filters.technicianId)
    if (filters.status) query = query.eq("status", filters.status)
    if (filters.dateFrom) query = query.gte("scheduled_start", filters.dateFrom)
    if (filters.dateTo) query = query.lte("scheduled_start", filters.dateTo)

    const { data, error, count } = await query
      .order("scheduled_start", { ascending: true })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list assignments.",
        "ASSIGNMENT_LIST_FAILED",
        error,
      )
    }

    return {
      items: (data as unknown as AssignmentRowWithRefs[]).map(toAssignment),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<WorkOrderAssignment | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load assignment.",
        "ASSIGNMENT_LOAD_FAILED",
        error,
      )
    }
    return data ? toAssignment(data as unknown as AssignmentRowWithRefs) : null
  }

  async findOverlapping(
    tenantId: UUID,
    technicianId: UUID,
    start: string,
    end: string,
    excludeId?: UUID | null,
  ): Promise<WorkOrderAssignment[]> {
    const client = await createServerSupabaseClient()
    // Half-open overlap: existing.start < newEnd AND existing.end > newStart,
    // restricted to time-blocking (active) statuses.
    let query = client
      .from("work_order_assignments")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .in("status", ACTIVE_ASSIGNMENT_STATUSES)
      .lt("scheduled_start", end)
      .gt("scheduled_end", start)

    if (excludeId) query = query.neq("id", excludeId)

    const { data, error } = await query

    if (error) {
      throw new ApplicationError(
        "Unable to check technician availability.",
        "ASSIGNMENT_OVERLAP_CHECK_FAILED",
        error,
      )
    }
    return (data as unknown as AssignmentRowWithRefs[]).map(toAssignment)
  }

  async create(
    tenantId: UUID,
    params: {
      workOrderId: UUID
      technicianId: UUID
      scheduledStart: string
      scheduledEnd: string
      estimatedDurationMinutes: number
    },
  ): Promise<WorkOrderAssignment> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .insert({
        tenant_id: tenantId,
        work_order_id: params.workOrderId,
        technician_id: params.technicianId,
        scheduled_start: params.scheduledStart,
        scheduled_end: params.scheduledEnd,
        estimated_duration_minutes: params.estimatedDurationMinutes,
      })
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create assignment.",
        "ASSIGNMENT_CREATE_FAILED",
        error,
      )
    }
    return toAssignment(data as unknown as AssignmentRowWithRefs)
  }

  async reschedule(
    tenantId: UUID,
    id: UUID,
    params: {
      technicianId: UUID
      scheduledStart: string
      scheduledEnd: string
      estimatedDurationMinutes: number
    },
  ): Promise<WorkOrderAssignment> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .update({
        technician_id: params.technicianId,
        scheduled_start: params.scheduledStart,
        scheduled_end: params.scheduledEnd,
        estimated_duration_minutes: params.estimatedDurationMinutes,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to reschedule assignment.",
        "ASSIGNMENT_RESCHEDULE_FAILED",
        error,
      )
    }
    return toAssignment(data as unknown as AssignmentRowWithRefs)
  }

  async delete(tenantId: UUID, id: UUID): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("work_order_assignments")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to remove assignment.",
        "ASSIGNMENT_DELETE_FAILED",
        error,
      )
    }
  }

  async getStats(tenantId: UUID): Promise<SchedulingStats> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_order_assignments")
      .select("status, scheduled_start")
      .eq("tenant_id", tenantId)

    if (error) {
      throw new ApplicationError(
        "Unable to load scheduling stats.",
        "SCHEDULING_STATS_FAILED",
        error,
      )
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday.getTime() + 86_400_000)
    // Week starts Monday.
    const dayOfWeek = (startOfToday.getDay() + 6) % 7
    const startOfWeek = new Date(startOfToday.getTime() - dayOfWeek * 86_400_000)
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86_400_000)

    let assignmentsToday = 0
    let assignmentsThisWeek = 0
    let activeAssignments = 0
    let completedAssignments = 0

    for (const row of data ?? []) {
      const status = row.status as AssignmentStatus
      const start = new Date(row.scheduled_start).getTime()
      if (start >= startOfToday.getTime() && start < endOfToday.getTime()) {
        assignmentsToday += 1
      }
      if (start >= startOfWeek.getTime() && start < endOfWeek.getTime()) {
        assignmentsThisWeek += 1
      }
      if (
        (ACTIVE_ASSIGNMENT_STATUSES as string[]).includes(status)
      ) {
        activeAssignments += 1
      }
      if (status === "completed") completedAssignments += 1
    }

    const total = (data ?? []).length
    return {
      assignmentsToday,
      assignmentsThisWeek,
      activeAssignments,
      completedAssignments,
      utilizationRate:
        total > 0 ? Math.round((completedAssignments / total) * 100) : null,
    }
  }
}
