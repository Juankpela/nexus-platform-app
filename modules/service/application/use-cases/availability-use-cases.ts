import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AvailabilityRepository } from "@/modules/service/application/ports/availability-repository"
import {
  isValidWindow,
  type AvailabilityExceptionInput,
  type TechnicianCapacity,
  type WeeklyWindowInput,
} from "@/modules/service/domain/availability"
import type { Json } from "@/types/database"
import type { UUID } from "@/types/shared"

export type AvailabilityDeps = {
  availability: AvailabilityRepository
  audit: AuditRepository
}

type Actor = { actorId: UUID; tenantId: UUID; requestId: UUID; technicianId: UUID }

async function trace(
  { audit }: AvailabilityDeps,
  a: Actor,
  eventType: string,
  action: string,
  metadata: Json,
) {
  await audit.append({
    eventType,
    actorType: "user",
    actorId: a.actorId,
    tenantId: a.tenantId,
    subjectType: "technician",
    subjectId: a.technicianId,
    action,
    metadata,
    requestId: a.requestId,
    source: "web",
  })
}

export type AddWindowInput = Actor & { data: WeeklyWindowInput }
export async function addAvailabilityWindow(deps: AvailabilityDeps, input: AddWindowInput) {
  if (!isValidWindow(input.data.startMinute, input.data.endMinute)) {
    throw new ApplicationError("Ventana de horario inválida.", "INVALID_AVAILABILITY_WINDOW")
  }
  const window = await deps.availability.addWindow(input.tenantId, input.technicianId, input.data)
  await trace(deps, input, "service.availability.window_added", "availability.window_added", {
    weekday: input.data.weekday,
    startMinute: input.data.startMinute,
    endMinute: input.data.endMinute,
  })
  return window
}

export type RemoveWindowInput = Actor & { windowId: UUID }
export async function removeAvailabilityWindow(deps: AvailabilityDeps, input: RemoveWindowInput) {
  await deps.availability.removeWindow(input.tenantId, input.technicianId, input.windowId)
  await trace(deps, input, "service.availability.window_removed", "availability.window_removed", {
    windowId: input.windowId,
  })
}

export type AddExceptionInput = Actor & { data: AvailabilityExceptionInput }
export async function addAvailabilityException(deps: AvailabilityDeps, input: AddExceptionInput) {
  const { dateFrom, dateTo, startMinute, endMinute } = input.data
  if (dateTo < dateFrom) {
    throw new ApplicationError("Rango de fechas inválido.", "INVALID_EXCEPTION_RANGE")
  }
  const partial = startMinute !== null || endMinute !== null
  if (partial && !isValidWindow(startMinute ?? -1, endMinute ?? -1)) {
    throw new ApplicationError("Ventana horaria de la excepción inválida.", "INVALID_EXCEPTION_WINDOW")
  }
  const exception = await deps.availability.addException(input.tenantId, input.technicianId, input.data)
  await trace(deps, input, "service.availability.exception_added", "availability.exception_added", {
    kind: input.data.kind,
    dateFrom,
    dateTo,
  })
  return exception
}

export type RemoveExceptionInput = Actor & { exceptionId: UUID }
export async function removeAvailabilityException(deps: AvailabilityDeps, input: RemoveExceptionInput) {
  await deps.availability.removeException(input.tenantId, input.technicianId, input.exceptionId)
  await trace(deps, input, "service.availability.exception_removed", "availability.exception_removed", {
    exceptionId: input.exceptionId,
  })
}

export type SetCapacityInput = Actor & { capacity: TechnicianCapacity }
export async function setTechnicianCapacity(deps: AvailabilityDeps, input: SetCapacityInput) {
  await deps.availability.setCapacity(input.tenantId, input.technicianId, input.capacity)
  await trace(deps, input, "service.technician.capacity_set", "technician.capacity_set", {
    maxWorkOrdersPerDay: input.capacity.maxWorkOrdersPerDay,
    maxMinutesPerDay: input.capacity.maxMinutesPerDay,
  })
}
