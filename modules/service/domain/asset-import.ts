import { rowReader } from "@/lib/csv/parse"
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  ASSET_CRITICALITIES,
  ASSET_CRITICALITY_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetCategory,
  type AssetCriticality,
  type AssetType,
} from "@/modules/service/domain/asset"

/**
 * Asset CSV import (Inc 3). Fixed official template — headers must match these
 * keys. The company link is optional (resolved by NIT, fallback to name). The
 * three classification enums are optional with safe defaults so a PYME can
 * import a plain "name + serial" file and refine later.
 */

export const ASSET_REQUIRED_COLUMNS = ["name"] as const

export const ASSET_OPTIONAL_COLUMNS = [
  "asset_type",
  "asset_category",
  "criticality",
  "serial_number",
  "manufacturer",
  "model",
  "location",
  "company_tax_id",
  "company_name",
  "notes",
] as const

export const ASSET_TEMPLATE_COLUMNS = [
  ...ASSET_REQUIRED_COLUMNS,
  ...ASSET_OPTIONAL_COLUMNS,
] as const

export const DEFAULT_ASSET_TYPE: AssetType = "equipment"
export const DEFAULT_ASSET_CATEGORY: AssetCategory = "other"
export const DEFAULT_ASSET_CRITICALITY: AssetCriticality = "medium"

export type AssetImportRow = {
  name: string
  assetType: string | null
  assetCategory: string | null
  criticality: string | null
  serialNumber: string | null
  manufacturer: string | null
  model: string | null
  location: string | null
  companyTaxId: string | null
  companyName: string | null
  notes: string | null
}

/**
 * Official template: header + two examples. Enum cells use the stored English
 * keys; the resolvers also accept the Spanish labels. NITs match the Companies
 * template so importing both links the assets. No cell starts with = + - @.
 */
export const ASSET_TEMPLATE_CSV = [
  ASSET_TEMPLATE_COLUMNS.join(","),
  "Aire Acondicionado Sala 3,equipment,other,high,SN-AC-0098,LG,DualCool,Piso 2 Ala Norte,900123456-7,,Mantenimiento mensual",
  "Bomba de agua principal,machinery,other,medium,BMB-441,Pedrollo,CPm620,Cuarto técnico,,Lavandería Pacífico,",
].join("\n")

export function mapRowsToAssetImport(
  headers: string[],
  rows: string[][],
): AssetImportRow[] {
  return rows.map((row) => {
    const get = rowReader(headers, row)
    return {
      name: get("name") ?? "",
      assetType: get("asset_type"),
      assetCategory: get("asset_category"),
      criticality: get("criticality"),
      serialNumber: get("serial_number"),
      manufacturer: get("manufacturer"),
      model: get("model"),
      location: get("location"),
      companyTaxId: get("company_tax_id"),
      companyName: get("company_name"),
      notes: get("notes"),
    }
  })
}

/** Generic enum resolver: blank → default; valid key/label → key; else null. */
function resolveEnum<T extends string>(
  raw: string | null,
  keys: readonly T[],
  labels: Record<T, string>,
  fallback: T,
): T | null {
  const v = raw?.trim().toLowerCase()
  if (!v) return fallback
  const byKey = keys.find((k) => k.toLowerCase() === v)
  if (byKey) return byKey
  const byLabel = keys.find((k) => labels[k].toLowerCase() === v)
  return byLabel ?? null
}

export function resolveAssetType(raw: string | null): AssetType | null {
  return resolveEnum(raw, ASSET_TYPES, ASSET_TYPE_LABELS, DEFAULT_ASSET_TYPE)
}
export function resolveAssetCategory(raw: string | null): AssetCategory | null {
  return resolveEnum(raw, ASSET_CATEGORIES, ASSET_CATEGORY_LABELS, DEFAULT_ASSET_CATEGORY)
}
export function resolveAssetCriticality(raw: string | null): AssetCriticality | null {
  return resolveEnum(raw, ASSET_CRITICALITIES, ASSET_CRITICALITY_LABELS, DEFAULT_ASSET_CRITICALITY)
}

/** Company business key (NIT → normalized name), matching the CRM convention. */
export function assetCompanyKey(row: {
  companyTaxId: string | null
  companyName: string | null
}): string | null {
  const tax = row.companyTaxId?.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (tax) return `tax:${tax}`
  const name = row.companyName?.trim().toLowerCase().replace(/\s+/g, " ")
  return name ? `name:${name}` : null
}

export function hasCompanyReference(row: {
  companyTaxId: string | null
  companyName: string | null
}): boolean {
  return Boolean(row.companyTaxId?.trim() || row.companyName?.trim())
}

/**
 * Duplicate key: serial number when present (the strong key), otherwise the
 * asset name scoped to the resolved company.
 */
export function assetDedupKey(row: {
  name: string
  serialNumber: string | null
  companyKey: string | null
}): string | null {
  const serial = row.serialNumber?.trim().toLowerCase()
  if (serial) return `serial:${serial}`
  const name = row.name.trim().toLowerCase().replace(/\s+/g, " ")
  if (!name) return null
  return `name:${name}|${row.companyKey ?? ""}`
}
