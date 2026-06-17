import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { DispatchCandidateReader } from "@/modules/scheduling/application/ports/dispatch-candidate-reader"
import type { TechnicianDispatchSnapshot } from "@/modules/scheduling/domain/dispatch-selection"
import { localDateMinute } from "@/modules/scheduling/domain/local-time"
import type { BusyInterval } from "@/modules/scheduling/domain/next-slot"
import { ACTIVE_ASSIGNMENT_STATUSES } from "@/modules/scheduling/domain/work-order-assignment"
import type {
  AvailabilityException,
  TechnicianCapacity,
  Weekday,
  WeeklyWindow,
} from "@/modules/service/domain/availability"
import type { SkillLevel } from "@/modules/service/domain/skill"
import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    const list = m.get(key(r))
    if (list) list.push(r)
    else m.set(key(r), [r])
  }
  return m
}

/**
 * Reader de candidatos para el despacho autónomo (ADR-033). Reutiliza EXACTAMENTE
 * las mismas tablas/consultas que el resolver de elegibilidad (ADR-028), pero
 * proyecta los assignments activos del HORIZONTE a intervalos `busy` locales para
 * que `findNextSlot` ubique el primer hueco. No recalcula elegibilidad ni crea
 * reglas: solo arma snapshots. Lee con el cliente de sesión (RLS).
 */
export class SupabaseDispatchCandidateReader implements DispatchCandidateReader {
  constructor(private readonly timeZone: string) {}

  async listCandidates(
    tenantId: UUID,
    fromDate: string,
    horizonDays: number,
  ): Promise<TechnicianDispatchSnapshot[]> {
    const client = await createServerSupabaseClient()

    // Ventana del horizonte en UTC (amplia; findNextSlot filtra por día local).
    const [y, mo, d] = fromDate.split("-").map(Number)
    const fromIso = new Date(Date.UTC(y, mo - 1, d - 1)).toISOString()
    const toIso = new Date(Date.UTC(y, mo - 1, d + horizonDays + 1)).toISOString()

    const [techRes, skillRes, zoneRes, winRes, excRes, asgRes] = await Promise.all([
      client
        .from("technicians")
        .select("id, first_name, last_name, status, max_work_orders_per_day, max_minutes_per_day")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null),
      client.from("technician_skills").select("technician_id, skill_id, level").eq("tenant_id", tenantId),
      client.from("technician_zones").select("technician_id, zone_id").eq("tenant_id", tenantId),
      client
        .from("technician_availability")
        .select("id, technician_id, weekday, start_minute, end_minute")
        .eq("tenant_id", tenantId),
      client
        .from("technician_availability_exceptions")
        .select("id, technician_id, date_from, date_to, start_minute, end_minute, kind, note")
        .eq("tenant_id", tenantId),
      client
        .from("work_order_assignments")
        .select("technician_id, scheduled_start, scheduled_end, estimated_duration_minutes, status")
        .eq("tenant_id", tenantId)
        .in("status", ACTIVE_ASSIGNMENT_STATUSES)
        .gte("scheduled_start", fromIso)
        .lt("scheduled_start", toIso),
    ])

    for (const r of [techRes, skillRes, zoneRes, winRes, excRes, asgRes]) {
      if (r.error) {
        throw new ApplicationError("Unable to read dispatch candidates.", "DISPATCH_READ_FAILED", r.error)
      }
    }

    const skillsByTech = groupBy(skillRes.data ?? [], (r) => r.technician_id)
    const zonesByTech = groupBy(zoneRes.data ?? [], (r) => r.technician_id)
    const winByTech = groupBy(winRes.data ?? [], (r) => r.technician_id)
    const excByTech = groupBy(excRes.data ?? [], (r) => r.technician_id)
    const asgByTech = groupBy(asgRes.data ?? [], (r) => r.technician_id)

    return (techRes.data ?? []).map((t) => {
      const windows: WeeklyWindow[] = (winByTech.get(t.id) ?? []).map((w) => ({
        id: w.id,
        weekday: w.weekday as Weekday,
        startMinute: w.start_minute,
        endMinute: w.end_minute,
        createdAt: "",
        updatedAt: "",
      }))
      const exceptions: AvailabilityException[] = (excByTech.get(t.id) ?? []).map((e) => ({
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

      // Assignments activos del horizonte → intervalos locales (mismo patrón que
      // el reader de reagendamiento).
      const busy: BusyInterval[] = []
      let dayAssignmentCount = 0
      let dayScheduledMinutes = 0
      for (const a of asgByTech.get(t.id) ?? []) {
        const s = localDateMinute(a.scheduled_start, this.timeZone)
        const e = localDateMinute(a.scheduled_end, this.timeZone)
        if (s && e && s.date === e.date) {
          busy.push({ date: s.date, startMinute: s.minute, endMinute: e.minute })
          if (s.date === fromDate) {
            dayAssignmentCount += 1
            dayScheduledMinutes += a.estimated_duration_minutes ?? e.minute - s.minute
          }
        }
      }

      const capacity: TechnicianCapacity = {
        maxWorkOrdersPerDay: t.max_work_orders_per_day,
        maxMinutesPerDay: t.max_minutes_per_day,
      }

      return {
        technicianId: t.id,
        technicianName: `${t.first_name} ${t.last_name}`,
        status: t.status as TechnicianStatus,
        skills: (skillsByTech.get(t.id) ?? []).map((s) => ({
          skillId: s.skill_id,
          level: s.level as SkillLevel,
        })),
        zoneIds: (zonesByTech.get(t.id) ?? []).map((z) => z.zone_id),
        windows,
        exceptions,
        busy,
        capacity,
        dayAssignmentCount,
        dayScheduledMinutes,
      }
    })
  }
}
