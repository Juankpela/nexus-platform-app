import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ProductRepository } from "@/modules/crm/application/ports/product-repository"
import type { UUID } from "@/types/shared"

export type ChangeProductActiveDeps = {
  products: ProductRepository
  audit: AuditRepository
}

export type ChangeProductActiveInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  active: boolean
}

export async function changeProductActive(
  { products, audit }: ChangeProductActiveDeps,
  input: ChangeProductActiveInput,
): Promise<void> {
  const existing = await products.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Product not found.", "PRODUCT_NOT_FOUND")
  }
  if (existing.active === input.active) return

  await products.setActive(input.tenantId, input.id, input.active)

  const eventType = input.active ? "product.updated" : "product.deactivated"
  await audit.append({
    eventType,
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "product",
    subjectId: input.id,
    action: eventType,
    metadata: { name: existing.name, active: input.active },
    requestId: input.requestId,
    source: "web",
  })
}
