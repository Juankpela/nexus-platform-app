import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ProductRepository } from "@/modules/crm/application/ports/product-repository"
import type { Product, ProductInput } from "@/modules/crm/domain/product"
import type { UUID } from "@/types/shared"

export type CreateProductDeps = {
  products: ProductRepository
  audit: AuditRepository
}

export type CreateProductInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: ProductInput
}

export async function createProduct(
  { products, audit }: CreateProductDeps,
  input: CreateProductInput,
): Promise<Product> {
  const product = await products.create(input.tenantId, input.data)

  await audit.append({
    eventType: "product.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "product",
    subjectId: product.id,
    action: "product.created",
    metadata: {
      name: product.name,
      sku: product.sku,
      productType: product.productType,
      productFamily: product.productFamily,
    },
    requestId: input.requestId,
    source: "web",
  })

  return product
}
