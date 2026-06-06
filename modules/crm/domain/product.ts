import type { UUID } from "@/types/shared"

// ── Enums ───────────────────────────────────────────────────────────────────

export const PRODUCT_TYPES = [
  "physical_product",
  "service",
  "machinery",
  "spare_part",
] as const

export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  physical_product: "Physical Product",
  service: "Service",
  machinery: "Machinery",
  spare_part: "Spare Part",
}

export const PRODUCT_FAMILIES = [
  "flexography",
  "inks",
  "consumables",
  "machinery",
  "technical_services",
  "consulting",
] as const

export type ProductFamily = (typeof PRODUCT_FAMILIES)[number]

export const PRODUCT_FAMILY_LABELS: Record<ProductFamily, string> = {
  flexography: "Flexography",
  inks: "Inks",
  consumables: "Consumables",
  machinery: "Machinery",
  technical_services: "Technical Services",
  consulting: "Consulting",
}

// ── Domain types ─────────────────────────────────────────────────────────────

export type Product = {
  id: UUID
  sku: string | null
  name: string
  description: string | null
  productType: ProductType
  productFamily: ProductFamily
  unitOfMeasure: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ProductInput = {
  sku: string | null
  name: string
  description: string | null
  productType: ProductType
  productFamily: ProductFamily
  unitOfMeasure: string | null
}

export type ProductListQuery = {
  search: string | null
  productType: ProductType | null
  productFamily: ProductFamily | null
  active: boolean | null
  page: number
  pageSize: number
}

export type ProductImportRow = {
  name: string
  sku: string | null
  description: string | null
  productType: ProductType | null
  productFamily: ProductFamily | null
  unitOfMeasure: string | null
}

export type ProductImportResult = {
  imported: number
  errors: Array<{ row: number; message: string }>
}

export type ProductOption = {
  id: UUID
  name: string
  sku: string | null
  productType: ProductType
  productFamily: ProductFamily
}
