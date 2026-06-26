import { ArrowLeft, ArrowRight, Banknote, Cpu, FileText, LifeBuoy, Receipt, Users, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { RevenueTimeline } from "@/components/billing/revenue-timeline"
import { MissionMetricCard } from "@/components/dashboard/mission/mission-metric-card"
import { NextStepBanner } from "@/components/layout/next-step-banner"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getCustomerRevenueTimeline, listTenantInvoices } from "@/modules/billing/composition"
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/modules/billing/domain/invoice"
import {
  getCompanyRecord,
  listCompanyActivityTimeline,
  listTenantContacts,
  listTenantQuotes,
} from "@/modules/crm/composition"
import {
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from "@/modules/crm/domain/quote"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import {
  listTenantAssets,
  listTenantCases,
  listTenantWorkOrders,
} from "@/modules/service/composition"
import { WORK_ORDER_STATUS_LABELS } from "@/modules/service/domain/work-order"
import { CASE_STATUS_LABELS } from "@/modules/service/domain/case"
import { ASSET_STATUS_LABELS } from "@/modules/service/domain/asset"
import { getActiveAssignmentsByWorkOrder } from "@/modules/scheduling/composition"
import {
  buildCompanyFinancials,
  buildCompanyNextAction,
} from "@/modules/platform/application/company-cockpit"
import { formatCOP } from "@/lib/format/money"
import { formatDateNumeric, todayInAppZone } from "@/lib/format/datetime"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Cliente" }

function parseFilters(sp: { type?: string; status?: string }): ActivityFilters {
  const type = (ACTIVITY_TYPES as string[]).includes(sp.type ?? "")
    ? (sp.type as ActivityType)
    : null
  const status =
    sp.status === "open" || sp.status === "completed" ? sp.status : null
  return { type, status }
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}

function badge(cls: string, label: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; companyId: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { tenantSlug, companyId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.companiesRead)

  const can = (p: string) => hasPermission(context.effectivePermissions, p)
  const base = `/app/${tenantSlug}`

  const company = await getCompanyRecord(context.tenantId, companyId)
  if (!company) notFound()

  const canContacts = can(CRM_PERMISSIONS.contactsRead)
  const canWorkOrders = can(SERVICE_PERMISSIONS.workOrdersRead)
  const canCases = can(SERVICE_PERMISSIONS.casesRead)
  const canAssets = can(SERVICE_PERMISSIONS.assetsRead)
  const canQuotes = can(CRM_PERMISSIONS.quotesRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)
  const canReadActivities = can(CRM_PERMISSIONS.activitiesRead)
  const canWriteActivities = can(CRM_PERMISSIONS.activitiesWrite)

  const filters = parseFilters(sp)
  const returnPath = `/app/${tenantSlug}/companies/${companyId}`
  const noWoFilters = { search: null, status: null, priority: null, technicianId: null, companyId, assetId: null, dateFrom: null, dateTo: null }

  const [
    revenue,
    contactsPage,
    workOrdersPage,
    quotesPage,
    invoicesPage,
    casesPage,
    assetsPage,
    activities,
  ] = await Promise.all([
    canInvoices ? getCustomerRevenueTimeline(context.tenantId, companyId) : Promise.resolve(null),
    canContacts ? listTenantContacts(context.tenantId, { search: null, page: 1, pageSize: 5, companyId }) : Promise.resolve(null),
    canWorkOrders ? listTenantWorkOrders(context.tenantId, noWoFilters, 1, 50) : Promise.resolve(null),
    canQuotes ? listTenantQuotes(context.tenantId, { search: null, status: null, companyId, page: 1, pageSize: 50 }) : Promise.resolve(null),
    canInvoices ? listTenantInvoices(context.tenantId, { search: null, status: null, companyId, page: 1, pageSize: 50 }) : Promise.resolve(null),
    canCases ? listTenantCases(context.tenantId, { search: null, status: null, priority: null, ownerId: null, companyId }, 1, 5) : Promise.resolve(null),
    canAssets ? listTenantAssets(context.tenantId, { search: null, status: null, category: null, criticality: null, companyId }, 1, 5) : Promise.resolve(null),
    canReadActivities ? listCompanyActivityTimeline(context.tenantId, companyId, filters) : Promise.resolve([]),
  ])

  const workOrders = workOrdersPage?.items ?? []
  const quotes = quotesPage?.items ?? []
  const invoices = invoicesPage?.items ?? []
  const todayISO = todayInAppZone()

  const financials = buildCompanyFinancials({
    invoiced: revenue?.summary.invoiced ?? 0,
    outstanding: revenue?.summary.balance ?? 0,
    invoices,
    quotes,
    workOrders,
    todayISO,
  })
  const nextAction = buildCompanyNextAction({ invoices, quotes, workOrders, todayISO })

  // Técnico por orden (solo las 5 visibles) — vía asignación activa (ADR-031).
  const woTop = workOrders.slice(0, 5)
  const assignmentMap = canWorkOrders && woTop.length > 0
    ? await getActiveAssignmentsByWorkOrder(context.tenantId, woTop.map((w) => w.id))
    : new Map()

  const quotesTop = quotes.slice(0, 5)
  const invoicesTop = invoices.slice(0, 5)
  const contacts = contactsPage?.items ?? []
  const casesTop = casesPage?.items ?? []
  const assetsTop = assetsPage?.items ?? []

  return (
    <>
      <PageHeader title={company.name} description="Resumen del cliente y acciones." />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <Link
          href={`/app/${tenantSlug}/companies`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Empresas
        </Link>

        {/* 1 — Encabezado de negocio */}
        <div className="rounded-xl border bg-card p-5">
          {company.status === "active"
            ? badge("bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", "Activa")
            : badge("bg-muted text-muted-foreground", "Inactiva")}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Industria" value={company.industry} />
            <Detail label="NIT" value={company.taxId} />
            <Detail label="Teléfono" value={company.phone} />
            <Detail
              label="Ubicación"
              value={[company.city, company.state, company.country].filter(Boolean).join(", ") || null}
            />
            <Detail label="Dirección" value={company.address} />
          </dl>
          {company.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{company.notes}</p>
          ) : null}
        </div>

        {/* 2 — Resumen financiero */}
        {canInvoices || canWorkOrders || canQuotes ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {canInvoices ? (
              <>
                <MissionMetricCard label="Facturado" value={formatCOP(financials.invoiced)} icon={Banknote} accent="emerald" />
                <MissionMetricCard label="Por cobrar" value={formatCOP(financials.outstanding)} icon={Receipt} accent="orange" />
                <MissionMetricCard label="Vencido" value={formatCOP(financials.overdue)} icon={Receipt} accent="orange" />
              </>
            ) : null}
            {canWorkOrders ? (
              <MissionMetricCard label="Trabajos abiertos" value={financials.openWorkOrders} icon={Wrench} accent="blue" />
            ) : null}
            {canQuotes ? (
              <MissionMetricCard label="Cotizaciones pendientes" value={financials.pendingQuotes} icon={FileText} accent="silver" />
            ) : null}
          </div>
        ) : null}

        {/* 3 — Próxima acción */}
        {nextAction ? (
          <NextStepBanner title={nextAction.title} description={nextAction.description}>
            <Button asChild size="sm">
              <Link href={`${base}/${nextAction.segment}/${nextAction.targetId}`}>
                {nextAction.ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </NextStepBanner>
        ) : null}

        {/* 5 — Trabajos relacionados */}
        {canWorkOrders ? (
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold">
                <Wrench className="size-4 text-muted-foreground" /> Trabajos
              </h2>
              <Link href={`${base}/work-orders`} className="text-sm text-muted-foreground hover:text-foreground">
                Ver todos ({workOrdersPage?.total ?? 0})
              </Link>
            </div>
            {woTop.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin trabajos todavía.</p>
            ) : (
              <ul className="divide-y">
                {woTop.map((w) => (
                  <li key={w.id}>
                    <Link href={`${base}/work-orders/${w.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/20">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{w.workOrderNumber}</span>
                        <span className="text-muted-foreground">{w.subject}</span>
                        {badge("bg-muted text-muted-foreground", WORK_ORDER_STATUS_LABELS[w.status])}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{assignmentMap.get(w.id)?.technicianName ?? "Sin asignar"}</span>
                        <span className="tabular-nums">{w.scheduledStart ? formatDateNumeric(w.scheduledStart) : "—"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 6 — Cotizaciones relacionadas */}
        {canQuotes ? (
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold">
                <FileText className="size-4 text-muted-foreground" /> Cotizaciones
              </h2>
              <Link href={`${base}/quotes`} className="text-sm text-muted-foreground hover:text-foreground">
                Ver todas ({quotesPage?.total ?? 0})
              </Link>
            </div>
            {quotesTop.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin cotizaciones todavía.</p>
            ) : (
              <ul className="divide-y">
                {quotesTop.map((q) => (
                  <li key={q.id}>
                    <Link href={`${base}/quotes/${q.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/20">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{q.quoteNumber}</span>
                        {badge(QUOTE_STATUS_COLORS[q.status], QUOTE_STATUS_LABELS[q.status])}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="tabular-nums text-foreground">{formatCOP(q.totalAmount)}</span>
                        <span className="tabular-nums">{formatDateNumeric(q.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 7 — Facturas relacionadas */}
        {canInvoices ? (
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold">
                <Receipt className="size-4 text-muted-foreground" /> Facturas
              </h2>
              <Link href={`${base}/invoices`} className="text-sm text-muted-foreground hover:text-foreground">
                Ver todas ({invoicesPage?.total ?? 0})
              </Link>
            </div>
            {invoicesTop.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin facturas todavía.</p>
            ) : (
              <ul className="divide-y">
                {invoicesTop.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`${base}/invoices/${inv.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/20">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{inv.invoiceNumber ?? "Borrador"}</span>
                        {badge(INVOICE_STATUS_COLORS[inv.status], INVOICE_STATUS_LABELS[inv.status])}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="tabular-nums text-foreground">Saldo {formatCOP(inv.balance)}</span>
                        <span className="tabular-nums">{formatDateNumeric(inv.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* Relación económica — línea de tiempo cotización → OT → factura → pago */}
        {canInvoices && revenue ? (
          <RevenueTimeline tenantSlug={tenantSlug} timeline={revenue} />
        ) : null}

        {/* 4 — Contactos relacionados */}
        {canContacts ? (
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold">
                <Users className="size-4 text-muted-foreground" /> Contactos
              </h2>
              <Link href={`${base}/contacts`} className="text-sm text-muted-foreground hover:text-foreground">
                Ver todos ({contactsPage?.total ?? 0})
              </Link>
            </div>
            {contacts.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin contactos todavía.</p>
            ) : (
              <ul className="divide-y">
                {contacts.map((c) => (
                  <li key={c.id}>
                    <Link href={`${base}/contacts/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/20">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</span>
                        {c.title ? <span className="text-muted-foreground">{c.title}</span> : null}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{c.email ?? "—"}</span>
                        <span>{c.phone ?? c.mobile ?? "—"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 8 — Casos del cliente */}
        {canCases ? (
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold">
                <LifeBuoy className="size-4 text-muted-foreground" /> Casos
              </h2>
              <Link href={`${base}/cases`} className="text-sm text-muted-foreground hover:text-foreground">
                Ver todos ({casesPage?.total ?? 0})
              </Link>
            </div>
            {casesTop.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin casos todavía.</p>
            ) : (
              <ul className="divide-y">
                {casesTop.map((c) => (
                  <li key={c.id}>
                    <Link href={`${base}/cases/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/20">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.caseNumber}</span>
                        <span className="text-muted-foreground">{c.subject}</span>
                        {badge("bg-muted text-muted-foreground", CASE_STATUS_LABELS[c.status])}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 9 — Activos del cliente */}
        {canAssets ? (
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold">
                <Cpu className="size-4 text-muted-foreground" /> Activos
              </h2>
              <Link href={`${base}/assets`} className="text-sm text-muted-foreground hover:text-foreground">
                Ver todos ({assetsPage?.total ?? 0})
              </Link>
            </div>
            {assetsTop.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin activos todavía.</p>
            ) : (
              <ul className="divide-y">
                {assetsTop.map((a) => (
                  <li key={a.id}>
                    <Link href={`${base}/assets/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/20">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{a.assetNumber}</span>
                        <span className="text-muted-foreground">{a.name}</span>
                        {badge("bg-muted text-muted-foreground", ASSET_STATUS_LABELS[a.status])}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {canReadActivities ? (
          <ActivityTimeline
            tenantSlug={tenantSlug}
            returnPath={returnPath}
            companyId={companyId}
            activities={activities}
            filters={filters}
            canWrite={canWriteActivities}
          />
        ) : null}
      </div>
    </>
  )
}
