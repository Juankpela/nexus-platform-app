import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { RevenueTimelineRepository } from "@/modules/billing/application/ports/revenue-timeline-repository"
import type {
  CustomerRevenueTimeline,
  RevenueTimelineEvent,
} from "@/modules/billing/domain/revenue-timeline"
import type { UUID } from "@/types/shared"

export class SupabaseRevenueTimelineRepository
  implements RevenueTimelineRepository
{
  async getForCompany(
    tenantId: UUID,
    companyId: UUID,
  ): Promise<CustomerRevenueTimeline> {
    const client = await createServerSupabaseClient()

    const [quotesRes, workOrdersRes, invoicesRes, paymentsRes] =
      await Promise.all([
        client
          .from("quotes")
          .select("id, quote_number, status, total_amount, created_at")
          .eq("tenant_id", tenantId)
          .eq("company_id", companyId),
        client
          .from("work_orders")
          .select("id, work_order_number, status, created_at")
          .eq("tenant_id", tenantId)
          .eq("company_id", companyId),
        client
          .from("invoices")
          .select(
            "id, invoice_number, status, total_amount, amount_paid, issue_date, created_at",
          )
          .eq("tenant_id", tenantId)
          .eq("company_id", companyId),
        client
          .from("payments")
          .select("id, payment_number, status, amount, payment_date")
          .eq("tenant_id", tenantId)
          .eq("company_id", companyId),
      ])

    const firstError =
      quotesRes.error ??
      workOrdersRes.error ??
      invoicesRes.error ??
      paymentsRes.error
    if (firstError) {
      throw new ApplicationError(
        "Unable to load revenue timeline.",
        "REVENUE_TIMELINE_FAILED",
        firstError,
      )
    }

    const events: RevenueTimelineEvent[] = []

    for (const q of quotesRes.data ?? []) {
      events.push({
        id: q.id,
        type: "quote",
        date: q.created_at as string,
        title: q.quote_number as string,
        detail: q.status as string,
        amount: Number(q.total_amount),
        href: `quotes/${q.id}`,
        status: q.status as string,
      })
    }

    for (const w of workOrdersRes.data ?? []) {
      events.push({
        id: w.id,
        type: "work_order",
        date: w.created_at as string,
        title: w.work_order_number as string,
        detail: w.status as string,
        amount: null,
        href: `work-orders/${w.id}`,
        status: w.status as string,
      })
    }

    let invoiced = 0
    let paid = 0
    for (const inv of invoicesRes.data ?? []) {
      const status = inv.status as string
      const total = Number(inv.total_amount)
      const amountPaid = Number(inv.amount_paid)
      // Summary counts only real (issued/partially_paid/paid) invoices.
      if (status === "issued" || status === "partially_paid" || status === "paid") {
        invoiced += total
        paid += amountPaid
      }
      events.push({
        id: inv.id,
        type: "invoice",
        date: (inv.issue_date as string | null) ?? (inv.created_at as string),
        title: (inv.invoice_number as string | null) ?? "Borrador",
        detail: status,
        amount: total,
        href: `invoices/${inv.id}`,
        status,
      })
    }

    for (const p of paymentsRes.data ?? []) {
      events.push({
        id: p.id,
        type: "payment",
        date: p.payment_date as string,
        title: p.payment_number as string,
        detail: p.status as string,
        amount: Number(p.amount),
        href: "payments",
        status: p.status as string,
      })
    }

    // Most recent first.
    events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

    return {
      summary: {
        invoiced,
        paid,
        balance: Math.max(0, invoiced - paid),
      },
      events,
    }
  }
}
