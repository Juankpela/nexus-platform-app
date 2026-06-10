import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ExecutionRepository } from "@/modules/field-execution/application/ports/execution-repository"
import { advanceExecution } from "@/modules/field-execution/application/use-cases/advance-execution"
import {
  canTransition,
  type Execution,
  type ExecutionStatus,
} from "@/modules/field-execution/domain/execution"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"
const REQ = "33333333-3333-3333-3333-333333333333"
const TECH = "44444444-4444-4444-4444-444444444444"
const ASSIGN = "55555555-5555-5555-5555-555555555555"
const WO = "66666666-6666-6666-6666-666666666666"
const EXEC = "77777777-7777-7777-7777-777777777777"

function fakeExec(status: ExecutionStatus): Execution {
  return {
    id: EXEC,
    assignmentId: ASSIGN,
    workOrderId: WO,
    technicianId: TECH,
    status,
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    unableToCompleteAt: null,
    resolutionNotes: null,
    unableReason: null,
    createdAt: "2026-06-09T00:00:00Z",
    updatedAt: "2026-06-09T00:00:00Z",
  }
}

function setup(existing: Execution | null) {
  const create = vi.fn(async () => fakeExec("accepted"))
  const update = vi.fn(async (_t, _id, patch) => fakeExec(patch.status))
  const append = vi.fn().mockResolvedValue(undefined)
  const executions = {
    getExecutionByAssignment: vi.fn().mockResolvedValue(existing),
    createExecution: create,
    updateExecution: update,
  } as unknown as ExecutionRepository
  const audit = { append } as unknown as AuditRepository
  return { executions, audit, create, update, append }
}

const input = (target: Exclude<ExecutionStatus, "pending">) => ({
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: REQ,
  technicianId: TECH,
  assignmentId: ASSIGN,
  workOrderId: WO,
  target,
})

describe("execution transition map", () => {
  it("allows the happy path and blocks skips/reopens", () => {
    expect(canTransition("pending", "accepted")).toBe(true)
    expect(canTransition("accepted", "on_site")).toBe(true)
    expect(canTransition("on_site", "working")).toBe(true)
    expect(canTransition("working", "completed")).toBe(true)
    expect(canTransition("working", "unable_to_complete")).toBe(true)
    // invalid skips / reopens
    expect(canTransition("pending", "working")).toBe(false)
    expect(canTransition("accepted", "completed")).toBe(false)
    expect(canTransition("completed", "working")).toBe(false)
    expect(canTransition("unable_to_complete", "accepted")).toBe(false)
  })
})

describe("advanceExecution", () => {
  it("bootstraps an execution on accept when none exists", async () => {
    const deps = setup(null)
    const rec = await advanceExecution(deps, input("accepted"))
    expect(deps.create).toHaveBeenCalled()
    expect(rec.status).toBe("accepted")
    expect(deps.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "execution.assignment_accepted" }),
    )
  })

  it("rejects non-accept actions when no execution exists", async () => {
    const deps = setup(null)
    await expect(advanceExecution(deps, input("working"))).rejects.toMatchObject({
      code: "EXECUTION_NOT_STARTED",
    })
    expect(deps.create).not.toHaveBeenCalled()
  })

  it("advances on_site → working and audits the event", async () => {
    const deps = setup(fakeExec("on_site"))
    const rec = await advanceExecution(deps, input("working"))
    expect(deps.update).toHaveBeenCalledWith(
      TENANT,
      EXEC,
      expect.objectContaining({ status: "working" }),
    )
    expect(rec.status).toBe("working")
    expect(deps.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "execution.work_started" }),
    )
  })

  it("rejects an invalid transition", async () => {
    const deps = setup(fakeExec("completed"))
    await expect(advanceExecution(deps, input("working"))).rejects.toMatchObject({
      code: "INVALID_EXECUTION_TRANSITION",
    })
    expect(deps.update).not.toHaveBeenCalled()
  })

  it("allows unable_to_complete from working", async () => {
    const deps = setup(fakeExec("working"))
    const rec = await advanceExecution(deps, input("unable_to_complete"))
    expect(rec.status).toBe("unable_to_complete")
    expect(deps.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "execution.execution_failed" }),
    )
  })
})
