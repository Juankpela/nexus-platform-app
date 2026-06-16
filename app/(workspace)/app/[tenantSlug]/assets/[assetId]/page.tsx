import { ArrowLeft, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { PageHeader } from "@/components/layout/page-header"
import { AssetFormDialog } from "@/components/service/asset-form-dialog"
import { AssetStatusControl } from "@/components/service/asset-status-control"
import { HealthScoreBadge } from "@/components/service/health-score-badge"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  listAssetActivityTimeline,
  listCompanyOptions,
  listProductOptions,
  listSubjectAuditEvents,
} from "@/modules/crm/composition"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import type { CompanyOption } from "@/modules/crm/domain/company"
import {
  getAssetRecord,
  getAssetServiceSummary,
  listAssetOptions,
  listCasesForAsset,
  listWorkOrdersForAsset,
} from "@/modules/service/composition"
import { WORK_ORDER_STATUS_LABELS } from "@/modules/service/domain/work-order"
import {
  ASSET_CATEGORY_LABELS,
  ASSET_CRITICALITY_LABELS,
  ASSET_STATUS_LABELS,
  ASSET_TYPE_LABELS,
  type AssetOption,
} from "@/modules/service/domain/asset"
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
} from "@/modules/service/domain/case"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Asset" }

function parseActivityFilters(sp: {
  type?: string
  status?: string
}): ActivityFilters {
  const type = (ACTIVITY_TYPES as string[]).includes(sp.type ?? "")
    ? (sp.type as ActivityType)
    : null
  const status =
    sp.status === "open" || sp.status === "completed" ? sp.status : null
  return { type, status }
}

function Detail({
  label,
  value,
  href,
}: {
  label: string
  value: string | null
  href?: string
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">
        {value && href ? (
          <Link href={href} className="hover:underline">{value}</Link>
        ) : (
          value ?? "—"
        )}
      </dd>
    </div>
  )
}

