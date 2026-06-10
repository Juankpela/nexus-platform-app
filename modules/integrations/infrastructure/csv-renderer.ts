import "server-only"

import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import type { ColumnSpec } from "@/modules/integrations/domain/export-contract"

function cell(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  // Escape if it contains comma, quote, or newline (RFC 4180).
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Streaming-friendly CSV. UTF-8 BOM so Excel (LATAM locale) opens it correctly. */
export class CsvRenderer implements ExportRenderer {
  readonly format = "csv" as const

  async render(
    columns: ColumnSpec<unknown>[],
    rows: unknown[],
  ): Promise<Uint8Array> {
    const lines: string[] = []
    lines.push(columns.map((c) => cell(c.header)).join(","))
    for (const row of rows) {
      lines.push(columns.map((c) => cell(c.accessor(row))).join(","))
    }
    const BOM = String.fromCharCode(0xfeff) // UTF-8 BOM so Excel detects encoding
    const csv = BOM + lines.join("\r\n")
    return new TextEncoder().encode(csv)
  }
}
