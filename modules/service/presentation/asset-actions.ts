"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeAssetRecordStatus,
  createAssetRecord,
  updateAssetRecord,
} from "@/modules/service/composition"
import {
  ASSET_CATEGORIES,
  ASSET_CRITICALITIES,
  ASSET_STATUSES,
  ASSET_TYPES,
  type AssetInput,
} from "@/modules/service/domain/asset"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const typeSchema = z.enum(ASSET_TYPES)
const categorySchema = z.enum(ASSET_CATEGORIES)
const criticalitySchema = z.enum(ASSET_CRITICALITIES)
const statusSchema = z.enum(ASSET_STATUSES)

type ParsedAsset =
  | { ok: true; data: AssetInput }
  | { ok: false; message: string }

function readAssetInput(formData: FormData): ParsedAsset {
  const name = field(formData, "name")
  if (!name) return { ok: false, message: "El nombre es obligatorio." }

  const type = typeSchema.safeParse(field(formData, "asset_type"))
  if (!type.success) return { ok: false, message: "Selecciona un tipo." }

  const category = categorySchema.safeParse(field(formData, "asset_category"))
  if (!category.success) return { ok: false, message: "Selecciona una categoría." }

  const criticality = criticalitySchema.safeParse(field(formData, "criticality"))
  if (!criticality.success) {
    return { ok: false, message: "Selecciona una criticidad." }
  }

  const parseOptionalId = (raw: string | null) =>
    raw ? idSchema.safeParse(raw) : null
  const companyParsed = parseOptionalId(field(formData, "company_id"))
  if (companyParsed && !companyParsed.success) {
    return { ok: false, message: "Empresa inválida." }
  }
  const productParsed = parseOptionalId(field(formData, "product_id"))
  if (productParsed && !productParsed.success) {
    return { ok: false, message: "Producto inválido." }
  }
  const parentParsed = parseOptionalId(field(formData, "parent_asset_id"))
  if (parentParsed && !parentParsed.success) {
    return { ok: false, message: "Activo padre inválido." }
  }

  let healthScore: number | null = null
  const healthRaw = field(formData, "health_score")
  if (healthRaw) {
    const parsed = Number(healthRaw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      return { ok: false, message: "El health score debe estar entre 0 y 100." }
    }
    healthScore = parsed
  }

  let purchaseCost: number | null = null
  const costRaw = field(formData, "purchase_cost")
  if (costRaw) {
    const parsed = Number(costRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, message: "Costo inválido." }
    }
    purchaseCost = parsed
  }

  return {
    ok: true,
    data: {
      name,
      assetType: type.data,
      assetCategory: category.data,
      criticality: criticality.data,
      healthScore,
      productId: productParsed?.success ? productParsed.data : null,
      companyId: companyParsed?.success ? companyParsed.data : null,
      parentAssetId: parentParsed?.success ? parentParsed.data : null,
      serialNumber: field(formData, "serial_number"),
      manufacturer: field(formData, "manufacturer"),
      model: field(formData, "model"),
      location: field(formData, "location"),
      installedAt: field(formData, "installed_at"),
      warrantyUntil: field(formData, "warranty_until"),
      nextServiceDueAt: field(formData, "next_service_due_at"),
      purchaseCost,
      notes: field(formData, "notes"),
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "No tienes permiso para gestionar activos."
  }
  if (error instanceof ApplicationError && error.code === "ASSET_NOT_FOUND") {
    return "Activo no encontrado."
  }
  return "No se pudo completar la acción."
}

function revalidate(tenantSlug: string, id?: string) {
  revalidatePath(`/app/${tenantSlug}/assets`)
  if (id) revalidatePath(`/app/${tenantSlug}/assets/${id}`)
}

export async function createAssetAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Solicitud inválida.")
  const parsed = readAssetInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.assetsWrite,
    )
    await createAssetRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug)
  return { error: null, ok: true }
}

export async function updateAssetAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")
  const parsed = readAssetInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.assetsWrite,
    )
    await updateAssetRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}

export async function setAssetStatusAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const status = statusSchema.safeParse(field(formData, "status"))
  if (!tenantSlug || !id.success || !status.success) {
    return fail("Solicitud inválida.")
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.assetsWrite,
    )
    await changeAssetRecordStatus({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      status: status.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}
