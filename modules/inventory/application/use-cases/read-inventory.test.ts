import { describe, expect, it, vi } from "vitest"

import type { InventoryRepository } from "@/modules/inventory/application/ports/inventory-repository"
import {
  getInventory,
  getInventoryOverview,
  listMaterials,
  listTransactions,
  searchMaterials,
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
    searchMaterials: vi.fn().mockResolvedValue({ items: [material], total: 1 }),
    listTransactions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getOverview: vi.fn().mockResolvedValue({
      totalMaterials: 1,
      totalItems: 0,
      lowStockCount: 0,
      recentMovements: [],
    }),
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

describe("E-1 read queries delegate to the repository", () => {
  it("searchMaterials forwards the query and returns paged result", async () => {
    const inventory = repo()
    const q = { search: "tinta", sku: null, active: true, limit: 20, offset: 0 }
    const res = await searchMaterials({ inventory }, TENANT, q)
    expect(res).toEqual({ items: [material], total: 1 })
    expect(inventory.searchMaterials).toHaveBeenCalledWith(TENANT, q)
  })

  it("listTransactions forwards the query", async () => {
    const inventory = repo()
    const q = { materialId: MAT, type: null, limit: 25, offset: 0 }
    await listTransactions({ inventory }, TENANT, q)
    expect(inventory.listTransactions).toHaveBeenCalledWith(TENANT, q)
  })

  it("getInventoryOverview returns the overview", async () => {
    const inventory = repo()
    const res = await getInventoryOverview({ inventory }, TENANT)
    expect(res.totalMaterials).toBe(1)
    expect(inventory.getOverview).toHaveBeenCalledWith(TENANT)
  })
})
