import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PaymentRepository } from "@/modules/billing/application/ports/payment-repository"
import {
  totalAllocated,
  type Payment,
  type RecordPaymentInput,
} from "@/modules/billing/domain/payment"
import type { UUID } from "@/types/shared"

export type RecordPaymentDeps = {
  payments: PaymentRepository
  audit: AuditRepository
}

export type RecordPaymentUseCaseInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: RecordPaymentInput
}

/**
 * E3-H1/H2 — record a payment applied to one or more invoices. Repository validates
 * each allocation against the invoice's outstanding balance and updates statuses.
 */
export async function recordPayment(
  { payments, audit }: RecordPaymentDeps,
  input: RecordPaymentUseCaseInput,
): Promise<Payment> {
  const { allocations } = input.data
  if (allocations.length === 0) {
    throw new ApplicationError(
      "A payment must be applied to at least one invoice.",
      "PAYMENT_NO_ALLOCATIONS",
    )
  }
  if (allocations.some((a) => a.amount <= 0)) {
    throw new ApplicationError(
      "Allocation amounts must be greater than zero.",
      "PAYMENT_INVALID_ALLOCATION",
    )
  }
  if (totalAllocated(allocations) <= 0) {
    throw new ApplicationError(
      "The payment amount must be greater than zero.",
      "PAYMENT_INVALID_AMOUNT",
    )
  }

  const payment = await payments.record(input.tenantId, input.data)

  await audit.append({
    eventType: "payment.recorded",
    action: "payment.recorded",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "payment",
    subjectId: payment.id,
    metadata: {
      paymentNumber: payment.paymentNumber,
      amount: payment.amount,
      invoices: allocations.length,
    },
    requestId: input.requestId,
    source: "web",
  })

  return payment
}
