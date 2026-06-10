import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { CsvRenderer } from "@/modules/integrations/infrastructure/csv-renderer"
import type { ColumnSpec } from "@/modules/integrations/domain/export-contract"

type Row = { name: string; note: string | null; active: boolean }

const columns: ColumnSpec<unknown>[] = [
  { key: "name", header: "Name", accessor: (r) => (r as Row).name },
  { key: "note", header: "Note", accessor: (r) => (r as Row).note },
  { key: "active", header: "Active", accessor: (r) => (r as Row).active },
]

// TextDecoder strips a leading BOM by default, so decode() yields BOM-free text.
function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

describe("CsvRenderer", () => {
  it("prefixes a UTF-8 BOM (bytes EF BB BF)", async () => {
    const bytes = await new CsvRenderer().render(columns, [])
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  })

  it("renders header row and data rows", async () => {
    const out = decode(
      await new CsvRenderer().render(columns, [
        { name: "Tinta", note: "ok", active: true },
      ]),
    )
    const lines = out.split("\r\n")
    expect(lines[0]).toBe("Name,Note,Active")
    expect(lines[1]).toBe("Tinta,ok,true")
  })

  it("escapes commas, quotes and newlines; nulls become empty", async () => {
    const out = decode(
      await new CsvRenderer().render(columns, [
        { name: 'A,"B"', note: "line1\nline2", active: false },
      ]),
    )
    const dataLine = out.split("\r\n")[1]
    expect(dataLine).toContain('"A,""B"""')
    expect(dataLine).toContain('"line1\nline2"')
  })

  it("renders headers only for no rows", async () => {
    const out = decode(await new CsvRenderer().render(columns, []))
    expect(out).toBe("Name,Note,Active")
  })
})
