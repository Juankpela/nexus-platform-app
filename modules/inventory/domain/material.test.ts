import { describe, expect, it } from "vitest"

import { validateMaterialDraft } from "@/modules/inventory/domain/material"

describe("validateMaterialDraft", () => {
  it("accepts a well-formed draft", () => {
    expect(
      validateMaterialDraft({ name: "Tinta cian", unitOfMeasure: "kg" }),
    ).toEqual([])
  })

  it("rejects an empty or whitespace name", () => {
    expect(validateMaterialDraft({ name: "", unitOfMeasure: "kg" })).toContain(
      "MATERIAL_NAME_INVALID",
    )
    expect(validateMaterialDraft({ name: "   ", unitOfMeasure: "kg" })).toContain(
      "MATERIAL_NAME_INVALID",
    )
  })

  it("rejects a name over 200 chars", () => {
    expect(
      validateMaterialDraft({ name: "x".repeat(201), unitOfMeasure: "kg" }),
    ).toContain("MATERIAL_NAME_INVALID")
  })

  it("rejects a missing or oversized unit of measure", () => {
    expect(validateMaterialDraft({ name: "Tinta", unitOfMeasure: "" })).toContain(
      "MATERIAL_UOM_INVALID",
    )
    expect(
      validateMaterialDraft({ name: "Tinta", unitOfMeasure: "x".repeat(21) }),
    ).toContain("MATERIAL_UOM_INVALID")
  })

  it("reports multiple violations at once", () => {
    expect(validateMaterialDraft({ name: "", unitOfMeasure: "" })).toEqual([
      "MATERIAL_NAME_INVALID",
      "MATERIAL_UOM_INVALID",
    ])
  })
})
