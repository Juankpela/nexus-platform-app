import { ArrowLeft, ArrowRight, Building2, Cpu, LifeBuoy, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { LifecycleTimeline } from "@/components/service/lifecycle-timeline"
import { PageHeader } from "@/components/layout/page-header"
import { WorkOrderFormDialog } from "@/components/service/work-order-form-dialog"
import { WorkOrderStatusControl } from "@/components/service/work-order-status-control"
import { WorkOrderTechnicianAssign } from "@/components/service/work-order-technician-assign"
import { WorkOrderEligibilityPanel } from "@/components/scheduling/work-order-eligibility-panel"
import { NextStepBanner } from "@/components/layout/next-step-banner"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { GenerateInvoiceButton } from "./_components/generate-invoice-button"
import {
  listCompanyOptions,
  listSubjectAuditEvents,
  listWorkOrderActivityTimeline,
} from "@/modules/crm/composition"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import type { CompanyOption } from "@/modules/crm/domain/company"
import {
  getCaseRecord,
  getWorkOrderLifecycle,
  getWorkOrderRecord,
  listAssetOptions,
  listTenantCases,
  listTenantSkills,
  listTenantTechnicians,
  listTenantZones,
} from "@/modules/service/composition"
import { WhatsAppNotifyPanel } from "@/components/service/whatsapp-notify-panel"
import {
  buildWhatsAppUrl,
  completedMessage,
  confirmationMessage,
  enRouteMessage,
  type WhatsAppMessageContext,
} from "@/modules/notifications/domain/whatsapp-link"
import { env } from "@/lib/config/env"
import { formatDateTime } from "@/lib/format/datetime"
import { getActiveAssignmentsByWorkOrder } from "@/modules/scheduling/composition"
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  isWorkOrderInvoiceable,
} from "@/modules/service/domain/work-order"
import { technicianFullName } from "@/modules/service/domain/technician"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { WorkOrderBillingControls } from "./_components/work-order-billing-controls"

export const metadata: Metadata = { title: "Orden de trabajo" }

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

