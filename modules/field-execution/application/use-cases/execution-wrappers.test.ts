import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ExecutionRepository } from "@/modules/field-execution/application/ports/execution-repository"
import {
  acceptExecution,
  completeExecution,
  pauseExecution,
  resumeExecution,
  startExecution,
  unableToCompleteExecution,
} from "@/modules/field-execution/application/use-cases/execution-wrappers"
import {
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
  const update = vi.fn(async (_t, _id, patch) => fakeExec(patch.status))
  const create = vi.fn(async () => fakeExec("accepted"))
  const append = vi.fn().mockResolvedValue(undefined)
  const executions = {
    getExecutionByAssignment: vi.fn().mockResolvedValue(existing),
    createExecution: create,
    updateExecution: update,
  } as unknown as ExecutionRepository
  const audit = { append } as unknown as AuditRepository
  return { deps: { executions, audit }, create, update, append }
}

const input = {
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: REQ,
  technicianId: TECH,
  assignmentId: ASSIGN,
  workOrderId: WO,
}

describe("execution nominal wrappers", () => {
  it("acceptExecution bootstraps the execution (pending → accepted)", async () => {
    const { deps, create } = setup(null)
    const rec = await acceptExecution(deps, input)
    expect(create).toHaveBeenCalled()
    expect(rec.status).toBe("accepted")
  })

  it("startExecution targets on_site (accepted → on_site)", async () => {
    const { deps, update } = setup(fakeExec("accepted"))
    const rec = await startExecution(deps, input)
    expect(update).toHaveBeenCalledWith(
      TENANT,
      EXEC,
      expect.objectContaining({ status: "on_site" }),
    )
    expect(rec.status).toBe("on_site")
  })

  it("resumeExecution targets working (on_site → working)", async () => {
    const { deps, update } = setup(fakeExec("on_site"))
    const rec = await resumeExecution(deps, input)
    expect(update).toHaveBeenCalledWith(
      TENANT,
      EXEC,
      expect.objectContaining({ status: "working" }),
    )
    expect(rec.status).toBe("working")
  })

  it("completeExecution targets completed (working → completed)", async () => {
    const { deps } = setup(fakeExec("working"))
    const rec = await completeExecution(deps, input)
    expect(rec.status).toBe("completed")
  })

  it("unableToCompleteExecution targets unable_to_complete and stamps the timestamp", async () => {
    const { deps, update } = setup(fakeExec("working"))
    const rec = await unableToCompleteExecution(deps, {
      ...input,
      unableReason: "Cliente ausente",
    })
    expect(update).toHaveBeenCalledWith(
      TENANT,
      EXEC,
      expect.objectContaining({
        status: "unable_to_complete",
        unableToCompleteAt: expect.any(String),
      }),
    )
    expect(rec.status).toBe("unable_to_complete")
  })

  it("wrappers reject invalid transitions inherited from the guard", async () => {
    const { deps } = setup(fakeExec("completed"))
    await expect(resumeExecution(deps, input)).rejects.toMatchObject({
      code: "INVALID_EXECUTION_TRANSITION",
    })
  })

  it("pauseExecution is reserved and rejects with a domain error", async () => {
    const { deps, update } = setup(fakeExec("working"))
    await expect(pauseExecution(deps, input)).rejects.toMatchObject({
      code: "EXECUTION_PAUSE_UNSUPPORTED",
    })
    expect(update).not.toHaveBeenCalled()
  })
})
