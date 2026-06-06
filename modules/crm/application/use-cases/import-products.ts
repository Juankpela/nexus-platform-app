import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ProductRepository } from "@/modules/crm/application/ports/product-repository"
import type {
  ProductImportResult,
  ProductImportRow,
} from "@/modules/crm/domain/product"
import type { UUID } from "@/types/shared"

export type ImportProductsDeps = {
  products: ProductRepository
  audit: AuditRepository
}

export type ImportProductsInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  rows: ProductImportRow[]
}

export async function importProducts(
  { products, audit }: ImportProductsDeps,
  input: ImportProductsInput,
): Promise<ProductImportResult> {
  const result = await products.importBatch(input.tenantId, input.rows)

  if (result.imported > 0) {
    await audit.append({
      eventType: "product.imported",
      actorType: "user",
      actorId: input.actorId,
      tenantId: input.tenantId,
      subjectType: "product",
      subjectId: input.actorId,
      action: "product.imported",
      metadata: {
        imported: result.imported,
        errors: result.errors.length,
        total: input.rows.length,
      },
      requestId: input.requestId,
      source: "web",
    })
  }

  return result
}
