import { describe, expect, it } from "vitest"

import {
  hasActiveWorkOrder,
  isWorkOrderTerminal,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"

const wos = (...statuses: WorkOrderStatus[]) => statuses.map((status) => ({ status }))

describe("hasActiveWorkOrder", () => {
  it("un caso sin órdenes de trabajo NO está asignado", () => {
    expect(hasActiveWorkOrder([])).toBe(false)
  })

  it("una WO activa o completada deja el caso asignado", () => {
    expect(hasActiveWorkOrder(wos("scheduled"))).toBe(true)
    expect(hasActiveWorkOrder(wos("in_progress"))).toBe(true)
    expect(hasActiveWorkOrder(wos("completed"))).toBe(true)
  })

  it("si TODAS las WO están canceladas, el caso se reabre al despacho", () => {
    expect(hasActiveWorkOrder(wos("cancelled"))).toBe(false)
    expect(hasActiveWorkOrder(wos("cancelled", "cancelled"))).toBe(false)
  })

  it("basta una WO no cancelada para mantener el caso asignado", () => {
    expect(hasActiveWorkOrder(wos("cancelled", "completed"))).toBe(true)
    expect(hasActiveWorkOrder(wos("cancelled", "new"))).toBe(true)
  })
})

describe("isWorkOrderTerminal", () => {
  it("completed y cancelled son terminales", () => {
    expect(isWorkOrderTerminal("completed")).toBe(true)
    expect(isWorkOrderTerminal("cancelled")).toBe(true)
  })

  it("los estados operativos NO son terminales", () => {
    const live: WorkOrderStatus[] = [
      "new",
      "scheduled",
      "dispatched",
      "in_progress",
      "on_hold",
    ]
    for (const status of live) {
      expect(isWorkOrderTerminal(status)).toBe(false)
    }
  })
})
