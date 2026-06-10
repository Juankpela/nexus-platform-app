import { describe, expect, it } from "vitest"

import { validateAgainstSchema } from "@/modules/api/domain/openapi-contract"
import { OPENAPI_SPEC } from "@/modules/api/domain/openapi-spec"
import { toMaterialResource } from "@/modules/api/presentation/material-resource"
import type { Material } from "@/modules/inventory/domain/material"

// The schema the public contract promises for a Material.
const MATERIAL_SCHEMA = OPENAPI_SPEC.components.schemas.Material

const material: Material = {
  id: "44444444-4444-4444-4444-444444444444",
  tenantId: "11111111-1111-1111-1111-111111111111",
  productId: null,
  sku: "INK-01",
  name: "Tinta cian",
  description: "desc",
  unitOfMeasure: "kg",
  active: true,
  createdAt: "2026-06-10T00:00:00Z",
  updatedAt: "2026-06-10T00:00:00Z",
}

describe("OpenAPI contract — GET /api/v1/materials (ADR-025 #13)", () => {
  it("runtime resource matches the OpenAPI Material schema", () => {
    const resource = toMaterialResource(material)
    expect(validateAgainstSchema(MATERIAL_SCHEMA, resource)).toEqual([])
  })

  it("never leaks tenant_id (no unexpected property)", () => {
    const resource = toMaterialResource(material) as Record<string, unknown>
    expect("tenantId" in resource).toBe(false)
    expect("tenant_id" in resource).toBe(false)
  })

  it("FAILS if a field is renamed (id → materialId)", () => {
    const drifted = { ...toMaterialResource(material), materialId: "x" } as unknown
    // remove id to simulate a rename
    delete (drifted as Record<string, unknown>).id
    const errors = validateAgainstSchema(MATERIAL_SCHEMA, drifted)
    expect(errors).toContain("missing required property: id")
    expect(errors).toContain("unexpected property: materialId")
  })

  it("FAILS on a type mismatch", () => {
    const bad = { ...toMaterialResource(material), active: "yes" } as unknown
    expect(validateAgainstSchema(MATERIAL_SCHEMA, bad)).toContain(
      'type mismatch for active: expected "boolean", got string',
    )
  })
})
