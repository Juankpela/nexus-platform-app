import type { UUID } from "@/types/shared"

/**
 * Material — a consumable/part the field workforce uses (ADR-023). Distinct from
 * the sellable CRM `product`; an optional `productId` links the two when a material
 * is also sold. Pure domain type — no infrastructure.
 */
export type Material = {
  id: UUID
  tenantId: UUID
  productId: UUID | null
  sku: string | null
  name: string
  description: string | null
  unitOfMeasure: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// Mirrors the DB CHECK bounds (20260610002_inventory_core.sql) so the application
// layer can reject invalid drafts before hitting the database.
export const MATERIAL_NAME_MAX = 200
export const MATERIAL_UOM_MAX = 20

/** Fields a caller provides to create/update a material. */
export type MaterialDraft = {
  name: string
  unitOfMeasure: string
  sku?: string | null
  description?: string | null
  productId?: UUID | null
}

export type MaterialDraftError =
  | "MATERIAL_NAME_INVALID"
  | "MATERIAL_UOM_INVALID"

/**
 * Pure validation of a material draft. Returns the list of violations (empty =
 * valid). The application layer turns these into ApplicationErrors.
 */
export function validateMaterialDraft(draft: MaterialDraft): MaterialDraftError[] {
  const errors: MaterialDraftError[] = []
  const name = draft.name?.trim() ?? ""
  if (name.length < 1 || draft.name.length > MATERIAL_NAME_MAX) {
    errors.push("MATERIAL_NAME_INVALID")
  }
  const uom = draft.unitOfMeasure?.trim() ?? ""
  if (uom.length < 1 || draft.unitOfMeasure.length > MATERIAL_UOM_MAX) {
    errors.push("MATERIAL_UOM_INVALID")
  }
  return errors
}
