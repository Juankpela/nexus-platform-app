import type { TechnicianStatus } from "@/modules/service/domain/technician"

export type TechnicianStats = {
  total: number
  byStatus: Record<TechnicianStatus, number>
}
