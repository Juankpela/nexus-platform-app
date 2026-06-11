"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  recordPaymentRecord,
  reversePaymentRecord,
} from "@/modules/billing/composition"
import type { Payment } from "@/modules/billing/domain/payment"
import {
  fail,
  requireBillingContext,
  type BillingActionState,
} from "@/modules/billing/presentation/require-billing-context"

export type PaymentActionState = BillingActionState & { data?: Payment }

const AllocationSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive(),
})

const RecordPaymentSchema = z.object({
  companyId: z.string().uuid(),
  paymentDate: z.string().min(1),
  method: z.string().min(1),
  reference: z.string().nullable(),
  note: z.string().nullable(),
  allocations: z.array(AllocationSchema).min(1),
})

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

/**
 * E3-H1/H2 — record a payment. Allocations come as a JSON array in the
 * `allocations` field, so the same action serves single- and multi-invoice forms.
 */
export async function recordPaymentAction(
  tenantSlug: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.paymentsWrite,
    )
    const rawAllocations = formData.get("allocations")
    const parsed = RecordPaymentSchema.parse({
      companyId: formData.get("companyId"),
      paymentDate: formData.get("paymentDate") || today(),
      method: formData.get("method") || "transfer",
      reference: formData.get("reference") || null,
      note: formData.get("note") || null,
      allocations: rawAllocations ? JSON.parse(String(rawAllocations)) : [],
    })
    const payment = await recordPaymentRecord({
      tenantId,
      actorId: userId,
      requestId,
      data: parsed,
    })
    revalidatePath(`/app/${tenantSlug}/payments`)
    revalidatePath(`/app/${tenantSlug}/invoices`)
    for (const a of parsed.allocations) {
      revalidatePath(`/app/${tenantSlug}/invoices/${a.invoiceId}`)
    }
    return { ok: true, error: null, data: payment }
  } catch (err) {
    return handleError(err)
  }
}

/** E3-H3 — reverse a recorded payment. */
export async function reversePaymentAction(
  tenantSlug: string,
  paymentId: string,
  reason: string,
): Promise<BillingActionState> {
  try {
    const { tenantId, userId, requestId } = await requireBillingContext(
      tenantSlug,
      BILLING_PERMISSIONS.paymentsWrite,
    )
    await reversePaymentRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: paymentId,
      reason,
      reversedAt: new Date().toISOString(),
    })
    revalidatePath(`/app/${tenantSlug}/payments`)
    revalidatePath(`/app/${tenantSlug}/invoices`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}
