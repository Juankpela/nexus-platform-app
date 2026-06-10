import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { Material } from "@/modules/inventory/domain/material"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type MaterialRow = Database["public"]["Tables"]["materials"]["Row"]

function toMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    unitOfMeasure: row.unit_of_measure,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Keyset page of materials for the public API (ADR-025 worker exception): service
 * role + explicit tenant filter, ordered by id (stable). Fetches limit+1 to detect
 * a next page. `afterId` = the last id of the previous page.
 */
export async function listMaterialsKeyset(
  tenantId: UUID,
  params: { afterId: string | null; limit: number; active: boolean | null },
): Promise<{ items: Material[]; nextAfterId: string | null }> {
  const admin = createAdminSupabaseClient()
  let q = admin.from("materials").select("*").eq("tenant_id", tenantId)
  if (params.active !== null) q = q.eq("active", params.active)
  if (params.afterId) q = q.gt("id", params.afterId)

  const { data, error } = await q.order("id", { ascending: true }).limit(params.limit + 1)
  if (error) {
    throw new ApplicationError("Unable to list materials.", "MATERIALS_API_READ_FAILED", error)
  }
  const rows = data ?? []
  const hasMore = rows.length > params.limit
  const page = rows.slice(0, params.limit).map(toMaterial)
  const nextAfterId = hasMore ? page[page.length - 1].id : null
  return { items: page, nextAfterId }
}
