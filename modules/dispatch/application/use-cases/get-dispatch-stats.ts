import type { DispatchRepository } from "@/modules/dispatch/application/ports/dispatch-repository"
import {
  computeDispatchStats,
  type DispatchStats,
} from "@/modules/dispatch/domain/dispatch-stats"
import { buildTechnicianWorkload } from "@/modules/dispatch/domain/technician-workload"
import type { UUID } from "@/types/shared"

export type GetDispatchStatsDeps = {
  dispatch: DispatchRepository
}

export type GetDispatchStatsInput = {
  tenantId: UUID
  dayStartIso: string
  dayEndIso: string
}

export async function getDispatchStats(
  { dispatch }: GetDispatchStatsDeps,
  input: GetDispatchStatsInput,
): Promise<DispatchStats> {
  const raw = await dispatch.getWorkloads(
    input.tenantId,
    input.dayStartIso,
    input.dayEndIso,
  )

  const workloads = raw.map((r) =>
    buildTechnicianWorkload({
      technicianId: r.technicianId,
      technicianName: r.technicianName,
      technicianStatus: r.technicianStatus,
      assignmentCount: r.assignmentCount,
      scheduledMinutes: r.scheduledMinutes,
    }),
  )

  const assignmentsToday = workloads.reduce((acc, w) => acc + w.assignmentCount, 0)
  return computeDispatchStats(workloads, assignmentsToday)
}
