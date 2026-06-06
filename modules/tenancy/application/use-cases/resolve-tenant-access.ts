import { z } from "zod"

import type { TenantRepository } from "@/modules/tenancy/application/ports/tenant-repository"

const tenantSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export async function resolveTenantAccess(
  repository: TenantRepository,
  tenantSlug: string,
) {
  return repository.resolveAccessBySlug(tenantSlugSchema.parse(tenantSlug))
}