function fmt(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota" }) : null
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

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; workOrderId: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { tenantSlug, workOrderId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersRead,
  )

  const workOrder = await getWorkOrderRecord(context.tenantId, workOrderId)
  if (!workOrder) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersWrite,
  )
  const canInvoice = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesWrite,
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
  const returnPath = `/app/${tenantSlug}/work-orders/${workOrderId}`

  const [techPage, companyOptions, assetOptions, caseResult, activities, auditEvents, skillCatalog, zoneCatalog, activeAssignmentMap, lifecycle] =
    await Promise.all([
      listTenantTechnicians(
        context.tenantId,
        { search: null, status: null },
        "name",
        1,
        200,
      ),
      canWrite
        ? listCompanyOptions(context.tenantId)
        : Promise.resolve([] as CompanyOption[]),
      canWrite ? listAssetOptions(context.tenantId) : Promise.resolve([]),
      canWrite
        ? listTenantCases(
            context.tenantId,
            { search: null, status: null, priority: null, ownerId: null },
            1,
            100,
          )
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
      canReadActivities
        ? listWorkOrderActivityTimeline(context.tenantId, workOrderId, filters)
        : Promise.resolve([]),
      canReadAudit
        ? listSubjectAuditEvents(context.tenantId, workOrderId, 20)
        : Promise.resolve([]),
      listTenantSkills(context.tenantId),
      listTenantZones(context.tenantId),
      getActiveAssignmentsByWorkOrder(context.tenantId, [workOrder.id]),
      getWorkOrderLifecycle(context.tenantId, workOrder.id),
    ])

  // Caso asociado: para el teléfono del cliente y el token de seguimiento (aviso
  // por WhatsApp). Solo si la WO tiene caso de origen.
  const linkedCase = workOrder.caseId
    ? await getCaseRecord(context.tenantId, workOrder.caseId)
    : null

  // ADR-031: technician + assignment derive from the scheduling aggregate.
  const technicianOptions = techPage.items.map((t) => ({
    id: t.id,
    label: technicianFullName(t),
  }))
  const active = activeAssignmentMap.get(workOrder.id) ?? null
  const activeAssignment = active
    ? {
        id: active.id,
        technicianId: active.technicianId,
        technicianName: active.technicianName,
        scheduledStart: active.scheduledStart,
        scheduledEnd: active.scheduledEnd,
      }
    : null
  const technicianLabel = activeAssignment?.technicianName ?? "Sin asignar"
  const caseOptions = caseResult.items.map((c) => ({
    id: c.id,
    label: `${c.caseNumber} · ${c.subject}`,
  }))

  // Aviso al cliente por WhatsApp (Nivel 1): mensajes pre-escritos al teléfono del
  // reportante. La acción primaria depende del estado de la WO.
  const customerPhone = linkedCase?.reporterPhone ?? null
  const trackingUrl = linkedCase?.trackingToken
    ? `${env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}/seguimiento/${linkedCase.trackingToken}`
    : null
  const waContext: WhatsAppMessageContext = {
    technicianName: activeAssignment?.technicianName ?? null,
    caseSubject: linkedCase?.subject ?? workOrder.subject,
    workOrderNumber: workOrder.workOrderNumber,
    whenText: activeAssignment?.scheduledStart
      ? formatDateTime(activeAssignment.scheduledStart)
      : null,
    trackingUrl,
  }
  const isCompleted = workOrder.status === "completed"
  const whatsappActions = [
    {
      label: "Confirmar visita",
      url: buildWhatsAppUrl(customerPhone, confirmationMessage(waContext)),
      primary: false,
    },
    {
      label: "Voy en camino",
      url: buildWhatsAppUrl(customerPhone, enRouteMessage(waContext)),
      primary: !isCompleted,
    },
    {
      label: "Trabajo completado",
      url: buildWhatsAppUrl(customerPhone, completedMessage(waContext)),
      primary: isCompleted,
    },
  ]

  return (
    <>
      <PageHeader
        title={`${workOrder.workOrderNumber} · ${workOrder.subject}`}
        description="Orden de trabajo — trazabilidad operacional completa."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${tenantSlug}/work-orders`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Órdenes de trabajo
          </Link>
          <div className="flex items-center gap-2">
            {canWrite ? (
              <WorkOrderFormDialog
                tenantSlug={tenantSlug}
                companyOptions={companyOptions}
                caseOptions={caseOptions}
                assetOptions={assetOptions}
                workOrder={workOrder}
                trigger={
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                }
              />
            ) : null}
          </div>
        </div>

        {/* Siguiente paso del lazo de dinero */}
        {canInvoice && isWorkOrderInvoiceable(workOrder) ? (
          <NextStepBanner
            title="Trabajo listo para facturar"
            description="Genera la factura de este trabajo para cobrar."
          >
            <GenerateInvoiceButton tenantSlug={tenantSlug} workOrderId={workOrder.id} />
          </NextStepBanner>
        ) : null}

        {/* Traceability chain: Cliente -> Activo -> Caso -> Intervención */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          {workOrder.companyId ? (
            <Link
              href={`/app/${tenantSlug}/companies/${workOrder.companyId}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <Building2 className="size-4" />
              {workOrder.companyName ?? "—"}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-4" />
              {workOrder.companyName ?? "—"}
            </span>
          )}
          <ArrowRight className="size-4 text-muted-foreground/50" />
          {workOrder.assetId ? (
            <Link
              href={`/app/${tenantSlug}/assets/${workOrder.assetId}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <Cpu className="size-4" />
              {workOrder.assetName}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="size-4" />
              Sin activo
            </span>
          )}
          <ArrowRight className="size-4 text-muted-foreground/50" />
          {workOrder.caseId ? (
            <Link
              href={`/app/${tenantSlug}/cases/${workOrder.caseId}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <LifeBuoy className="size-4" />
              {workOrder.caseNumber}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <LifeBuoy className="size-4" />
              Sin caso
            </span>
          )}
          <ArrowRight className="size-4 text-muted-foreground/50" />
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <Wrench className="size-4" />
            {workOrder.workOrderNumber}
          </span>
        </div>

        {/* Aviso al cliente por WhatsApp (Nivel 1) — solo si hay caso de origen. */}
        {linkedCase ? (
          <WhatsAppNotifyPanel
            phonePresent={!!customerPhone}
            actions={whatsappActions}
          />
        ) : null}

        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {WORK_ORDER_STATUS_LABELS[workOrder.status]}
            </span>
            {canWrite ? (
              <div className="flex flex-wrap items-center gap-3">
                <WorkOrderStatusControl
                  tenantSlug={tenantSlug}
                  id={workOrder.id}
                  status={workOrder.status}
                />
                <WorkOrderTechnicianAssign
                  tenantSlug={tenantSlug}
                  workOrderId={workOrder.id}
                  woStart={workOrder.scheduledStart}
                  woEnd={workOrder.scheduledEnd}
                  activeAssignment={activeAssignment}
                  technicianOptions={technicianOptions}
                />
              </div>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail
              label="Prioridad"
              value={WORK_ORDER_PRIORITY_LABELS[workOrder.priority]}
            />
            <Detail
              label="Empresa"
              value={workOrder.companyName}
              href={workOrder.companyId ? `/app/${tenantSlug}/companies/${workOrder.companyId}` : undefined}
            />
            <Detail
              label="Activo"
              value={workOrder.assetName}
              href={workOrder.assetId ? `/app/${tenantSlug}/assets/${workOrder.assetId}` : undefined}
            />
            <Detail
              label="Caso origen"
              value={workOrder.caseNumber}
              href={workOrder.caseId ? `/app/${tenantSlug}/cases/${workOrder.caseId}` : undefined}
            />
            <Detail
              label="Cotización origen"
              value={workOrder.quoteNumber}
              href={workOrder.quoteId ? `/app/${tenantSlug}/quotes/${workOrder.quoteId}` : undefined}
            />
            <Detail label="Técnico asignado" value={technicianLabel} />
            <Detail label="Inicio programado" value={fmt(workOrder.scheduledStart)} />
            <Detail label="Fin programado" value={fmt(workOrder.scheduledEnd)} />
            <Detail label="Inicio real" value={fmt(workOrder.actualStart)} />
            <Detail label="Fin real" value={fmt(workOrder.actualEnd)} />
            <Detail
              label="Horas de trabajo"
              value={
                workOrder.laborHours != null
                  ? `${workOrder.laborHours} h`
                  : null
              }
            />
          </dl>
          {workOrder.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {workOrder.description}
            </p>
          ) : null}
          {workOrder.resolutionSummary ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Resumen técnico
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                {workOrder.resolutionSummary}
              </p>
            </div>
          ) : null}
        </div>

        {/* Eligibility suggestion (PR4) — read-only, never assigns */}
        <WorkOrderEligibilityPanel
          tenantSlug={tenantSlug}
          workOrderId={workOrder.id}
          hasWindow={Boolean(workOrder.scheduledStart && workOrder.scheduledEnd)}
          skills={skillCatalog}
          zones={zoneCatalog}
        />

        {canWrite || canInvoice ? (
          <WorkOrderBillingControls
            tenantSlug={tenantSlug}
            workOrderId={workOrder.id}
            status={workOrder.status}
            billable={workOrder.billable}
            billingApprovedAt={workOrder.billingApprovedAt}
            canWrite={canWrite}
            canApprove={canInvoice}
          />
        ) : null}

        {canReadActivities ? (
          <ActivityTimeline
            tenantSlug={tenantSlug}
            returnPath={returnPath}
            workOrderId={workOrderId}
            companyId={workOrder.companyId}
            activities={activities}
            filters={filters}
            canWrite={canWriteActivities}
          />
        ) : null}

        {lifecycle && lifecycle.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Línea de vida de la solicitud</h2>
            <div className="rounded-xl border bg-card p-5">
              <LifecycleTimeline milestones={lifecycle} />
            </div>
          </div>
        ) : null}

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
                        {new Date(ev.occurredAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
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
