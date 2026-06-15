import { describe, expect, it } from "vitest"

import { missingColumns, parseCsv } from "@/lib/csv/parse"
import {
  assetCompanyKey,
  assetDedupKey,
  ASSET_TEMPLATE_COLUMNS,
  ASSET_TEMPLATE_CSV,
  DEFAULT_ASSET_TYPE,
  hasCompanyReference,
  mapRowsToAssetImport,
  resolveAssetCategory,
  resolveAssetCriticality,
  resolveAssetType,
} from "@/modules/service/domain/asset-import"

describe("mapRowsToAssetImport", () => {
  const headers = [...ASSET_TEMPLATE_COLUMNS]
  it("maps a full row", () => {
    const [r] = mapRowsToAssetImport(headers, [
      ["AC Sala", "equipment", "other", "high", "SN-1", "LG", "X1", "Piso 2", "900-1", "", "nota"],
    ])
    expect(r).toEqual({
      name: "AC Sala",
      assetType: "equipment",
      assetCategory: "other",
      criticality: "high",
      serialNumber: "SN-1",
      manufacturer: "LG",
      model: "X1",
      location: "Piso 2",
      companyTaxId: "900-1",
      companyName: null,
      notes: "nota",
    })
  })
})

describe("enum resolvers", () => {
  it("blank → default", () => {
    expect(resolveAssetType(null)).toBe(DEFAULT_ASSET_TYPE)
    expect(resolveAssetCategory("")).toBe("other")
    expect(resolveAssetCriticality(null)).toBe("medium")
  })
  it("accepts stored English key", () => {
    expect(resolveAssetType("machinery")).toBe("machinery")
    expect(resolveAssetCriticality("CRITICAL")).toBe("critical")
  })
  it("accepts Spanish label", () => {
    expect(resolveAssetType("Maquinaria")).toBe("machinery")
    expect(resolveAssetCriticality("Alta")).toBe("high")
    expect(resolveAssetCategory("Impresión")).toBe("printing")
  })
  it("invalid → null", () => {
    expect(resolveAssetType("xyz")).toBeNull()
    expect(resolveAssetCriticality("urgente")).toBeNull()
  })
})

describe("assetCompanyKey / hasCompanyReference", () => {
  it("prefers NIT normalized", () => {
    expect(assetCompanyKey({ companyTaxId: "900.123-4", companyName: "X" })).toBe("tax:9001234")
  })
  it("falls back to name", () => {
    expect(assetCompanyKey({ companyTaxId: null, companyName: " El  Roble " })).toBe("name:el roble")
  })
  it("detects reference presence", () => {
    expect(hasCompanyReference({ companyTaxId: "", companyName: "  " })).toBe(false)
    expect(hasCompanyReference({ companyTaxId: "900", companyName: null })).toBe(true)
  })
})

describe("assetDedupKey", () => {
  it("prefers serial", () => {
    expect(assetDedupKey({ name: "A", serialNumber: " SN-9 ", companyKey: "tax:1" })).toBe("serial:sn-9")
  })
  it("falls back to name + company", () => {
    expect(assetDedupKey({ name: "Bomba", serialNumber: null, companyKey: "tax:1" })).toBe("name:bomba|tax:1")
  })
  it("null when no serial and no name", () => {
    expect(assetDedupKey({ name: " ", serialNumber: null, companyKey: null })).toBeNull()
  })
})

describe("ASSET_TEMPLATE_CSV", () => {
  it("parses back to official columns with name present", () => {
    const { headers } = parseCsv(ASSET_TEMPLATE_CSV)
    expect(headers).toEqual([...ASSET_TEMPLATE_COLUMNS])
    expect(missingColumns(headers, ["name"])).toEqual([])
  })
})
