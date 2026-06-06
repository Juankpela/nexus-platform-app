"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeProductRecordActive,
  createProductRecord,
  exportTenantProducts,
  importProductRecords,
  updateProductRecord,
} from "@/modules/crm/composition"
import {
  PRODUCT_FAMILIES,
  PRODUCT_TYPES,
  type ProductInput,
} from "@/modules/crm/domain/product"
import {
  fail,
  field,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

const idSchema = z.uuid()
const productTypeSchema = z.enum(
  [...PRODUCT_TYPES] as [string, ...string[]],
)
const productFamilySchema = z.enum(
  [...PRODUCT_FAMILIES] as [string, ...string[]],
)

export type ProductImportState = {
  error: string | null
  ok: boolean
  imported?: number
  rowErrors?: string[]
}

function readProductInput(formData: FormData): ProductInput | null {
  const name = field(formData, "name")
  if (!name) return null

  const productTypeResult = productTypeSchema.safeParse(
    field(formData, "productType"),
  )
  const productFamilyResult = productFamilySchema.safeParse(
    field(formData, "productFamily"),
  )

  if (!productTypeResult.success || !productFamilyResult.success) return null

  return {
    name,
    sku: field(formData, "sku"),
    description: field(formData, "description"),
    productType: productTypeResult.data as ProductInput["productType"],
    productFamily: productFamilyResult.data as ProductInput["productFamily"],
    unitOfMeasure: field(formData, "unit_of_measure"),
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage products."
  }
  if (error instanceof ApplicationError && error.code === "PRODUCT_NOT_FOUND") {
    return "Product not found."
  }
  return "The change could not be completed."
}

export async function createProductAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Invalid request.")
  const data = readProductInput(formData)
  if (!data) return fail("Product name, type, and family are required.")

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.productsWrite,
    )
    await createProductRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/products`)
  return { error: null, ok: true }
}

export async function updateProductAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Invalid request.")
  const data = readProductInput(formData)
  if (!data) return fail("Product name, type, and family are required.")

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.productsWrite,
    )
    await updateProductRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/products`)
  revalidatePath(`/app/${tenantSlug}/products/${id.data}`)
  return { error: null, ok: true }
}

export async function setProductActiveAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const activeRaw = field(formData, "active")
  if (!tenantSlug || !id.success || activeRaw === null) {
    return fail("Invalid request.")
  }

  const active = activeRaw !== "false"

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.productsWrite,
    )
    await changeProductRecordActive({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      active,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/products`)
  revalidatePath(`/app/${tenantSlug}/products/${id.data}`)
  return { error: null, ok: true }
}

export async function importProductsAction(
  _state: ProductImportState,
  formData: FormData,
): Promise<ProductImportState> {
  const tenantSlug = field(formData, "tenantSlug")
  const rowsJson = field(formData, "rows")
  if (!tenantSlug || !rowsJson) return { error: "Invalid request.", ok: false }

  let rows: unknown
  try {
    rows = JSON.parse(rowsJson)
  } catch {
    return { error: "Invalid CSV data.", ok: false }
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No rows to import.", ok: false }
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.productsWrite,
    )
    const result = await importProductRecords({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      rows: rows as Parameters<typeof importProductRecords>[0]["rows"],
    })

    revalidatePath(`/app/${tenantSlug}/products`)

    return {
      error: null,
      ok: true,
      imported: result.imported,
      rowErrors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
    }
  } catch (error) {
    return {
      error:
        error instanceof ApplicationError && error.code === "FORBIDDEN"
          ? "You do not have permission to import products."
          : "Import failed. Please try again.",
      ok: false,
    }
  }
}

export async function exportProductsCsvAction(
  tenantSlug: string,
): Promise<{ csv: string | null; error: string | null }> {
  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.productsRead,
    )
    const products = await exportTenantProducts(context.tenantId)

    const header =
      "SKU,Name,Description,Product Type,Product Family,Unit of Measure,Active"
    const rows = products.map((p) =>
      [
        p.sku ?? "",
        `"${(p.name ?? "").replace(/"/g, '""')}"`,
        `"${(p.description ?? "").replace(/"/g, '""')}"`,
        p.productType,
        p.productFamily,
        p.unitOfMeasure ?? "",
        p.active ? "true" : "false",
      ].join(","),
    )
    return { csv: [header, ...rows].join("\n"), error: null }
  } catch {
    return { csv: null, error: "Could not export products." }
  }
}
