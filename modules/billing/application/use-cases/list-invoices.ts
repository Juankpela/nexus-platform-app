import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import type {
  InvoiceListItem,
  InvoiceListQuery,
} from "@/modules/billing/domain/invoice"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

/** Lists invoices for a tenant (used by the invoice list and Revenue Timeline). */
export function listInvoices(
  invoices: InvoiceRepository,
  tenantId: UUID,
  query: InvoiceListQuery,
): Promise<Paginated<InvoiceListItem>> {
  return invoices.list(tenantId, query)
}
