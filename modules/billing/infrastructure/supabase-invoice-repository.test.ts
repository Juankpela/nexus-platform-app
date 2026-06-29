import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

// Cliente Supabase encadenable y configurable por tabla. Cada método intermedio
// devuelve el mismo builder; los terminales (maybeSingle/single) resuelven el
// resultado configurado para esa tabla.
type TableResult = { data: unknown; error: unknown }
let tableResults: Record<string, TableResult> = {}

function makeBuilder(result: TableResult) {
  const builder: Record<string, unknown> = {}
  for (const m of ["select", "eq", "neq", "order", "limit", "insert", "update"]) {
    builder[m] = () => builder
  }
  builder.maybeSingle = () => Promise.resolve(result)
  builder.single = () => Promise.resolve(result)
  // Awaitable para consultas de lista (p.ej. quote_lines) que no llaman single().
  builder.then = (resolve: (v: TableResult) => unknown) => resolve(result)
  return builder
}

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: (table: string) => makeBuilder(tableResults[table] ?? { data: null, error: null }),
  }),
}))

import {
  isUniqueViolation,
  SupabaseInvoiceRepository,
} from "@/modules/billing/infrastructure/supabase-invoice-repository"
import { ApplicationError } from "@/lib/errors/application-error"

const TENANT = "11111111-1111-1111-1111-111111111111"
const WO = "22222222-2222-2222-2222-222222222222"
const QUOTE = "33333333-3333-3333-3333-333333333333"
const COMPANY = "44444444-4444-4444-4444-444444444444"

const billableWorkOrder = {
  id: WO,
  company_id: COMPANY,
  billable: true,
  billing_approved_at: "2026-06-29T00:00:00Z",
  status: "completed",
  labor_hours: 1,
  quote_id: null,
}

const acceptedQuote = {
  id: QUOTE,
  company_id: COMPANY,
  status: "accepted",
  quote_number: "Q-1",
}

describe("isUniqueViolation", () => {
  it("detecta SQLSTATE 23505", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true)
  })
  it("ignora otros errores y valores no-objeto", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("boom")).toBe(false)
  })
})

describe("SupabaseInvoiceRepository — candado anti-doble-factura (P0-2)", () => {
  it("createFromWorkOrder traduce 23505 a INVOICE_ALREADY_EXISTS", async () => {
    tableResults = {
      work_orders: { data: billableWorkOrder, error: null },
      invoices: { data: null, error: { code: "23505" } },
    }
    const repo = new SupabaseInvoiceRepository()
    await expect(repo.createFromWorkOrder(TENANT, WO)).rejects.toMatchObject({
      code: "INVOICE_ALREADY_EXISTS",
    })
  })

  it("createFromWorkOrder propaga otros errores como INVOICE_CREATE_FAILED", async () => {
    tableResults = {
      work_orders: { data: billableWorkOrder, error: null },
      invoices: { data: null, error: { code: "23503" } },
    }
    const repo = new SupabaseInvoiceRepository()
    await expect(repo.createFromWorkOrder(TENANT, WO)).rejects.toMatchObject({
      code: "INVOICE_CREATE_FAILED",
    })
  })

  it("createFromQuote traduce 23505 a INVOICE_ALREADY_EXISTS", async () => {
    tableResults = {
      quotes: { data: acceptedQuote, error: null },
      // quote_lines: al menos una línea de producto para pasar el gate
      quote_lines: { data: [{ products: { product_type: "product" } }], error: null },
      invoices: { data: null, error: { code: "23505" } },
    }
    const repo = new SupabaseInvoiceRepository()
    await expect(repo.createFromQuote(TENANT, QUOTE)).rejects.toMatchObject({
      code: "INVOICE_ALREADY_EXISTS",
    })
  })
})

// Sanidad: el error mapeado es un ApplicationError de dominio.
describe("tipo de error", () => {
  it("INVOICE_ALREADY_EXISTS es ApplicationError", async () => {
    tableResults = {
      work_orders: { data: billableWorkOrder, error: null },
      invoices: { data: null, error: { code: "23505" } },
    }
    const repo = new SupabaseInvoiceRepository()
    await repo.createFromWorkOrder(TENANT, WO).catch((e) => {
      expect(e).toBeInstanceOf(ApplicationError)
    })
  })
})
