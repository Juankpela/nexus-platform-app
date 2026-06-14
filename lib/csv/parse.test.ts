import { describe, expect, it } from "vitest"

import {
  missingColumns,
  normalizeHeader,
  parseCsv,
  rowReader,
} from "@/lib/csv/parse"

describe("normalizeHeader", () => {
  it("lowercases, trims and collapses spaces to underscores", () => {
    expect(normalizeHeader("  Tax ID ")).toBe("tax_id")
    expect(normalizeHeader("Company Name")).toBe("company_name")
    expect(normalizeHeader("name")).toBe("name")
  })
})

describe("parseCsv", () => {
  it("returns empty headers/rows for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] })
    expect(parseCsv("\n  \n")).toEqual({ headers: [], rows: [] })
  })

  it("parses headers (normalized) and data rows", () => {
    const { headers, rows } = parseCsv("Name,Tax ID\nAcme,900-1\nBeta,901-2")
    expect(headers).toEqual(["name", "tax_id"])
    expect(rows).toEqual([
      ["Acme", "900-1"],
      ["Beta", "901-2"],
    ])
  })

  it("handles quoted fields with commas and escaped quotes", () => {
    const { rows } = parseCsv('name,notes\n"Acme, Inc.","He said ""hi"""')
    expect(rows[0]).toEqual(["Acme, Inc.", 'He said "hi"'])
  })

  it("tolerates CRLF line endings and a UTF-8 BOM", () => {
    const { headers, rows } = parseCsv("﻿name\r\nAcme\r\n")
    expect(headers).toEqual(["name"])
    expect(rows).toEqual([["Acme"]])
  })

  it("skips blank lines between rows", () => {
    const { rows } = parseCsv("name\nAcme\n\nBeta\n")
    expect(rows).toEqual([["Acme"], ["Beta"]])
  })
})

describe("missingColumns", () => {
  it("reports required columns absent from the header set", () => {
    expect(missingColumns(["name", "tax_id"], ["name"])).toEqual([])
    expect(missingColumns(["name"], ["name", "company_tax_id"])).toEqual([
      "company_tax_id",
    ])
  })
})

describe("rowReader", () => {
  const headers = ["name", "tax_id", "city"]

  it("reads cells by header key", () => {
    const get = rowReader(headers, ["Acme", "900-1", "Medellín"])
    expect(get("name")).toBe("Acme")
    expect(get("city")).toBe("Medellín")
  })

  it("returns null for empty cells, missing keys or short rows", () => {
    const get = rowReader(headers, ["Acme", ""])
    expect(get("tax_id")).toBeNull() // empty cell
    expect(get("city")).toBeNull() // row shorter than headers
    expect(get("unknown")).toBeNull() // key not in headers
  })
})
