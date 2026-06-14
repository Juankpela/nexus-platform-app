/**
 * Minimal, dependency-free CSV parsing for the import wizard (Inc 0).
 *
 * Extracted from the original product-csv-import component so Companies,
 * Contacts and Assets share one parser. Quote-aware (RFC 4180-ish): handles
 * quoted fields, escaped double-quotes and commas inside quotes. Headers are
 * normalized to snake_case so the fixed official templates line up regardless
 * of casing/spacing.
 */

export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

function splitLine(line: string): string[] {
  const fields: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur.trim())
      cur = ""
    } else {
      cur += ch
    }
  }
  fields.push(cur.trim())
  return fields
}

/** Normalize a header cell to the snake_case key used by templates. */
export function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_")
}

export function parseCsv(text: string): ParsedCsv {
  // Strip a UTF-8 BOM that Excel prepends, then drop blank lines.
  const clean = text.replace(/^﻿/, "")
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = splitLine(lines[0]).map(normalizeHeader)
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

/**
 * Fixed-template guard (V1 has no dynamic mapping): returns the required
 * columns that are absent from the uploaded file's headers.
 */
export function missingColumns(headers: string[], required: string[]): string[] {
  const present = new Set(headers)
  return required.filter((col) => !present.has(col))
}

/**
 * Builds a (key) => value reader for a single row, indexed by header position.
 * Returns the trimmed cell or null when empty/absent — the shape importers
 * expect for nullable fields.
 */
export function rowReader(
  headers: string[],
  row: string[],
): (key: string) => string | null {
  return (key: string) => {
    const i = headers.indexOf(key)
    if (i < 0 || i >= row.length) return null
    const v = row[i]
    return v && v.length > 0 ? v : null
  }
}
