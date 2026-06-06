"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  addQuoteLineRecord,
  changeQuoteRecordStatus,
  createQuoteRecord,
  createQuoteRevisionRecord,
  removeQuoteLineRecord,
  updateQuoteLineRecord,
  updateQuoteRecord,
} from "@/modules/crm/composition"
import type { Quote, QuoteStatus } from "@/modules/crm/domain/quote"
import {
  fail,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuoteActionState = CrmActionState & { data?: Quote }

// ── Schemas ───────────────────────────────────────────────────────────────────

const QuoteInputSchema = z.object({
  opportunityId: z.string().uuid().nullable(),
  companyId: z.string().uuid().nullable(),
  contactId: z.string().uuid().nullable(),
  priceBookId: z.string().uuid().nullable(),
  expirationDate: z.string().nullable(),
  notes: z.string().nullable(),
  discountAmount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
})

const QuoteLineInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  notes: z.string().nullable(),
  sortOrder: z.coerce.number().int().min(0),
})

function parseQuoteInput(formData: FormData) {
  return QuoteInputSchema.parse({
    opportunityId: formData.get("opportunityId") || null,
    companyId: formData.get("companyId") || null,
    contactId: formData.get("contactId") || null,
    priceBookId: formData.get("priceBookId") || null,
    expirationDate: formData.get("expirationDate") || null,
    notes: formData.get("notes") || null,
    discountAmount: formData.get("discountAmount") ?? "0",
    taxAmount: formData.get("taxAmount") ?? "0",
  })
}

function parseQuoteLineInput(formData: FormData) {
  return QuoteLineInputSchema.parse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? "1",
    unitPrice: formData.get("unitPrice") ?? "0",
    discountAmount: formData.get("discountAmount") ?? "0",
    notes: formData.get("notes") || null,
    sortOrder: formData.get("sortOrder") ?? "0",
  })
}

function handleError(err: unknown): CrmActionState {
  if (err instanceof ApplicationError) return fail(err.message)
  if (err instanceof z.ZodError) {
    return fail(err.issues.map((i) => i.message).join(", "))
  }
  console.error(err)
  return fail("An unexpected error occurred.")
}

// ── Create Quote ──────────────────────────────────────────────────────────────

export async function createQuoteAction(
  tenantSlug: string,
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    const data = parseQuoteInput(formData)
    const quote = await createQuoteRecord({
      tenantId,
      actorId: userId,
      requestId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/quotes`)
    return { ok: true, error: null, data: quote }
  } catch (err) {
    return handleError(err)
  }
}

// ── Update Quote ──────────────────────────────────────────────────────────────

export async function updateQuoteAction(
  tenantSlug: string,
  quoteId: string,
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    const data = parseQuoteInput(formData)
    const quote = await updateQuoteRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: quoteId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/quotes`)
    revalidatePath(`/app/${tenantSlug}/quotes/${quoteId}`)
    return { ok: true, error: null, data: quote }
  } catch (err) {
    return handleError(err)
  }
}

// ── Change Quote Status ───────────────────────────────────────────────────────

export async function changeQuoteStatusAction(
  tenantSlug: string,
  quoteId: string,
  status: QuoteStatus,
): Promise<CrmActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    await changeQuoteRecordStatus({
      tenantId,
      actorId: userId,
      requestId,
      id: quoteId,
      status,
    })
    revalidatePath(`/app/${tenantSlug}/quotes`)
    revalidatePath(`/app/${tenantSlug}/quotes/${quoteId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

// ── Add Quote Line ────────────────────────────────────────────────────────────

export async function addQuoteLineAction(
  tenantSlug: string,
  quoteId: string,
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    const data = parseQuoteLineInput(formData)
    await addQuoteLineRecord({
      tenantId,
      actorId: userId,
      requestId,
      quoteId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/quotes/${quoteId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

// ── Update Quote Line ─────────────────────────────────────────────────────────

export async function updateQuoteLineAction(
  tenantSlug: string,
  quoteId: string,
  lineId: string,
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    const data = parseQuoteLineInput(formData)
    await updateQuoteLineRecord({
      tenantId,
      actorId: userId,
      requestId,
      quoteId,
      lineId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/quotes/${quoteId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

// ── Remove Quote Line ─────────────────────────────────────────────────────────

export async function removeQuoteLineAction(
  tenantSlug: string,
  quoteId: string,
  lineId: string,
): Promise<CrmActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    await removeQuoteLineRecord({
      tenantId,
      actorId: userId,
      requestId,
      quoteId,
      lineId,
    })
    revalidatePath(`/app/${tenantSlug}/quotes/${quoteId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

// ── Create Quote Revision ─────────────────────────────────────────────────────

export async function createQuoteRevisionAction(
  tenantSlug: string,
  sourceId: string,
): Promise<QuoteActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.quotesWrite,
    )
    const quote = await createQuoteRevisionRecord({
      tenantId,
      actorId: userId,
      requestId,
      sourceId,
    })
    revalidatePath(`/app/${tenantSlug}/quotes`)
    return { ok: true, error: null, data: quote }
  } catch (err) {
    return handleError(err)
  }
}
