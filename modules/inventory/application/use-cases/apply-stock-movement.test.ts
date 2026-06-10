import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InventoryRepository } from "@/modules/inventory/application/ports/inventory-repository"
import { applyStockMovement } from "@/modules/inventory/application/use-cases/apply-stock-movement"
import type { InventoryItem } from "@/modules/inventory/domain/inventory-item"
import type { Material } from "@/modules/inventory/domain/material"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"
const REQ = "33333333-3333-3333-3333-333333333333"
const MAT = "44444444-4444-4444-4444-444444444444"
const ITEM = "55555555-5555-5555-5555-555555555555"

function material(active = true): Material {
  return {
    id: MAT,
    tenantId: TENANT,
    productId: null,
    sku: "INK-01",
    name: "Tinta cian",
    description: null,
    unitOfMeasure: "kg",
    active,
    createdAt: "2026-06-10T00:00:00Z",
    updatedAt: "2026-06-10T00:00:00Z",
  }
}

function item(onHand: number, reserved: number): InventoryItem {
  return {
    id: ITEM,
    tenantId: TENANT,
    materialId: MAT,
    quantityOnHand: onHand,
    quantityReserved: reserved,
    quantityAvailable: onHand - reserved,
    createdAt: "2026-06-10T00:00:00Z",
    updatedAt: "2026-06-10T00:00:00Z",
  }
}

function setup(opts: {
  material?: Material | null
  item?: InventoryItem | null
  resultOnHand?: number
  resultReserved?: number
}) {
  const apply = vi.fn(async () => ({
    item: item(opts.resultOnHand ?? 0, opts.resultReserved ?? 0),
    transaction: {
      id: "tx",
      tenantId: TENANT,
      materialId: MAT,
      type: "receipt" as const,
      quantity: 1,
      referenceType: "manual" as const,
      referenceId: null,
      createdBy: ACTOR,
      createdAt: "2026-06-10T00:00:00Z",
    },
  }))
  const append = vi.fn().mockResolvedValue(undefined)
  const inventory = {
    getMaterial: vi.fn().mockResolvedValue(
      opts.material === undefined ? material() : opts.material,
    ),
    getInventoryItem: vi.fn().mockResolvedValue(opts.item ?? null),
    applyStockMovement: apply,
    listMaterials: vi.fn(),
  } as unknown as InventoryRepository
  const audit = { append } as unknown as AuditRepository
  return { deps: { inventory, audit }, apply, append }
}

const input = (over: Partial<Parameters<typeof applyStockMovement>[1]> = {}) => ({
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: REQ,
  materialId: MAT,
  type: "receipt" as const,
  quantity: 10,
  referenceType: "manual" as const,
  referenceId: null,
  ...over,
})

describe("applyStockMovement — guards", () => {
  it("rejects an unknown material before touching stock", async () => {
    const { deps, apply, append } = setup({ material: null })
    await expect(applyStockMovement(deps, input())).rejects.toMatchObject({
      code: "MATERIAL_NOT_FOUND",
    })
    expect(apply).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })

  it("rejects an inactive material (QA#1 B-3)", async () => {
    const { deps, apply } = setup({ material: material(false) })
    await expect(applyStockMovement(deps, input())).rejects.toMatchObject({
      code: "MATERIAL_INACTIVE",
    })
    expect(apply).not.toHaveBeenCalled()
  })
})

describe("applyStockMovement — domain error mapping", () => {
  it("maps oversell to INSUFFICIENT_STOCK and skips persistence/audit", async () => {
    const { deps, apply, append } = setup({ item: item(2, 0) })
    await expect(
      applyStockMovement(deps, input({ type: "consumption", quantity: 5 })),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" })
    expect(apply).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })

  it("maps over-reservation to INSUFFICIENT_AVAILABLE", async () => {
    const { deps } = setup({ item: item(10, 8) })
    await expect(
      applyStockMovement(deps, input({ type: "reservation", quantity: 5, referenceType: "manual" })),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_AVAILABLE" })
  })

  it("maps an invalid type↔reference combo to INVALID_REFERENCE_FOR_TYPE", async () => {
    const { deps } = setup({ item: item(10, 0) })
    await expect(
      applyStockMovement(
        deps,
        input({ type: "receipt", referenceType: "work_order", referenceId: REQ }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE_FOR_TYPE" })
  })

  it("treats a missing snapshot as zero stock (consume → INSUFFICIENT_STOCK)", async () => {
    const { deps, apply } = setup({ item: null })
    await expect(
      applyStockMovement(deps, input({ type: "consumption", quantity: 1 })),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" })
    expect(apply).not.toHaveBeenCalled()
  })
})

describe("applyStockMovement — success", () => {
  it("persists then emits the matching domain event to audit", async () => {
    const { deps, apply, append } = setup({ item: null, resultOnHand: 10, resultReserved: 0 })
    const result = await applyStockMovement(deps, input({ type: "receipt", quantity: 10 }))
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "receipt", quantity: 10, createdBy: ACTOR }),
    )
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "inventory.stock_received",
        source: "inventory",
        subjectType: "inventory_item",
      }),
    )
    expect(result.item.quantityOnHand).toBe(10)
  })

  it("forwards the NORMALIZED quantity to the repository (QA#2 F-2)", async () => {
    const { deps, apply } = setup({ item: null, resultOnHand: 1.2346, resultReserved: 0 })
    await applyStockMovement(deps, input({ type: "receipt", quantity: 1.23456 }))
    // 1.23456 normalizes to 1.2346 — the repo must receive the 4dp value, not raw.
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1.2346 }),
    )
  })
})
