import type {
  ColumnSpec,
  ExportFormat,
} from "@/modules/integrations/domain/export-contract"

/** Renders rows + columns to file bytes. One implementation per ExportFormat. */
export interface ExportRenderer {
  readonly format: ExportFormat
  render(columns: ColumnSpec<unknown>[], rows: unknown[]): Promise<Uint8Array>
}
