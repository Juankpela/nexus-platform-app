import type { DispatchRepository } from "@/modules/dispatch/application/ports/dispatch-repository"
import type {
  DispatchBoard,
  DispatchBoardEntry,
} from "@/modules/dispatch/domain/dispatch-board"
import {
  buildTechnicianWorkload,
  WORKLOAD_STATUS_ORDER,
} from "@/modules/dispatch/domain/technician-workload"
import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"
import type { UUID } from "@/types/shared"

export type GetDispatchBoardDeps = {
  dispatch: DispatchRepository
}

export type GetDispatchBoardInput = {
  tenantId: UUID
  date: string // YYYY-MM-DD (the board day)
  dayStartIso: string
  dayEndIso: string
}

export async function getDispatchBoard(
  { dispatch }: GetDispatchBoardDeps,
  input: GetDispatchBoardInput,
): Promise<DispatchBoard> {
  const [rawWorkloads, dayAssignments] = await Promise.all([
    dispatch.getWorkloads(input.tenantId, input.dayStartIso, input.dayEndIso),
    dispatch.listDayAssignments(input.tenantId, input.dayStartIso, input.dayEndIso),
  ])

  const byTechnician = new Map<string, WorkOrderAssignment[]>()
  for (const a of dayAssignments) {
    const list = byTechnician.get(a.technicianId) ?? []
    list.push(a)
    byTechnician.set(a.technicianId, list)
  }

  const entries: DispatchBoardEntry[] = rawWorkloads.map((raw) => ({
    workload: buildTechnicianWorkload({
      technicianId: raw.technicianId,
      technicianName: raw.technicianName,
      technicianStatus: raw.technicianStatus,
      assignmentCount: raw.assignmentCount,
      scheduledMinutes: raw.scheduledMinutes,
    }),
    assignments: byTechnician.get(raw.technicianId) ?? [],
  }))

  // Order: overloaded → busy → available → unavailable, then by utilization desc.
  entries.sort((a, b) => {
    const byStatus =
      WORKLOAD_STATUS_ORDER[a.workload.status] -
      WORKLOAD_STATUS_ORDER[b.workload.status]
    if (byStatus !== 0) return byStatus
    return b.workload.utilizationPercent - a.workload.utilizationPercent
  })

  return { date: input.date, entries }
}
