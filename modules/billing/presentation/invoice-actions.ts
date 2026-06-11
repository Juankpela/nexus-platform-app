"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  addInvoiceLineRecord,
  generateInvoiceFromQuoteRecord,
  generateInvoiceFromWorkOrderRecord,
  issueInvoiceRecord,
  removeInvoiceLineRecord,
  updateInvoiceDraftRecord,
  updateInvoiceLineRecord,
  voidInvoiceRecord,
} from "@/modules/billing/composition"
import type { Invoice } from "@/modules/billing/domain/invoice"
import {
  fail,
  requireBillingContext,
  type BillingActionState,
} from "@/modules/billing/presentation/require-billing-context"

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceActionState = BillingActionState & { data?: Invoice }

// ── Schemas ───────────────────────────────────────────────────────────────────

const InvoiceDraftSchema = z.object({
  contactId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  notes: z.string().nullable(),
})

const InvoiceLineSchema = z.object({
  productId: z.string().uuid().nullable(),
  description: z.string().min(1).max(300),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0),
})

function parseDraftInput(formData: FormData) {
  return InvoiceDraftSchema.parse({
    contactId: formData.get("contactId") || null,
    dueDate: formData.get("dueDate") || null,
    paymentTerms: formData.get("paymentTerms") || null,
    notes: formData.get("notes") || null,
  })
}

function parseLineInput(formData: FormData) {
  return InvoiceLineSchema.parse({
    productId: formData.get("productId") || null,
    description: formData.get("description"),
    quantity: formData.get("quantity") ?? "1",
    unitPrice: formData.get("unitPrice") ?? "0",
    discountAmount: formData.get("discountAmount") ?? "0",
    taxRate: formData.get("taxRate") ?? "0",
    sortOrder: formData.get("sortOrder") ?? "0",
  })
}

function handleError(err: unknown): BillingActionState {
  if (err instanceof ApplicationError) return fail(err.message)
  if (err instanceof z.ZodError) {
    return fail(err.issues.map((i) => i.message).join(", "))
  }
  console.error(err)
  return fail("An unexpected error occurred.")
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Generate from Work Order (E1-H1) ────────────────────────────────────────────

export async function generateInvoiceFromWorkOrderAction(
  tenantSlug: string,
  workOrderId: string,
): Promise<InvoiceActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    const invoice = await generateInvoiceFromWorkOrderRecord({
      tenantId,
      actorId: userId,
      requestId,
      workOrderId,
    })
    revalidatePath(`/app/${tenantSlug}/invoices`)
    return { ok: true, error: null, data: invoice }
  } catch (err) {
    return handleError(err)
  }
}

// ── Generate from Quote (product sale) ──────────────────────────────────────────

export async function generateInvoiceFromQuoteAction(
  tenantSlug: string,
  quoteId: string,
): Promise<InvoiceActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    const invoice = await generateInvoiceFromQuoteRecord({
      tenantId,
      actorId: userId,
      requestId,
      quoteId,
    })
    revalidatePath(`/app/${tenantSlug}/invoices`)
    return { ok: true, error: null, data: invoice }
  } catch (err) {
    return handleError(err)
  }
}

// ── Update draft (E1-H2) ────────────────────────────────────────────────────────

export async function updateInvoiceDraftAction(
  tenantSlug: string,
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    const data = parseDraftInput(formData)
    const invoice = await updateInvoiceDraftRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: invoiceId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/invoices`)
    revalidatePath(`/app/${tenantSlug}/invoices/${invoiceId}`)
    return { ok: true, error: null, data: invoice }
  } catch (err) {
    return handleError(err)
  }
}

// ── Lines (E1-H2) ────────────────────────────────────────────────────────────────

export async function addInvoiceLineAction(
  tenantSlug: string,
  invoiceId: string,
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    const data = parseLineInput(formData)
    await addInvoiceLineRecord({
      tenantId,
      actorId: userId,
      requestId,
      invoiceId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/invoices/${invoiceId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

export async function updateInvoiceLineAction(
  tenantSlug: string,
  invoiceId: string,
  lineId: string,
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    const data = parseLineInput(formData)
    await updateInvoiceLineRecord({
      tenantId,
      actorId: userId,
      requestId,
      invoiceId,
      lineId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/invoices/${invoiceId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

export async function removeInvoiceLineAction(
  tenantSlug: string,
  invoiceId: string,
  lineId: string,
): Promise<BillingActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    await removeInvoiceLineRecord({
      tenantId,
      actorId: userId,
      requestId,
      invoiceId,
      lineId,
    })
    revalidatePath(`/app/${tenantSlug}/invoices/${invoiceId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

// ── Issue (E1-H3) — requires billing.invoices.issue ─────────────────────────────

export async function issueInvoiceAction(
  tenantSlug: string,
  invoiceId: string,
): Promise<InvoiceActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesIssue,
    )
    const invoice = await issueInvoiceRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: invoiceId,
      issueDate: today(),
    })
    revalidatePath(`/app/${tenantSlug}/invoices`)
    revalidatePath(`/app/${tenantSlug}/invoices/${invoiceId}`)
    return { ok: true, error: null, data: invoice }
  } catch (err) {
    return handleError(err)
  }
}

// ── Void (E1-H4) — requires billing.invoices.void ───────────────────────────────

export async function voidInvoiceAction(
  tenantSlug: string,
  invoiceId: string,
  reason: string,
): Promise<BillingActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesVoid,
    )
    await voidInvoiceRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: invoiceId,
      reason,
    })
    revalidatePath(`/app/${tenantSlug}/invoices`)
    revalidatePath(`/app/${tenantSlug}/invoices/${invoiceId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}
