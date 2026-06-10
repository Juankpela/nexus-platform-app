import { beforeEach, describe, expect, it, vi } from "vitest"

// `server-only` throws if imported outside an RSC; neutralize it for the node test env.
vi.mock("server-only", () => ({}))

// Capture the args PostgREST would receive, and let each test decide the response.
const updateSpy = vi.fn()
let updateResult: { data: unknown; error: unknown } = { data: null, error: null }

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload)
        return {
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => updateResult,
              }),
            }),
          }),
        }
      },
    }),
  }),
}))

import { SupabaseExecutionRepository } from "@/modules/field-execution/infrastructure/supabase-execution-repository"

const TENANT = "11111111-1111-1111-1111-111111111111"
const EXEC = "77777777-7777-7777-7777-777777777777"

/**
 * REPRODUCES the "migration not applied" failure mode (verified live against
 * Supabase: HTTP 400 / PGRST204 "Could not find the 'unable_to_complete_at'
 * column ... in the schema cache"). PostgREST rejects the whole UPDATE — the
 * column is NOT silently dropped — so the repo must surface it as a hard error.
 */
describe("SupabaseExecutionRepository.updateExecution — missing column", () => {
  beforeEach(() => {
    updateSpy.mockClear()
  })

  it("maps the unable_to_complete patch to the new column (what PostgREST would reject pre-migration)", async () => {
    updateResult = {
      data: null,
      error: {
        code: "PGRST204",
        message:
          "Could not find the 'unable_to_complete_at' column of 'work_order_executions' in the schema cache",
      },
    }

    const repo = new SupabaseExecutionRepository()
    await expect(
      repo.updateExecution(TENANT, EXEC, {
        status: "unable_to_complete",
        unableToCompleteAt: "2026-06-10T00:00:00Z",
      }),
    ).rejects.toMatchObject({ code: "EXECUTION_UPDATE_FAILED" })

    // The mapper DID emit the new column — that is exactly what fails pre-migration.
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "unable_to_complete",
        unable_to_complete_at: "2026-06-10T00:00:00Z",
      }),
    )
  })

  it("fails LOUDLY, not silently (PGRST204 → thrown ApplicationError, no partial success)", async () => {
    updateResult = {
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'unable_to_complete_at' column ...",
      },
    }

    const repo = new SupabaseExecutionRepository()
    let threw = false
    try {
      await repo.updateExecution(TENANT, EXEC, {
        status: "unable_to_complete",
        unableToCompleteAt: "2026-06-10T00:00:00Z",
      })
    } catch (e) {
      threw = true
      // The underlying PostgREST error is preserved as the cause.
      expect((e as { cause?: { code?: string } }).cause?.code).toBe("PGRST204")
    }
    expect(threw).toBe(true)
  })

  it("transitions that do NOT touch the new column are unaffected pre-migration", async () => {
    // `working` only sets started_at — no unable_to_complete_at — so no PGRST204.
    updateResult = {
      data: {
        id: EXEC,
        tenant_id: TENANT,
        assignment_id: "a",
        work_order_id: "w",
        technician_id: "t",
        status: "working",
        accepted_at: null,
        arrived_at: null,
        started_at: "2026-06-10T00:00:00Z",
        completed_at: null,
        unable_reason: null,
        unable_to_complete_at: null,
        resolution_notes: null,
        created_at: "2026-06-10T00:00:00Z",
        updated_at: "2026-06-10T00:00:00Z",
      },
      error: null,
    }

    const repo = new SupabaseExecutionRepository()
    const rec = await repo.updateExecution(TENANT, EXEC, {
      status: "working",
      startedAt: "2026-06-10T00:00:00Z",
    })
    expect(rec.status).toBe("working")
    expect(updateSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({ unable_to_complete_at: expect.anything() }),
    )
  })
})
