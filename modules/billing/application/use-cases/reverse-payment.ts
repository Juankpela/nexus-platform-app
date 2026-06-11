import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PaymentRepository } from "@/modules/billing/application/ports/payment-repository"
import { canReversePayment } from "@/modules/billing/domain/payment"
import type { UUID } from "@/types/shared"

export type ReversePaymentDeps = {
  payments: PaymentRepository
  audit: AuditRepository
}

export type ReversePaymentInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  reason: string
  /** Reversal timestamp (ISO); supplied by the caller to avoid clock coupling. */
  reversedAt: string
}

/**
 * E3-H3 — reverse a recorded payment. Recomputes affected invoice balances and
 * statuses. The payment keeps its trace (never deleted).
 */
export async function reversePayment(
  { payments, audit }: ReversePaymentDeps,
  input: ReversePaymentInput,
): Promise<void> {
  const reason = input.reason.trim()
  if (!reason) {
    throw new ApplicationError(
      "A reason is required to reverse a payment.",
      "PAYMENT_REVERSE_REASON_REQUIRED",
    )
  }

  const current = await payments.getById(input.tenantId, input.id)
  if (!current) {
    throw new ApplicationError("Payment not found.", "PAYMENT_NOT_FOUND")
  }
  if (!canReversePayment(current.status)) {
    throw new ApplicationError(
      "This payment is already reversed.",
      "PAYMENT_ALREADY_REVERSED",
    )
  }

  await payments.reverse(
    input.tenantId,
    input.id,
    input.actorId,
    input.reversedAt,
    reason,
  )

  await audit.append({
    eventType: "payment.reversed",
    action: "payment.reversed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "payment",
    subjectId: input.id,
    metadata: { reason, paymentNumber: current.paymentNumber },
    requestId: input.requestId,
    source: "web",
  })
}
