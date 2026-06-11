import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  addInvoiceLine,
  type AddInvoiceLineInput,
} from "@/modules/billing/application/use-cases/add-invoice-line"
import {
  generateInvoiceFromWorkOrder,
  type GenerateInvoiceFromWorkOrderInput,
} from "@/modules/billing/application/use-cases/generate-invoice-from-work-order"
import {
  generateInvoiceFromQuote,
  type GenerateInvoiceFromQuoteInput,
} from "@/modules/billing/application/use-cases/generate-invoice-from-quote"
import {
  issueInvoice,
  type IssueInvoiceInput,
} from "@/modules/billing/application/use-cases/issue-invoice"
import { listInvoices } from "@/modules/billing/application/use-cases/list-invoices"
import {
  removeInvoiceLine,
  type RemoveInvoiceLineInput,
} from "@/modules/billing/application/use-cases/remove-invoice-line"
import {
  updateInvoiceDraft,
  type UpdateInvoiceDraftInput,
} from "@/modules/billing/application/use-cases/update-invoice-draft"
import {
  updateInvoiceLine,
  type UpdateInvoiceLineInput,
} from "@/modules/billing/application/use-cases/update-invoice-line"
import {
  voidInvoice,
  type VoidInvoiceInput,
} from "@/modules/billing/application/use-cases/void-invoice"
import { SupabaseInvoiceRepository } from "@/modules/billing/infrastructure/supabase-invoice-repository"
import { SupabasePaymentRepository } from "@/modules/billing/infrastructure/supabase-payment-repository"
import { SupabaseRevenueTimelineRepository } from "@/modules/billing/infrastructure/supabase-revenue-timeline-repository"
import {
  recordPayment,
  type RecordPaymentUseCaseInput,
} from "@/modules/billing/application/use-cases/record-payment"
import {
  reversePayment,
  type ReversePaymentInput,
} from "@/modules/billing/application/use-cases/reverse-payment"
import { listPayments } from "@/modules/billing/application/use-cases/list-payments"
import type { InvoiceListQuery } from "@/modules/billing/domain/invoice"
import type { PaymentListQuery } from "@/modules/billing/domain/payment"
import type { UUID } from "@/types/shared"

function invoiceRepo() {
  return new SupabaseInvoiceRepository()
}
function paymentRepo() {
  return new SupabasePaymentRepository()
}
function audit() {
  return new SupabaseAuditRepository()
}

// --- Reads -----------------------------------------------------------------
export function listTenantInvoices(tenantId: UUID, query: InvoiceListQuery) {
  return listInvoices(invoiceRepo(), tenantId, query)
}

export function getInvoiceRecord(tenantId: UUID, id: UUID) {
  return invoiceRepo().getById(tenantId, id)
}

export function listInvoiceLines(tenantId: UUID, invoiceId: UUID) {
  return invoiceRepo().listLines(tenantId, invoiceId)
}

// --- Invoice lifecycle -----------------------------------------------------
export function generateInvoiceFromWorkOrderRecord(
  input: GenerateInvoiceFromWorkOrderInput,
) {
  return generateInvoiceFromWorkOrder(
    { invoices: invoiceRepo(), audit: audit() },
    input,
  )
}

export function generateInvoiceFromQuoteRecord(
  input: GenerateInvoiceFromQuoteInput,
) {
  return generateInvoiceFromQuote(
    { invoices: invoiceRepo(), audit: audit() },
    input,
  )
}

export function updateInvoiceDraftRecord(input: UpdateInvoiceDraftInput) {
  return updateInvoiceDraft({ invoices: invoiceRepo(), audit: audit() }, input)
}

export function issueInvoiceRecord(input: IssueInvoiceInput) {
  return issueInvoice({ invoices: invoiceRepo(), audit: audit() }, input)
}

export function voidInvoiceRecord(input: VoidInvoiceInput) {
  return voidInvoice({ invoices: invoiceRepo(), audit: audit() }, input)
}

// --- Invoice lines ---------------------------------------------------------
// --- Revenue Timeline (E4) -------------------------------------------------
export function getCustomerRevenueTimeline(tenantId: UUID, companyId: UUID) {
  return new SupabaseRevenueTimelineRepository().getForCompany(
    tenantId,
    companyId,
  )
}

// --- Payments (E3) ---------------------------------------------------------
export function listTenantPayments(tenantId: UUID, query: PaymentListQuery) {
  return listPayments(paymentRepo(), tenantId, query)
}

export function getPaymentRecord(tenantId: UUID, id: UUID) {
  return paymentRepo().getById(tenantId, id)
}

export function listInvoicePayments(tenantId: UUID, invoiceId: UUID) {
  return paymentRepo().listForInvoice(tenantId, invoiceId)
}

export function listCompanyOpenInvoices(tenantId: UUID, companyId: UUID) {
  return paymentRepo().listOpenInvoices(tenantId, companyId)
}

export function recordPaymentRecord(input: RecordPaymentUseCaseInput) {
  return recordPayment({ payments: paymentRepo(), audit: audit() }, input)
}

export function reversePaymentRecord(input: ReversePaymentInput) {
  return reversePayment({ payments: paymentRepo(), audit: audit() }, input)
}

export function addInvoiceLineRecord(input: AddInvoiceLineInput) {
  return addInvoiceLine({ invoices: invoiceRepo(), audit: audit() }, input)
}

export function updateInvoiceLineRecord(input: UpdateInvoiceLineInput) {
  return updateInvoiceLine({ invoices: invoiceRepo(), audit: audit() }, input)
}

export function removeInvoiceLineRecord(input: RemoveInvoiceLineInput) {
  return removeInvoiceLine({ invoices: invoiceRepo(), audit: audit() }, input)
}
