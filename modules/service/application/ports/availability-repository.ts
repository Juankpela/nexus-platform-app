import type {
  AvailabilityException,
  AvailabilityExceptionInput,
  TechnicianCapacity,
  WeeklyWindow,
  WeeklyWindowInput,
} from "@/modules/service/domain/availability"
import type { UUID } from "@/types/shared"

export interface AvailabilityRepository {
  listWindows(tenantId: UUID, technicianId: UUID): Promise<WeeklyWindow[]>
  addWindow(
    tenantId: UUID,
    technicianId: UUID,
    input: WeeklyWindowInput,
  ): Promise<WeeklyWindow>
  removeWindow(tenantId: UUID, technicianId: UUID, windowId: UUID): Promise<void>

  listExceptions(tenantId: UUID, technicianId: UUID): Promise<AvailabilityException[]>
  addException(
    tenantId: UUID,
    technicianId: UUID,
    input: AvailabilityExceptionInput,
  ): Promise<AvailabilityException>
  removeException(tenantId: UUID, technicianId: UUID, exceptionId: UUID): Promise<void>

  getCapacity(tenantId: UUID, technicianId: UUID): Promise<TechnicianCapacity>
  setCapacity(
    tenantId: UUID,
    technicianId: UUID,
    capacity: TechnicianCapacity,
  ): Promise<void>
}
