/**
 * Shared result shape for every CSV import (Companies, Contacts, Assets).
 *
 * Extends the original product import result with `skipped` so the V1 dedup
 * policy ("Omitir y reportar") is first-class: a duplicate is neither an
 * import nor an error — it is a skip the user should see counted separately.
 */

export type ImportRowError = {
  /** 1-indexed data row number (header is row 0, first data row is 1). */
  row: number
  message: string
}

export type ImportResult = {
  imported: number
  skipped: number
  errors: ImportRowError[]
}

export function emptyImportResult(): ImportResult {
  return { imported: 0, skipped: 0, errors: [] }
}
