import { describe, expect, it } from "vitest"

import {
  companyDedupKey,
  COMPANY_TEMPLATE_COLUMNS,
  COMPANY_TEMPLATE_CSV,
  mapRowsToCompanyImport,
} from "@/modules/crm/domain/company-import"
import { missingColumns, parseCsv } from "@/lib/csv/parse"

describe("mapRowsToCompanyImport", () => {
  const headers = [...COMPANY_TEMPLATE_COLUMNS]

  it("maps a full row to a typed import row", () => {
    const [row] = mapRowsToCompanyImport(headers, [
      [
        "Acme SAS",
        "900-1",
        "Construcción",
        "https://acme.co",
        "+57 300",
        "Calle 1",
        "Medellín",
        "Antioquia",
        "Colombia",
        "nota",
      ],
    ])
    expect(row).toEqual({
      name: "Acme SAS",
      taxId: "900-1",
      industry: "Construcción",
      website: "https://acme.co",
      phone: "+57 300",
      address: "Calle 1",
      city: "Medellín",
      state: "Antioquia",
      country: "Colombia",
      notes: "nota",
    })
  })

  it("defaults missing name to empty string and absent cells to null", () => {
    const [row] = mapRowsToCompanyImport(headers, [["", ""]])
    expect(row.name).toBe("")
    expect(row.taxId).toBeNull()
    expect(row.city).toBeNull()
  })
})

describe("companyDedupKey", () => {
  it("prefers the normalized tax id when present", () => {
    expect(companyDedupKey({ name: "Acme", taxId: "900.123-4" })).toBe(
      "tax:9001234",
    )
  })

  it("treats the same NIT written differently as one key", () => {
    const a = companyDedupKey({ name: "Acme", taxId: "900123456-7" })
    const b = companyDedupKey({ name: "Otra razón", taxId: "900 123 456 7" })
    expect(a).toBe(b)
  })

  it("falls back to the normalized name when there is no tax id", () => {
    expect(companyDedupKey({ name: "  El   Roble  ", taxId: null })).toBe(
      "name:el roble",
    )
  })

  it("returns null when both are empty", () => {
    expect(companyDedupKey({ name: "   ", taxId: null })).toBeNull()
  })
})

describe("COMPANY_TEMPLATE_CSV", () => {
  it("parses back into the official columns with no missing required column", () => {
    const { headers } = parseCsv(COMPANY_TEMPLATE_CSV)
    expect(headers).toEqual([...COMPANY_TEMPLATE_COLUMNS])
    expect(missingColumns(headers, ["name"])).toEqual([])
  })
})
