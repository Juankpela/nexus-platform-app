import { rowReader } from "@/lib/csv/parse"

/**
 * Contact CSV import (Inc 2). Same fixed-template approach as Companies. The
 * company link is optional: a row may carry company_tax_id and/or company_name
 * to attach the contact to an existing company (resolved server-side by NIT,
 * falling back to normalized name). A row with no company reference imports
 * with no company; a reference that matches nothing is quarantined.
 */

/** The only required column. */
export const CONTACT_REQUIRED_COLUMNS = ["first_name"] as const

export const CONTACT_OPTIONAL_COLUMNS = [
  "last_name",
  "email",
  "phone",
  "mobile",
  "title",
  "department",
  "company_tax_id",
  "company_name",
  "notes",
] as const

export const CONTACT_TEMPLATE_COLUMNS = [
  ...CONTACT_REQUIRED_COLUMNS,
  ...CONTACT_OPTIONAL_COLUMNS,
] as const

export type ContactImportRow = {
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  title: string | null
  department: string | null
  companyTaxId: string | null
  companyName: string | null
  notes: string | null
}

/**
 * Official template: header + two examples. The NITs/names match the Companies
 * template so importing both leaves the contacts linked. The second row uses
 * the company name (no NIT) to show the fallback. No cell starts with = + - @.
 */
export const CONTACT_TEMPLATE_CSV = [
  CONTACT_TEMPLATE_COLUMNS.join(","),
  "María,Gómez,maria@elroble.co,+57 3009998877,,Jefe de Mantenimiento,Operaciones,900123456-7,,Contacto principal",
  "Carlos,Ruiz,carlos@pacifico.co,,,Operario,,,Lavandería Pacífico,",
].join("\n")

export function mapRowsToContactImport(
  headers: string[],
  rows: string[][],
): ContactImportRow[] {
  return rows.map((row) => {
    const get = rowReader(headers, row)
    return {
      firstName: get("first_name") ?? "",
      lastName: get("last_name"),
      email: get("email"),
      phone: get("phone"),
      mobile: get("mobile"),
      title: get("title"),
      department: get("department"),
      companyTaxId: get("company_tax_id"),
      companyName: get("company_name"),
      notes: get("notes"),
    }
  })
}

/** True when the row references a company (by NIT or name) at all. */
export function hasCompanyReference(row: {
  companyTaxId: string | null
  companyName: string | null
}): boolean {
  return Boolean(row.companyTaxId?.trim() || row.companyName?.trim())
}

/**
 * Duplicate key: the email when present (normalized) — otherwise the person's
 * name scoped to the resolved company key, so two "Juan Pérez" at different
 * companies are not treated as the same contact.
 */
export function contactDedupKey(row: {
  firstName: string
  lastName: string | null
  email: string | null
  companyKey: string | null
}): string | null {
  const email = row.email?.trim().toLowerCase()
  if (email) return `email:${email}`
  const name = [row.firstName, row.lastName ?? ""]
    .join(" ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
  if (!name) return null
  return `name:${name}|${row.companyKey ?? ""}`
}
