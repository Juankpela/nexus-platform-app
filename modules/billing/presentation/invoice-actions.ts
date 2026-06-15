"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { renderToBuffer } from "@react-pdf/renderer"

import { buildInvoicePdf } from "@/components/billing/invoice-pdf-document"
import { sendEmail } from "@/lib/email/send-email"
import { ApplicationError } from "@/lib/errors/application-error"
import { BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  addInvoiceLineRecord,
  generateInvoiceFromQuoteRecord,
  generateInvoiceFromWorkOrderRecord,
  getInvoiceRecord,
  issueInvoiceRecord,
  listInvoiceLines,
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
import { getTenantBusinessProfile } from "@/modules/tenancy/composition"

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

// ── Send by email (Revenue Inc 3) ───────────────────────────────────────────

const emailSchema = z.string().email()

function str(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

/**
 * Sends the invoice to a client by email with its PDF attached. Manual send.
 */
export async function sendInvoiceEmailAction(
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const tenantSlug = str(formData, "tenantSlug")
  const invoiceId = str(formData, "document_id")
  const to = emailSchema.safeParse(str(formData, "to"))
  const subject = str(formData, "subject")
  const message = str(formData, "message") ?? ""
  if (!tenantSlug || !invoiceId) return fail("Solicitud inválida.")
  if (!to.success) return fail("Destinatario inválido.")
  if (!subject) return fail("El asunto es obligatorio.")

  try {
    const context = await requireBillingContext(tenantSlug, BILLING_PERMISSIONS.invoicesWrite)
    const [invoice, lines, issuer] = await Promise.all([
      getInvoiceRecord(context.tenantId, invoiceId),
      listInvoiceLines(context.tenantId, invoiceId),
      getTenantBusinessProfile(context.tenantId),
    ])
    if (!invoice) return fail("Factura no encontrada.")

    const buffer = await renderToBuffer(
      buildInvoicePdf({ invoice, lines, tenantName: context.tenant.name, issuer }),
    )
    const name = (invoice.invoiceNumber ?? "factura").replace(/[^\w.-]/g, "_")

    await sendEmail({
      to: to.data,
      subject,
      text: message,
      attachments: [{ filename: `${name}.pdf`, content: Buffer.from(buffer) }],
    })
  } catch (err) {
    if (err instanceof ApplicationError && err.code === "EMAIL_NOT_CONFIGURED") {
      return fail("El email no está configurado. Configura RESEND_API_KEY y EMAIL_FROM.")
    }
    if (err instanceof ApplicationError && err.code === "FORBIDDEN") {
      return fail("No tienes permiso para enviar facturas.")
    }
    return fail("No se pudo enviar el correo. Inténtalo de nuevo.")
  }

  return { ok: true, error: null }
}
