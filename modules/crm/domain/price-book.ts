import type { ProductFamily, ProductType } from "@/modules/crm/domain/product"
import type { UUID } from "@/types/shared"

export type PriceBook = {
  id: UUID
  name: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PriceBookInput = {
  name: string
  description: string | null
  active: boolean
}

/** An entry in a price book — joined with its product for display. */
export type PriceBookEntry = {
  id: UUID
  priceBookId: UUID
  productId: UUID
  productName: string
  productSku: string | null
  productType: ProductType
  productFamily: ProductFamily
  unitPrice: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PriceBookEntryInput = {
  productId: UUID
  unitPrice: number
  active: boolean
}

/**
 * A price book assignment as seen from the product detail page.
 * Joins price_book_entries with price_books.
 */
export type ProductPriceAssignment = {
  entryId: UUID
  priceBookId: UUID
  priceBookName: string
  unitPrice: number
  active: boolean
}
