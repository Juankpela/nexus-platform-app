"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { INVENTORY_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  adjustStockMovement,
  consumeMaterialMovement,
  receiveStockMovement,
  releaseReservationMovement,
  reserveMaterialMovement,
} from "@/modules/inventory/composition"
import {
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/modules/inventory/domain/inventory-transaction"
import {
  fail,
  requireInventoryContext,
  type InventoryActionState,
} from "@/modules/inventory/presentation/require-inventory-context"

/**
 * Permiso por tipo de movimiento: el consumo descuenta stock comprometido
 * (inventory.consume); el resto de movimientos manuales son gestión de stock
 * (inventory.stock.manage).
 */
function permissionFor(type: TransactionType): string {
  return type === "consumption"
    ? INVENTORY_PERMISSIONS.consume
    : INVENTORY_PERMISSIONS.stockManage
}

const MovementSchema = z.object({
  materialId: z.string().uuid(),
  type: z.enum(TRANSACTION_TYPES as [TransactionType, ...TransactionType[]]),
  quantity: z.coerce.number().finite(),
})

function handleError(err: unknown): InventoryActionState {
  if (err instanceof ApplicationError) return fail(err.message)
  if (err instanceof z.ZodError) {
    return fail(err.issues.map((i) => i.message).join(", "))
  }
  console.error(err)
  return fail("No se pudo registrar el movimiento.")
}

/**
 * Registra un movimiento de stock MANUAL desde el detalle del material
 * (referenceType "manual", sin referenceId). Los movimientos ligados a una orden
 * de trabajo se emiten desde el flujo de campo/orden, no aquí. Reutiliza los
 * casos de uso ya existentes y guardados (apply-stock-movement).
 */
export async function recordStockMovementAction(
  tenantSlug: string,
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  try {
    const parsed = MovementSchema.parse({
      materialId: formData.get("materialId"),
      type: formData.get("type"),
      quantity: formData.get("quantity"),
    })
    const { tenantId, userId, requestId } = await requireInventoryContext(
      tenantSlug,
      permissionFor(parsed.type),
    )
    const input = {
      actorId: userId,
      tenantId,
      requestId,
      materialId: parsed.materialId,
      quantity: parsed.quantity,
      referenceType: "manual" as const,
      referenceId: null,
    }
    switch (parsed.type) {
      case "receipt":
        await receiveStockMovement(input)
        break
      case "adjustment":
        await adjustStockMovement(input)
        break
      case "reservation":
        await reserveMaterialMovement(input)
        break
      case "release":
        await releaseReservationMovement(input)
        break
      case "consumption":
        await consumeMaterialMovement(input)
        break
    }
    revalidatePath(`/app/${tenantSlug}/inventory/materials/${parsed.materialId}`)
    revalidatePath(`/app/${tenantSlug}/inventory/materials`)
    revalidatePath(`/app/${tenantSlug}/inventory`)
    revalidatePath(`/app/${tenantSlug}/inventory/transactions`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}
