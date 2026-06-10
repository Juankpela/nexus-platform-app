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

import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/supabase-inventory-repository"
import type { ApplyStockMovementParams } from "@/modules/inventory/application/ports/inventory-repository"

const TENANT = "11111111-1111-1111-1111-111111111111"
const MAT = "44444444-4444-4444-4444-444444444444"
const ACTOR = "22222222-2222-2222-2222-222222222222"

const params = (over: Partial<ApplyStockMovementParams> = {}): ApplyStockMovementParams => ({
  tenantId: TENANT,
  materialId: MAT,
  type: "receipt",
  quantity: 10,
  referenceType: "manual",
  referenceId: null,
  fulfillReservation: false,
  createdBy: ACTOR,
  ...over,
})

const okPayload = {
  item: {
    id: "item",
    tenant_id: TENANT,
    material_id: MAT,
    quantity_on_hand: 10,
    quantity_reserved: 0,
    quantity_available: 10,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T00:00:00Z",
  },
  transaction: {
    id: "tx",
    tenant_id: TENANT,
    material_id: MAT,
    type: "receipt",
    quantity: 10,
    reference_type: "manual",
    reference_id: null,
    created_by: ACTOR,
    created_at: "2026-06-10T00:00:00Z",
  },
}

describe("SupabaseInventoryRepository.applyStockMovement", () => {
  beforeEach(() => rpcSpy.mockClear())

  it("calls the correct RPC per type and parses the payload", async () => {
    rpcResult = { data: okPayload, error: null }
    const repo = new SupabaseInventoryRepository()
    const result = await repo.applyStockMovement(params({ type: "receipt" }))
    expect(rpcSpy).toHaveBeenCalledWith(
      "inventory_receive",
      expect.objectContaining({ p_tenant_id: TENANT, p_material_id: MAT, p_quantity: 10 }),
    )
    expect(result.item.quantityOnHand).toBe(10)
    expect(result.transaction.type).toBe("receipt")
  })

  it("forwards p_fulfill_reservation only for consumption", async () => {
    rpcResult = { data: okPayload, error: null }
    const repo = new SupabaseInventoryRepository()
    await repo.applyStockMovement(params({ type: "consumption", fulfillReservation: true }))
    expect(rpcSpy).toHaveBeenCalledWith(
      "inventory_consume",
      expect.objectContaining({ p_fulfill_reservation: true }),
    )
  })

  it("maps a FORBIDDEN RPC error to ApplicationError code FORBIDDEN", async () => {
    rpcResult = { data: null, error: { message: "FORBIDDEN", code: "42501" } }
    const repo = new SupabaseInventoryRepository()
    await expect(repo.applyStockMovement(params())).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("maps INSUFFICIENT_STOCK faithfully", async () => {
    rpcResult = { data: null, error: { message: "INSUFFICIENT_STOCK", code: "P0001" } }
    const repo = new SupabaseInventoryRepository()
    await expect(
      repo.applyStockMovement(params({ type: "consumption", quantity: 5 })),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" })
  })

  it("maps an unknown error to INVENTORY_RPC_FAILED (preserving cause)", async () => {
    rpcResult = { data: null, error: { message: "deadlock detected", code: "40P01" } }
    const repo = new SupabaseInventoryRepository()
    await expect(repo.applyStockMovement(params())).rejects.toMatchObject({
      code: "INVENTORY_RPC_FAILED",
    })
  })
})
