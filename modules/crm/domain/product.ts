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
  physical_product: "Producto físico",
  service: "Servicio",
  machinery: "Maquinaria",
  spare_part: "Repuesto",
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
  flexography: "Flexografía",
  inks: "Tintas",
  consumables: "Consumibles",
  machinery: "Maquinaria",
  technical_services: "Servicios técnicos",
  consulting: "Consultoría",
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
