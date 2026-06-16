import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { ClientOnly } from "@/components/layout/client-only"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  listCompanyOptions,
  listContactOptions,
  listQuoteOpportunityOptions,
  listQuotePriceBookOptions,
  listTenantQuotes,
} from "@/modules/crm/composition"
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from "@/modules/crm/domain/quote"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { formatDateNumeric } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"
import { QuoteCreateButton } from "./_components/quote-create-button"

export const metadata: Metadata = { title: "Cotizaciones" }

const PAGE_SIZE = 20

export default async function QuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.quotesRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.quotesWrite,
  )

  const page = Math.max(1, Number(sp.page ?? 1))
  const statusFilter =
    sp.status && sp.status !== "_all" ? (sp.status as QuoteStatus) : null
  const search = sp.search ?? null

  const [{ items, total }, companies, contacts, opportunities, priceBooks] =
    await Promise.all([
      listTenantQuotes(context.tenantId, {
        search,
        status: statusFilter,
        companyId: null,
        page,
        pageSize: PAGE_SIZE,
      }),
      canWrite ? listCompanyOptions(context.tenantId) : Promise.resolve([]),
      canWrite ? listContactOptions(context.tenantId) : Promise.resolve([]),
      canWrite
        ? listQuoteOpportunityOptions(context.tenantId)
        : Promise.resolve([]),
      canWrite
        ? listQuotePriceBookOptions(context.tenantId)
        : Promise.resolve([]),
    ])

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description={`${total} ${total !== 1 ? "cotizaciones" : "cotización"}`}
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filters */}
          <form className="flex flex-wrap gap-3">
        <Input
          name="search"
          placeholder="Buscar por número…"
          defaultValue={sp.search ?? ""}
          className="h-9 w-52"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "_all"}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="_all">Todos los estados</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Filtrar
        </Button>
        {(sp.search || (sp.status && sp.status !== "_all")) && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/app/${tenantSlug}/quotes`}>Limpiar</Link>
          </Button>
        )}
          </form>
          {canWrite && (
            <QuoteCreateButton
              tenantSlug={tenantSlug}
              companies={companies}
              contacts={contacts.map((c) => ({ id: c.id, name: c.name, companyId: c.companyId }))}
              opportunities={opportunities}
              priceBooks={priceBooks}
            />
          )}
        </div>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          title="Aún no tienes cotizaciones"
          description="Crea tu primera cotización para empezar."
          actions={
            canWrite ? (
              <ClientOnly>
                <QuoteCreateButton
                  tenantSlug={tenantSlug}
                  companies={companies}
                  contacts={contacts.map((c) => ({ id: c.id, name: c.name, companyId: c.companyId }))}
                  opportunities={opportunities}
                  priceBooks={priceBooks}
                />
              </ClientOnly>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">N.º</th>
                  <th className="px-4 py-3 font-medium">Ver.</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((q) => (
                  <tr key={q.id} className="align-top hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/${tenantSlug}/quotes/${q.id}`}
                        className="font-medium hover:underline"
                      >
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      v{q.version}
                    </td>
                    <td className="px-4 py-3">
                      {q.companyId && q.companyName ? (
                        <Link href={`/app/${tenantSlug}/companies/${q.companyId}`} className="hover:underline">
                          {q.companyName}
                        </Link>
                      ) : (
                        (q.companyName ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${QUOTE_STATUS_COLORS[q.status]}`}
                      >
                        {QUOTE_STATUS_LABELS[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCOP(q.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q.expirationDate ? formatDateNumeric(q.expirationDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateNumeric(q.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath={`/app/${tenantSlug}/quotes`}
            search={search}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            extraParams={statusFilter ? { status: statusFilter } : undefined}
          />
        </>
      )}
      </div>
    </>
  )
}
