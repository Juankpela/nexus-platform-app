import { describe, expect, it } from "vitest"

import { missingColumns, parseCsv } from "@/lib/csv/parse"
import {
  contactDedupKey,
  CONTACT_TEMPLATE_COLUMNS,
  CONTACT_TEMPLATE_CSV,
  hasCompanyReference,
  mapRowsToContactImport,
} from "@/modules/crm/domain/contact-import"

describe("mapRowsToContactImport", () => {
  const headers = [...CONTACT_TEMPLATE_COLUMNS]

  it("maps a full row", () => {
    const [row] = mapRowsToContactImport(headers, [
      [
        "María",
        "Gómez",
        "maria@x.co",
        "+57 300",
        "+57 311",
        "Jefe",
        "Ops",
        "900-1",
        "",
        "nota",
      ],
    ])
    expect(row).toEqual({
      firstName: "María",
      lastName: "Gómez",
      email: "maria@x.co",
      phone: "+57 300",
      mobile: "+57 311",
      title: "Jefe",
      department: "Ops",
      companyTaxId: "900-1",
      companyName: null,
      notes: "nota",
    })
  })

  it("defaults absent cells to null and missing name to empty", () => {
    const [row] = mapRowsToContactImport(headers, [[""]])
    expect(row.firstName).toBe("")
    expect(row.email).toBeNull()
    expect(row.companyTaxId).toBeNull()
  })
})

describe("hasCompanyReference", () => {
  it("detects a NIT or name reference", () => {
    expect(hasCompanyReference({ companyTaxId: "900-1", companyName: null })).toBe(true)
    expect(hasCompanyReference({ companyTaxId: null, companyName: "Acme" })).toBe(true)
  })
  it("is false when both are empty", () => {
    expect(hasCompanyReference({ companyTaxId: "", companyName: "  " })).toBe(false)
  })
})

describe("contactDedupKey", () => {
  it("prefers the normalized email", () => {
    expect(
      contactDedupKey({
        firstName: "A",
        lastName: "B",
        email: " Maria@X.CO ",
        companyKey: "tax:9001",
      }),
    ).toBe("email:maria@x.co")
  })

  it("falls back to name scoped by company key", () => {
    expect(
      contactDedupKey({
        firstName: "Juan",
        lastName: "Pérez",
        email: null,
        companyKey: "tax:9001",
      }),
    ).toBe("name:juan pérez|tax:9001")
  })

  it("scopes identical names to different companies as distinct keys", () => {
    const a = contactDedupKey({ firstName: "Juan", lastName: "Pérez", email: null, companyKey: "tax:1" })
    const b = contactDedupKey({ firstName: "Juan", lastName: "Pérez", email: null, companyKey: "tax:2" })
    expect(a).not.toBe(b)
  })

  it("returns null when there is no email and no name", () => {
    expect(
      contactDedupKey({ firstName: " ", lastName: null, email: null, companyKey: null }),
    ).toBeNull()
  })
})

describe("CONTACT_TEMPLATE_CSV", () => {
  it("parses back to the official columns with first_name present", () => {
    const { headers } = parseCsv(CONTACT_TEMPLATE_CSV)
    expect(headers).toEqual([...CONTACT_TEMPLATE_COLUMNS])
    expect(missingColumns(headers, ["first_name"])).toEqual([])
  })
})
