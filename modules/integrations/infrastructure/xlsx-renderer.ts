import "server-only"

import { PassThrough } from "node:stream"

import ExcelJS from "exceljs"

import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import type { ColumnSpec } from "@/modules/integrations/domain/export-contract"

/**
 * XLSX via exceljs streaming WorkbookWriter (ADR-024 condition: WorkbookWriter only —
 * never the in-memory Workbook). Writes to an in-process PassThrough and collects the
 * bytes, keeping memory bounded by the row cap.
 */
export class XlsxRenderer implements ExportRenderer {
  readonly format = "xlsx" as const

  async render(
    columns: ColumnSpec<unknown>[],
    rows: unknown[],
  ): Promise<Uint8Array> {
    const stream = new PassThrough()
    const chunks: Buffer[] = []
    stream.on("data", (c: Buffer) => chunks.push(c))
    const done = new Promise<void>((resolve, reject) => {
      stream.on("end", resolve)
      stream.on("error", reject)
    })

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream })
    const sheet = workbook.addWorksheet("Export")
    sheet.addRow(columns.map((c) => c.header)).commit()
    for (const row of rows) {
      const values = columns.map((c) => {
        const v = c.accessor(row)
        return v === null || v === undefined ? "" : v
      })
      sheet.addRow(values).commit()
    }
    await sheet.commit()
    await workbook.commit()
    await done

    return new Uint8Array(Buffer.concat(chunks))
  }
}
