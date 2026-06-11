import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getLeadFunnelMetrics,
  listTenantLeads,
} from "@/modules/crm/composition"
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "@/modules/crm/domain/lead"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { LeadCreateButton } from "./_components/lead-create-button"

export const metadata: Metadata = { title: "Leads" }

const PAGE_SIZE = 20

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.leadsRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.leadsWrite,
  )

  const page = Math.max(1, Number(sp.page ?? 1))
  const statusFilter =
    sp.status && sp.status !== "_all" ? (sp.status as LeadStatus) : null
  const search = sp.search ?? null

  const [{ items, total }, metrics] = await Promise.all([
    listTenantLeads(context.tenantId, {
      search,
      status: statusFilter,
      source: null,
      page,
      pageSize: PAGE_SIZE,
    }),
    getLeadFunnelMetrics(context.tenantId),
  ])

  const rate = `${Math.round(metrics.conversionRate * 100)}%`
  const topSources = metrics.bySource
    .slice(0, 3)
    .map(
      (s) =>
        `${LEAD_SOURCE_LABELS[s.source as LeadSource] ?? s.source}: ${s.count}`,
    )
    .join(" · ")

  return (
    <div className="space-y-6 p-5 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} lead{total !== 1 ? "s" : ""}
          </p>
        </div>
        {canWrite && <LeadCreateButton tenantSlug={tenantSlug} />}
      </div>

      {/* Funnel metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Leads creados" value={String(metrics.created)} />
        <Metric label="Convertidos" value={String(metrics.converted)} />
        <Metric label="Tasa de conversión" value={rate} />
        <Metric label="Top fuentes" value={topSources || "—"} />
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <Input
          name="search"
          placeholder="Buscar por nombre, email o empresa…"
          defaultValue={sp.search ?? ""}
          className="h-9 w-64"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "_all"}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="_all">Todos los estados</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Filtrar
        </Button>
        {(sp.search || (sp.status && sp.status !== "_all")) && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/app/${tenantSlug}/leads`}>Limpiar</Link>
          </Button>
        )}
      </form>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          title="Sin leads todavía"
          description="Captura tu primer lead para empezar el embudo comercial."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Fuente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((l) => (
                  <tr key={l.id} className="align-top hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/${tenantSlug}/leads/${l.id}`}
                        className="font-medium hover:underline"
                      >
                        {l.name}
                      </Link>
                      {l.email && (
                        <div className="text-xs text-muted-foreground">
                          {l.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{l.company ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.source
                        ? (LEAD_SOURCE_LABELS[l.source as LeadSource] ??
                          l.source)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[l.status]}`}
                      >
                        {LEAD_STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath={`/app/${tenantSlug}/leads`}
            search={search}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            extraParams={statusFilter ? { status: statusFilter } : undefined}
          />
        </>
      )}
    </div>
  )
}
