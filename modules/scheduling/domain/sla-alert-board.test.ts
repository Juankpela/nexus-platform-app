import { describe, expect, it } from "vitest"

import { projectSlaAlertBoard } from "@/modules/scheduling/domain/sla-alert-board"
import type { WorkOrderSlaView } from "@/modules/service/domain/work-order"

const NOW = Date.parse("2026-06-13T12:00:00.000Z")
const HOUR = 60 * 60 * 1000
const iso = (offset: number) => new Date(NOW + offset).toISOString()

function row(id: string, status: string, slaOffset: number): WorkOrderSlaView {
  return {
    id,
    workOrderNumber: `WO-${id}`,
    subject: `Subject ${id}`,
    status: status as WorkOrderSlaView["status"],
    scheduledEnd: null,
    slaDueAt: iso(slaOffset),
  }
}

function project(rows: WorkOrderSlaView[]) {
  return projectSlaAlertBoard(rows, { nowMs: NOW, atRiskWindowMs: 2 * HOUR })
}

describe("projectSlaAlertBoard", () => {
  it("splits breached into critical and near-deadline into at-risk", () => {
    const board = project([
      row("a", "scheduled", -1 * HOUR), // breached
      row("b", "scheduled", 1 * HOUR), // at risk
      row("c", "scheduled", 10 * HOUR), // healthy → excluded
    ])
    expect(board.criticalCount).toBe(1)
    expect(board.atRiskCount).toBe(1)
    expect(board.critical[0].workOrderId).toBe("a")
    expect(board.atRisk[0].workOrderId).toBe("b")
  })

  it("excludes on_hold (paused clock) regardless of deadline", () => {
    const board = project([row("a", "on_hold", -5 * HOUR)])
    expect(board.criticalCount).toBe(0)
    expect(board.atRiskCount).toBe(0)
  })

  it("sorts each group by most urgent deadline first", () => {
    const board = project([
      row("late", "scheduled", -1 * HOUR),
      row("older", "scheduled", -5 * HOUR),
    ])
    expect(board.critical.map((i) => i.workOrderId)).toEqual(["older", "late"])
  })

  it("returns empty board when nothing is degraded", () => {
    const board = project([row("a", "scheduled", 10 * HOUR)])
    expect(board).toEqual({ critical: [], atRisk: [], criticalCount: 0, atRiskCount: 0 })
  })
})
