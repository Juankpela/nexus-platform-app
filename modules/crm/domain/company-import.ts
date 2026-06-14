import { rowReader } from "@/lib/csv/parse"

/**
 * Company CSV import (Inc 1). Fixed official template — no dynamic mapping in
 * V1, so the uploaded headers must match these column keys exactly.
 */

/** The only required column. Everything else is optional. */
export const COMPANY_REQUIRED_COLUMNS = ["name"] as const

export const COMPANY_OPTIONAL_COLUMNS = [
  "tax_id",
  "industry",
  "website",
  "phone",
  "address",
  "city",
  "state",
  "country",
  "notes",
] as const

export const COMPANY_TEMPLATE_COLUMNS = [
  ...COMPANY_REQUIRED_COLUMNS,
  ...COMPANY_OPTIONAL_COLUMNS,
] as const

/** A single parsed row, ready for validation in the repository. */
export type CompanyImportRow = {
  name: string
  taxId: string | null
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  notes: string | null
}

/**
 * Official downloadable template: header + two realistic example rows so a PYME
 * owner sees the expected shape. Example cells never start with = + - @ (CSV
 * injection safe).
 */
export const COMPANY_TEMPLATE_CSV = [
  COMPANY_TEMPLATE_COLUMNS.join(","),
  "Inversiones El Roble SAS,900123456-7,Construcción,https://elroble.co,+57 3001112233,Calle 10 #20-30,Medellín,Antioquia,Colombia,Cliente preferente",
  "Lavandería Pacífico,901998877-1,Servicios,,+57 3209998877,Av 5 #12-34,Cali,Valle del Cauca,Colombia,",
].join("\n")

/** Maps raw parsed CSV (headers + rows) to typed import rows. Pure. */
export function mapRowsToCompanyImport(
  headers: string[],
  rows: string[][],
): CompanyImportRow[] {
  return rows.map((row) => {
    const get = rowReader(headers, row)
    return {
      name: get("name") ?? "",
      taxId: get("tax_id"),
      industry: get("industry"),
      website: get("website"),
      phone: get("phone"),
      address: get("address"),
      city: get("city"),
      state: get("state"),
      country: get("country"),
      notes: get("notes"),
    }
  })
}

/**
 * Business key used to detect duplicates: the tax id (NIT) when present —
 * normalized to digits/letters only — otherwise the normalized name. Returns
 * null only when both are empty (such a row fails name validation anyway).
 */
export function companyDedupKey(row: {
  name: string
  taxId: string | null
}): string | null {
  const tax = row.taxId?.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (tax) return `tax:${tax}`
  const name = row.name.trim().toLowerCase().replace(/\s+/g, " ")
  return name ? `name:${name}` : null
}
