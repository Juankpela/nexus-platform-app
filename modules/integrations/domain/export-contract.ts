/**
 * INT-1 Export Foundation — FROZEN CONTRACTS (ADR-024).
 *
 * These types are the stable, frozen interface of the export capability. Renderers,
 * the column registry, use-cases, and presentation all depend on them. Treat as a
 * versioned contract: additive evolution only (new ExportableObject / ExportFormat
 * values), never breaking changes. Pure domain — no infrastructure imports.
 */

export type ExportFormat = "csv" | "xlsx"
export const EXPORT_FORMATS: readonly ExportFormat[] = ["csv", "xlsx"] as const

/** Objects exposable in INT-1 Sprint B (Tier 1). Async/Tier-2 objects arrive later. */
export type ExportableObject = "materials" | "accounts" | "contacts"
export const EXPORTABLE_OBJECTS: readonly ExportableObject[] = [
  "materials",
  "accounts",
  "contacts",
] as const

/** Synchronous export row ceiling (Tier 1). Beyond this → async export (Sprint C). */
export const EXPORT_ROW_CAP = 5000

/** Async export row ceiling (worker path). Bounds memory even when streaming. */
export const EXPORT_ASYNC_CAP = 100000

/** Loosely-typed filter bag passed from presentation; each data source interprets it. */
export type ExportFilters = {
  search?: string | null
  active?: string | null
  sku?: string | null
}

/**
 * A single output column. The accessor projects a row to a primitive cell value.
 * Centralized in the Column Registry — the ONLY place columns are defined.
 */
export type ColumnSpec<Row> = {
  key: string
  header: string
  accessor: (row: Row) => string | number | boolean | null
}

export type ExportRequest = {
  object: ExportableObject
  format: ExportFormat
  filters: ExportFilters
}

/** A rendered, ready-to-download export. */
export type ExportArtifact = {
  filename: string
  contentType: string
  body: Uint8Array
  rowCount: number
}

export const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

export function isExportableObject(value: string): value is ExportableObject {
  return (EXPORTABLE_OBJECTS as readonly string[]).includes(value)
}

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value)
}
