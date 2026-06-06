"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changePriceBookRecordActive,
  createPriceBookRecord,
  deactivatePriceBookEntryRecord,
  updatePriceBookRecord,
  upsertPriceBookEntryRecord,
} from "@/modules/crm/composition"
import type { PriceBookInput } from "@/modules/crm/domain/price-book"
import {
  fail,
  field,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

const idSchema = z.uuid()

function readPriceBookInput(formData: FormData): PriceBookInput | null {
  const name = field(formData, "name")
  if (!name) return null
  return {
    name,
    description: field(formData, "description"),
    active: field(formData, "active") !== "false",
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage price books."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "PRICE_BOOK_NOT_FOUND"
  ) {
    return "Price book not found."
  }
  return "The change could not be completed."
}

export async function createPriceBookAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Invalid request.")
  const data = readPriceBookInput(formData)
  if (!data) return fail("Price book name is required.")

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.priceBooksWrite,
    )
    await createPriceBookRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/price-books`)
  return { error: null, ok: true }
}

export async function updatePriceBookAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Invalid request.")
  const data = readPriceBookInput(formData)
  if (!data) return fail("Price book name is required.")

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.priceBooksWrite,
    )
    await updatePriceBookRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/price-books`)
  revalidatePath(`/app/${tenantSlug}/price-books/${id.data}`)
  return { error: null, ok: true }
}

export async function setPriceBookActiveAction(
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
      CRM_PERMISSIONS.priceBooksWrite,
    )
    await changePriceBookRecordActive({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      active,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/price-books`)
  revalidatePath(`/app/${tenantSlug}/price-books/${id.data}`)
  return { error: null, ok: true }
}

export async function upsertPriceBookEntryAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const priceBookId = idSchema.safeParse(field(formData, "priceBookId"))
  const productId = idSchema.safeParse(field(formData, "productId"))
  const priceRaw = field(formData, "unitPrice")
  if (!tenantSlug || !priceBookId.success || !productId.success || !priceRaw) {
    return fail("Invalid request.")
  }

  const unitPrice = parseFloat(priceRaw)
  if (!isFinite(unitPrice) || unitPrice < 0) {
    return fail("Unit price must be a non-negative number.")
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.priceBooksWrite,
    )
    await upsertPriceBookEntryRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      priceBookId: priceBookId.data,
      data: {
        productId: productId.data,
        unitPrice,
        active: field(formData, "active") !== "false",
      },
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/price-books/${priceBookId.data}`)
  return { error: null, ok: true }
}

export async function deactivatePriceBookEntryAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const priceBookId = idSchema.safeParse(field(formData, "priceBookId"))
  const productId = idSchema.safeParse(field(formData, "productId"))
  if (!tenantSlug || !priceBookId.success || !productId.success) {
    return fail("Invalid request.")
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.priceBooksWrite,
    )
    await deactivatePriceBookEntryRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      priceBookId: priceBookId.data,
      productId: productId.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/price-books/${priceBookId.data}`)
  return { error: null, ok: true }
}
