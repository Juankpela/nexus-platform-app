import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const rpcSpy = vi.fn()
let rpcResult: { data: unknown; error: unknown } = { data: null, error: null }

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcSpy(name, args)
      return Promise.resolve(rpcResult)
    },
  }),
}))

import { SupabasePaymentRepository } from "@/modules/billing/infrastructure/supabase-payment-repository"
import { ApplicationError } from "@/lib/errors/application-error"
import type { RecordPaymentInput } from "@/modules/billing/domain/payment"

const TENANT = "11111111-1111-1111-1111-111111111111"
const COMPANY = "22222222-2222-2222-2222-222222222222"
const INVOICE = "33333333-3333-3333-3333-333333333333"
const PAYMENT = "44444444-4444-4444-4444-444444444444"
const ACTOR = "55555555-5555-5555-5555-555555555555"

const input = (): RecordPaymentInput => ({
  companyId: COMPANY,
  paymentDate: "2026-06-29",
  method: "transfer",
  reference: null,
  note: null,
  allocations: [{ invoiceId: INVOICE, amount: 100 }],
})

const paymentRow = {
  id: PAYMENT,
  payment_number: "PAY-2026-0001",
  company_id: COMPANY,
  payment_date: "2026-06-29",
  method: "transfer",
  reference: null,
  note: null,
  amount: 100,
  status: "recorded",
  reversed_at: null,
  reversed_by: null,
  reverse_reason: null,
  created_at: "2026-06-29T00:00:00Z",
  updated_at: "2026-06-29T00:00:00Z",
}

describe("SupabasePaymentRepository.record (P0-3, RPC atómica)", () => {
  beforeEach(() => rpcSpy.mockClear())

  it("llama a la RPC record_payment con las asignaciones serializadas", async () => {
    rpcResult = { data: paymentRow, error: null }
    const repo = new SupabasePaymentRepository()
    const payment = await repo.record(TENANT, input())
    expect(rpcSpy).toHaveBeenCalledWith(
      "record_payment",
      expect.objectContaining({
        p_tenant_id: TENANT,
        p_company_id: COMPANY,
        p_allocations: [{ invoice_id: INVOICE, amount: 100 }],
      }),
    )
    expect(payment.id).toBe(PAYMENT)
    expect(payment.amount).toBe(100)
  })

  it("traduce PAYMENT_OVER_ALLOCATION del error de la RPC", async () => {
    rpcResult = { data: null, error: { message: "PAYMENT_OVER_ALLOCATION" } }
    const repo = new SupabasePaymentRepository()
    await expect(repo.record(TENANT, input())).rejects.toMatchObject({
      code: "PAYMENT_OVER_ALLOCATION",
    })
  })

  it("traduce INVOICE_NOT_PAYABLE del error de la RPC", async () => {
    rpcResult = { data: null, error: { message: "INVOICE_NOT_PAYABLE" } }
    const repo = new SupabasePaymentRepository()
    await expect(repo.record(TENANT, input())).rejects.toMatchObject({
      code: "INVOICE_NOT_PAYABLE",
    })
  })

  it("error desconocido cae a PAYMENT_RECORD_FAILED", async () => {
    rpcResult = { data: null, error: { message: "boom 500" } }
    const repo = new SupabasePaymentRepository()
    await expect(repo.record(TENANT, input())).rejects.toMatchObject({
      code: "PAYMENT_RECORD_FAILED",
    })
  })
})

describe("SupabasePaymentRepository.reverse (P0-3)", () => {
  beforeEach(() => rpcSpy.mockClear())

  it("llama a reverse_payment y resuelve cuando no hay error", async () => {
    rpcResult = { data: null, error: null }
    const repo = new SupabasePaymentRepository()
    await expect(
      repo.reverse(TENANT, PAYMENT, ACTOR, "2026-06-29T00:00:00Z", "error de captura"),
    ).resolves.toBeUndefined()
    expect(rpcSpy).toHaveBeenCalledWith(
      "reverse_payment",
      expect.objectContaining({ p_tenant_id: TENANT, p_payment_id: PAYMENT }),
    )
  })

  it("traduce PAYMENT_NOT_REVERSIBLE (doble reversa) del error de la RPC", async () => {
    rpcResult = { data: null, error: { message: "PAYMENT_NOT_REVERSIBLE" } }
    const repo = new SupabasePaymentRepository()
    await expect(
      repo.reverse(TENANT, PAYMENT, ACTOR, "2026-06-29T00:00:00Z", "x"),
    ).rejects.toMatchObject({ code: "PAYMENT_NOT_REVERSIBLE" })
  })

  it("el error mapeado es ApplicationError", async () => {
    rpcResult = { data: null, error: { message: "PAYMENT_NOT_FOUND" } }
    const repo = new SupabasePaymentRepository()
    await repo.reverse(TENANT, PAYMENT, ACTOR, "2026-06-29T00:00:00Z", "x").catch((e) => {
      expect(e).toBeInstanceOf(ApplicationError)
    })
  })
})
