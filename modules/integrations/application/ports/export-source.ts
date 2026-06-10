import type {
  ColumnSpec,
  ExportFilters,
  ExportableObject,
} from "@/modules/integrations/domain/export-contract"
import type { UUID } from "@/types/shared"

/** Fetches the rows for an object, RLS-scoped, capped at `cap` (+1 to detect overflow). */
export type ExportFetch = (
  tenantId: UUID,
  filters: ExportFilters,
  cap: number,
) => Promise<{ rows: unknown[]; total: number }>

/** Everything needed to export one object: its read, its columns, and its gate. */
export type ExportDefinition = {
  object: ExportableObject
  label: string
  /** Existing read permission that gates this export (no new permissions in INT-1). */
  permission: string
  columns: ColumnSpec<unknown>[]
  fetch: ExportFetch
}

export interface ExportRegistry {
  get(object: ExportableObject): ExportDefinition
}
