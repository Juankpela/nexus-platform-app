import type { ProductRepository } from "@/modules/crm/application/ports/product-repository"
import type { Product } from "@/modules/crm/domain/product"
import type { ProductListQuery } from "@/modules/crm/domain/product"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export async function listProducts(
  products: ProductRepository,
  tenantId: UUID,
  query: ProductListQuery,
): Promise<Paginated<Product>> {
  return products.list(tenantId, query)
}
