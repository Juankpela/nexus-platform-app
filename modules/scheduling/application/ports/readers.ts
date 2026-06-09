import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

/** Minimal technician view Scheduling needs to validate an assignment. */
export type TechnicianView = {
  id: UUID
  status: TechnicianStatus
  deletedAt: string | null
}

export interface TechnicianReader {
  getById(tenantId: UUID, id: UUID): Promise<TechnicianView | null>
}

/** Minimal work order view Scheduling needs to validate an assignment. */
export type WorkOrderView = {
  id: UUID
}

export interface WorkOrderReader {
  getById(tenantId: UUID, id: UUID): Promise<WorkOrderView | null>
}
