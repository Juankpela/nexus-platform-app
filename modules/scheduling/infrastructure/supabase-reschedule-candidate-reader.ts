import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  autoActionAllowed,
  reasonToDisposition,
  type NonCompletionReason,
} from "@/modules/field-execution/domain/disposition"
import type { RescheduleCandidateReader } from "@/modules/scheduling/application/ports/reschedule-candidate-reader"
import { localDateMinute } from "@/modules/scheduling/domain/local-time"
import type { BusyInterval } from "@/modules/scheduling/domain/next-slot"
import type { RescheduleCandidate } from "@/modules/scheduling/domain/reschedule-proposal"
import { ACTIVE_ASSIGNMENT_STATUSES } from "@/modules/scheduling/domain/work-order-assignment"
import type {
  AvailabilityException,
  Weekday,
  WeeklyWindow,
} from "@/modules/service/domain/availability"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

const TERMINAL_WO = new Set(["completed", "cancelled"])

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    ;(m.get(k) ?? m.set(k, []).get(k)!).push(r)
  }
  return m
}

/**
 * Service-role reader (cron context) for the auto-reschedule engine. Assembles
 * actionable candidates (latest unable execution with an actionable disposition)
 * plus the assigned technician's availability and local busy intervals. The
 * disposition is computed here (the projection, ADR-029) — the engine only
 * reads it. Read-only.
 */
export class SupabaseRescheduleCandidateReader implements RescheduleCandidateReader {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly timeZone: string,
  ) {}

  async listActionableCandidates(tenantId: UUID): Promise<RescheduleCandidate[]> {
    const execRes = await this.client
      .from("work_order_executions")
      .select("assignment_id, work_order_id, technician_id, non_completion_reason")
      .eq("tenant_id", tenantId)
      .eq("status", "unable_to_complete")
      .not("non_completion_reason", "is", null)
    if (execRes.error) {
      throw new ApplicationError("Unable to read executions.", "RESCHEDULE_READ_FAILED", execRes.error)
    }
    const execs = execRes.data ?? []
    if (execs.length === 0) return []

    const woIds = [...new Set(execs.map((e) => e.work_order_id))]
    const asgIds = [...new Set(execs.map((e) => e.assignment_id))]
    const techIds = [...new Set(execs.map((e) => e.technician_id))]

    const [woRes, asgRes, techRes, winRes, excRes, busyRes] = await Promise.all([
      this.client.from("work_orders").select("id, status, work_order_number").eq("tenant_id", tenantId).in("id", woIds),
      this.client
        .from("work_order_assignments")
        .select("id, estimated_duration_minutes")
        .eq("tenant_id", tenantId)
        .in("id", asgIds),
      this.client.from("technicians").select("id, first_name, last_name").eq("tenant_id", tenantId).in("id", techIds),
      this.client
        .from("technician_availability")
        .select("id, technician_id, weekday, start_minute, end_minute")
        .eq("tenant_id", tenantId)
        .in("technician_id", techIds),
      this.client
        .from("technician_availability_exceptions")
        .select("id, technician_id, date_from, date_to, start_minute, end_minute, kind, note")
        .eq("tenant_id", tenantId)
        .in("technician_id", techIds),
      this.client
        .from("work_order_assignments")
        .select("technician_id, scheduled_start, scheduled_end")
        .eq("tenant_id", tenantId)
        .in("technician_id", techIds)
        .in("status", ACTIVE_ASSIGNMENT_STATUSES),
    ])
    for (const r of [woRes, asgRes, techRes, winRes, excRes, busyRes]) {
      if (r.error) {
        throw new ApplicationError("Unable to read reschedule data.", "RESCHEDULE_READ_FAILED", r.error)
      }
    }

    const woById = new Map((woRes.data ?? []).map((w) => [w.id, w]))
    const asgById = new Map((asgRes.data ?? []).map((a) => [a.id, a]))
    const techById = new Map((techRes.data ?? []).map((t) => [t.id, t]))
    const winByTech = groupBy(winRes.data ?? [], (r) => r.technician_id)
    const excByTech = groupBy(excRes.data ?? [], (r) => r.technician_id)
    const busyByTech = groupBy(busyRes.data ?? [], (r) => r.technician_id)

    const candidates: RescheduleCandidate[] = []
    for (const exec of execs) {
      const wo = woById.get(exec.work_order_id)
      if (!wo || TERMINAL_WO.has(wo.status)) continue // WO already closed

      const reason = exec.non_completion_reason as NonCompletionReason
      const disposition = reasonToDisposition(reason)
      if (!autoActionAllowed(disposition)) continue // blocked/terminal — never auto-acted

      const asg = asgById.get(exec.assignment_id)
      const duration = asg?.estimated_duration_minutes ?? 0
      if (duration <= 0) continue

      const tech = techById.get(exec.technician_id)
      const windows: WeeklyWindow[] = (winByTech.get(exec.technician_id) ?? []).map((w) => ({
        id: w.id,
        weekday: w.weekday as Weekday,
        startMinute: w.start_minute,
        endMinute: w.end_minute,
        createdAt: "",
        updatedAt: "",
      }))
      const exceptions: AvailabilityException[] = (excByTech.get(exec.technician_id) ?? []).map((e) => ({
        id: e.id,
        dateFrom: e.date_from,
        dateTo: e.date_to,
        startMinute: e.start_minute,
        endMinute: e.end_minute,
        kind: e.kind as AvailabilityException["kind"],
        note: e.note,
        createdAt: "",
        updatedAt: "",
      }))
      const busy: BusyInterval[] = []
      for (const a of busyByTech.get(exec.technician_id) ?? []) {
        const s = localDateMinute(a.scheduled_start, this.timeZone)
        const e = localDateMinute(a.scheduled_end, this.timeZone)
        if (s && e && s.date === e.date) {
          busy.push({ date: s.date, startMinute: s.minute, endMinute: e.minute })
        }
      }

      candidates.push({
        workOrderId: exec.work_order_id,
        workOrderNumber: wo.work_order_number,
        assignmentId: exec.assignment_id,
        technicianId: exec.technician_id,
        technicianName: tech ? `${tech.first_name} ${tech.last_name}` : null,
        nonCompletionReason: reason,
        disposition,
        durationMinutes: duration,
        windows,
        exceptions,
        busy,
      })
    }

    return candidates
  }
}
