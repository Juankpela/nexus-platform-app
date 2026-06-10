import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InventoryRepository } from "@/modules/inventory/application/ports/inventory-repository"
import {
  adjustStock,
  consumeMaterial,
  receiveStock,
  releaseReservation,
  reserveMaterial,
  type StockOpInput,
} from "@/modules/inventory/application/use-cases/stock-operations"
import type { InventoryItem } from "@/modules/inventory/domain/inventory-item"
import type { Material } from "@/modules/inventory/domain/material"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"
const MAT = "44444444-4444-4444-4444-444444444444"
const WO = "66666666-6666-6666-6666-666666666666"

const material: Material = {
  id: MAT, tenantId: TENANT, productId: null, sku: null, name: "Tornillo",
  description: null, unitOfMeasure: "u", active: true,
  createdAt: "2026-06-10T00:00:00Z", updatedAt: "2026-06-10T00:00:00Z",
}
const itemRow: InventoryItem = {
  id: "item", tenantId: TENANT, materialId: MAT,
  quantityOnHand: 100, quantityReserved: 20, quantityAvailable: 80,
  createdAt: "2026-06-10T00:00:00Z", updatedAt: "2026-06-10T00:00:00Z",
}

function setup() {
  const apply = vi.fn(async () => ({
    item: itemRow,
    transaction: {
      id: "tx", tenantId: TENANT, materialId: MAT, type: "receipt" as const,
      quantity: 1, referenceType: "manual" as const, referenceId: null,
      createdBy: ACTOR, createdAt: "2026-06-10T00:00:00Z",
    },
  }))
  const inventory = {
    getMaterial: vi.fn().mockResolvedValue(material),
    getInventoryItem: vi.fn().mockResolvedValue(itemRow),
    applyStockMovement: apply,
    listMaterials: vi.fn(),
  } as unknown as InventoryRepository
  const audit = { append: vi.fn().mockResolvedValue(undefined) } as unknown as AuditRepository
  return { deps: { inventory, audit }, apply }
}

const base: StockOpInput = {
  actorId: ACTOR, tenantId: TENANT, requestId: "req", materialId: MAT,
  quantity: 5, referenceType: "manual", referenceId: null,
}

describe("nominal stock operations fix the correct transaction type", () => {
  it("receiveStock → receipt", async () => {
    const { deps, apply } = setup()
    await receiveStock(deps, base)
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ type: "receipt" }))
  })

  it("adjustStock → adjustment (signed)", async () => {
    const { deps, apply } = setup()
    await adjustStock(deps, { ...base, quantity: -3, referenceType: "reconciliation" })
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "adjustment", quantity: -3 }),
    )
  })

  it("reserveMaterial → reservation", async () => {
    const { deps, apply } = setup()
    await reserveMaterial(deps, { ...base, referenceType: "work_order", referenceId: WO })
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ type: "reservation" }))
  })

  it("releaseReservation → release", async () => {
    const { deps, apply } = setup()
    await releaseReservation(deps, { ...base, referenceType: "work_order", referenceId: WO })
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ type: "release" }))
  })

  it("consumeMaterial → consumption, forwarding fulfillReservation", async () => {
    const { deps, apply } = setup()
    await consumeMaterial(deps, {
      ...base,
      referenceType: "work_order",
      referenceId: WO,
      fulfillReservation: true,
    })
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "consumption", fulfillReservation: true }),
    )
  })
})