function Metric({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-semibold text-foreground">
        {children}
      </div>
    </div>
  )
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; assetId: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { tenantSlug, assetId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.assetsRead)

  const asset = await getAssetRecord(context.tenantId, assetId)
  if (!asset) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.assetsWrite,
  )
  const canReadAudit = hasPermission(
    context.effectivePermissions,
    "tenant.audit.read",
  )
  const canReadActivities = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.activitiesRead,
  )
  const canWriteActivities = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.activitiesWrite,
  )

  const filters = parseActivityFilters(sp)
  const returnPath = `/app/${tenantSlug}/assets/${assetId}`

  const canReadWorkOrders = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersRead,
  )

  const [
    relatedCases,
    companyOptions,
    productOptions,
    parentOptions,
    activities,
    auditEvents,
    workOrders,
    serviceSummary,
  ] = await Promise.all([
    listCasesForAsset(context.tenantId, assetId),
    canWrite
      ? listCompanyOptions(context.tenantId)
      : Promise.resolve([] as CompanyOption[]),
    canWrite ? listProductOptions(context.tenantId) : Promise.resolve([]),
    canWrite
      ? listAssetOptions(context.tenantId)
      : Promise.resolve([] as AssetOption[]),
    canReadActivities
      ? listAssetActivityTimeline(context.tenantId, assetId, filters)
      : Promise.resolve([]),
    canReadAudit
      ? listSubjectAuditEvents(context.tenantId, assetId, 20)
      : Promise.resolve([]),
    canReadWorkOrders
      ? listWorkOrdersForAsset(context.tenantId, assetId)
      : Promise.resolve([]),
    canReadWorkOrders
      ? getAssetServiceSummary(context.tenantId, assetId)
      : Promise.resolve(null),
  ])

  const productSelect = productOptions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <>
      <PageHeader
        title={`${asset.assetNumber} · ${asset.name}`}
        description="Detalle del activo, salud, historial y casos relacionados."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${tenantSlug}/assets`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Activos
          </Link>
          <div className="flex items-center gap-3">
            {canWrite ? (
              <AssetStatusControl
                tenantSlug={tenantSlug}
                id={asset.id}
                status={asset.status}
              />
            ) : null}
            {canWrite ? (
              <AssetFormDialog
                tenantSlug={tenantSlug}
                companyOptions={companyOptions}
                productOptions={productSelect}
                parentOptions={parentOptions}
                asset={asset}
                trigger={
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                }
              />
            ) : null}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Salud">
            <HealthScoreBadge score={asset.healthScore} />
          </Metric>
          <Metric label="Criticidad">
            {ASSET_CRITICALITY_LABELS[asset.criticality]}
          </Metric>
          <Metric label="Estado">{ASSET_STATUS_LABELS[asset.status]}</Metric>
          <Metric label="Próximo servicio">
            {asset.nextServiceDueAt
              ? new Date(asset.nextServiceDueAt).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
              : "—"}
          </Metric>
        </div>

        {/* Info */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold">Información general</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Tipo" value={ASSET_TYPE_LABELS[asset.assetType]} />
            <Detail
              label="Categoría"
              value={ASSET_CATEGORY_LABELS[asset.assetCategory]}
            />
            <Detail
              label="Empresa / sede"
              value={asset.companyName}
              href={asset.companyId ? `/app/${tenantSlug}/companies/${asset.companyId}` : undefined}
            />
            <Detail label="Modelo de catálogo" value={asset.productName} />
            <Detail label="Activo padre" value={asset.parentAssetName} />
            <Detail label="N° de serie" value={asset.serialNumber} />
            <Detail label="Fabricante" value={asset.manufacturer} />
            <Detail label="Modelo" value={asset.model} />
            <Detail label="Ubicación" value={asset.location} />
            <Detail
              label="Instalado"
              value={
                asset.installedAt
                  ? new Date(asset.installedAt).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                  : null
              }
            />
            <Detail
              label="Garantía hasta"
              value={
                asset.warrantyUntil
                  ? new Date(asset.warrantyUntil).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                  : null
              }
            />
            <Detail
              label="Costo de compra"
              value={
                asset.purchaseCost != null
                  ? `$${asset.purchaseCost.toLocaleString("es-CO")}`
                  : null
              }
            />
          </dl>
          {asset.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {asset.notes}
            </p>
          ) : null}
        </div>

        {/* Related cases */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Casos relacionados</h2>
          {relatedCases.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
              Este activo no tiene casos registrados.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Asunto</th>
                    <th className="px-4 py-3 font-medium">Prioridad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {relatedCases.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/${tenantSlug}/cases/${c.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {CASE_PRIORITY_LABELS[c.priority]}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {CASE_STATUS_LABELS[c.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Work Orders — service history */}
        {canReadWorkOrders ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="size-4 text-muted-foreground" />
              Órdenes de trabajo
            </div>
            {serviceSummary ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Abiertas">{serviceSummary.openCount}</Metric>
                <Metric label="Históricas">
                  {serviceSummary.historicalCount}
                </Metric>
                <Metric label="Última visita">
                  {serviceSummary.lastVisitAt
                    ? new Date(serviceSummary.lastVisitAt).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                    : "—"}
                </Metric>
                <Metric label="Próxima programada">
                  {serviceSummary.nextScheduledAt
                    ? new Date(
                        serviceSummary.nextScheduledAt,
                      ).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                    : "—"}
                </Metric>
              </div>
            ) : null}
            {serviceSummary?.avgDaysBetweenInterventions != null ? (
              <p className="text-xs text-muted-foreground">
                Tiempo promedio entre intervenciones:{" "}
                <span className="font-medium text-foreground">
                  {serviceSummary.avgDaysBetweenInterventions} días
                </span>
              </p>
            ) : null}
            {workOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
                Este activo no tiene órdenes de trabajo.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Número</th>
                      <th className="px-4 py-3 font-medium">Asunto</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Programada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {workOrders.map((wo) => (
                      <tr key={wo.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/${tenantSlug}/work-orders/${wo.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {wo.workOrderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{wo.subject}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {WORK_ORDER_STATUS_LABELS[wo.status]}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {wo.scheduledStart
                            ? new Date(wo.scheduledStart).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* Activity timeline (service history) */}
        {canReadActivities ? (
          <ActivityTimeline
            tenantSlug={tenantSlug}
            returnPath={returnPath}
            assetId={assetId}
            companyId={asset.companyId}
            activities={activities}
            filters={filters}
            canWrite={canWriteActivities}
          />
        ) : null}

        {/* Audit history */}
        {canReadAudit && auditEvents.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Historial de auditoría</h2>
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Evento</th>
                    <th className="px-4 py-3 font-medium">Cuándo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditEvents.map((ev) => (
                    <tr key={ev.id} className="align-top">
                      <td className="px-4 py-3 font-medium">{ev.action}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(ev.occurredAt).toLocaleString(undefined, { timeZone: "America/Bogota" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
