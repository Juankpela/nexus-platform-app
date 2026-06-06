import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ProductRepository } from "@/modules/crm/application/ports/product-repository"
import type { Product, ProductInput } from "@/modules/crm/domain/product"
import type { UUID } from "@/types/shared"

export type UpdateProductDeps = {
  products: ProductRepository
  audit: AuditRepository
}

export type UpdateProductInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: ProductInput
}

export async function updateProduct(
  { products, audit }: UpdateProductDeps,
  input: UpdateProductInput,
): Promise<Product> {
  const existing = await products.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Product not found.", "PRODUCT_NOT_FOUND")
  }

  const product = await products.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "product.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "product",
    subjectId: product.id,
    action: "product.updated",
    metadata: { name: product.name, sku: product.sku },
    requestId: input.requestId,
    source: "web",
  })

  return product
}
