import { describe, expect, it, vi } from "vitest"

import type { InventoryRepository } from "@/modules/inventory/application/ports/inventory-repository"
import {
  getInventory,
  listMaterials,
} from "@/modules/inventory/application/use-cases/read-inventory"
import type { Material } from "@/modules/inventory/domain/material"

const TENANT = "11111111-1111-1111-1111-111111111111"
const MAT = "44444444-4444-4444-4444-444444444444"

const material: Material = {
  id: MAT, tenantId: TENANT, productId: null, sku: null, name: "Cinta",
  description: null, unitOfMeasure: "m", active: true,
  createdAt: "2026-06-10T00:00:00Z", updatedAt: "2026-06-10T00:00:00Z",
}

function repo(over: Partial<Record<keyof InventoryRepository, unknown>> = {}) {
  return {
    getMaterial: vi.fn().mockResolvedValue(material),
    getInventoryItem: vi.fn().mockResolvedValue(null),
    listMaterials: vi.fn().mockResolvedValue([material]),
    applyStockMovement: vi.fn(),
    ...over,
  } as unknown as InventoryRepository
}

describe("listMaterials", () => {
  it("delegates to the repository with options", async () => {
    const inventory = repo()
    const res = await listMaterials({ inventory }, TENANT, { activeOnly: true })
    expect(res).toEqual([material])
    expect(inventory.listMaterials).toHaveBeenCalledWith(TENANT, { activeOnly: true })
  })
})

describe("getInventory", () => {
  it("returns material + null snapshot when no stock exists yet", async () => {
    const inventory = repo()
    const res = await getInventory({ inventory }, TENANT, MAT)
    expect(res).toEqual({ material, item: null })
  })

  it("throws MATERIAL_NOT_FOUND for an unknown material", async () => {
    const inventory = repo({ getMaterial: vi.fn().mockResolvedValue(null) })
    await expect(getInventory({ inventory }, TENANT, MAT)).rejects.toMatchObject({
      code: "MATERIAL_NOT_FOUND",
    })
  })
})
