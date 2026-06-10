import type { Material } from "@/modules/inventory/domain/material"

/**
 * The public Material resource (column allowlist; never exposes tenant_id — ADR-025
 * #10). This is the single mapping used by BOTH the route and the OpenAPI contract
 * test, so the spec and the runtime cannot drift.
 */
export type MaterialResource = {
  id: string
  sku: string | null
  name: string
  unitOfMeasure: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export function toMaterialResource(m: Material): MaterialResource {
  return {
    id: m.id,
    sku: m.sku,
    name: m.name,
    unitOfMeasure: m.unitOfMeasure,
    active: m.active,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}
