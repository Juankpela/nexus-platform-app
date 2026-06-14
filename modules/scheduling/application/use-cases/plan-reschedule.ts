import { ApplicationError } from "@/lib/errors/application-error"
import type { EligibilityResolver } from "@/modules/scheduling/application/ports/eligibility-resolver"
import type { RescheduleCandidateReader } from "@/modules/scheduling/application/ports/reschedule-candidate-reader"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import { localDateMinute, localSlotToIso } from "@/modules/scheduling/domain/local-time"
import { findNextSlot } from "@/modules/scheduling/domain/next-slot"
import type { UUID } from "@/types/shared"

export type RescheduleMode = "same_tech" | "suggested"

export type ReschedulePlan = {
  workOrderId: UUID
  mode: RescheduleMode
  technicianId: UUID
  startsAt: string
  endsAt: string
  durationMinutes: number
  activeAssignmentId: UUID | null
}

export type PlanRescheduleDeps = {
  candidates: RescheduleCandidateReader
  scheduling: Pick<SchedulingRepository, "findActiveByWorkOrders">
  resolver: EligibilityResolver
  nowMs: number
  timeZone: string
  horizonDays: number
}

export type PlanRescheduleInput = {
  tenantId: UUID
  workOrderId: UUID
  mode: RescheduleMode
}

/**
 * Computes WHAT a human-triggered reschedule would do (ADR-032) — recomputed
 * fresh server-side, NOT trusting the persisted dry-run proposal. Returns the
 * concrete technician + UTC window + the active assignment to update; does NOT
 * write (the caller applies it via the validated assign/reassign use-cases).
 */
export async function planReschedule(
  deps: PlanRescheduleDeps,
  input: PlanRescheduleInput,
): Promise<ReschedulePlan> {
  const now = localDateMinute(new Date(deps.nowMs).toISOString(), deps.timeZone)
  if (!now) throw new ApplicationError("Reloj inválido.", "INVALID_CLOCK")

  const candidates = await deps.candidates.listActionableCandidates(input.tenantId)
  const candidate = candidates.find((c) => c.workOrderId === input.workOrderId)
  if (!candidate) {
    throw new ApplicationError(
      "Esta orden no es candidata a reagendar (sin ejecución fallida con motivo reagendable).",
      "NO_RESCHEDULE_CANDIDATE",
    )
  }

  const slot = findNextSlot({
    windows: candidate.windows,
    busy: candidate.busy,
    exceptions: candidate.exceptions,
    durationMinutes: candidate.durationMinutes,
    fromDate: now.date,
    fromMinute: now.minute,
    horizonDays: deps.horizonDays,
  })
  if (!slot) throw new ApplicationError("No hay cupo disponible en el horizonte.", "NO_SLOT")

  const startsAt = localSlotToIso(slot.date, slot.startMinute, deps.timeZone)
  const endsAt = localSlotToIso(slot.date, slot.endMinute, deps.timeZone)

  let technicianId = candidate.technicianId
  if (input.mode === "suggested") {
    const eligible = (
      await deps.resolver.findEligible(input.tenantId, {
        skillId: null,
        minLevel: null,
        zoneId: null,
        startsAt,
        endsAt,
      })
    ).filter((r) => r.eligible && r.technicianId !== candidate.technicianId)
    if (eligible.length === 0) {
      throw new ApplicationError(
        "No hay técnico alternativo disponible para ese horario.",
        "NO_ALTERNATIVE_TECHNICIAN",
      )
    }
    technicianId = eligible[0].technicianId // ordered by lighter day-load
  }

  const active = await deps.scheduling.findActiveByWorkOrders(input.tenantId, [input.workOrderId])

  return {
    workOrderId: input.workOrderId,
    mode: input.mode,
    technicianId,
    startsAt,
    endsAt,
    durationMinutes: candidate.durationMinutes,
    activeAssignmentId: active[0]?.id ?? null,
  }
}
