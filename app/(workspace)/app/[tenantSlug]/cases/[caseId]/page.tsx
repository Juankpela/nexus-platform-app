import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { PageHeader } from "@/components/layout/page-header"
import { CaseFormDialog } from "@/components/service/case-form-dialog"
import { CaseOwnerAssign } from "@/components/service/case-owner-assign"
import { CaseStatusControl } from "@/components/service/case-status-control"
import { SlaBadge } from "@/components/service/sla-badge"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  listCaseActivityTimeline,
  listCompanyOptions,
  listContactOptions,
  listSubjectAuditEvents,
} from "@/modules/crm/composition"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { ContactOption } from "@/modules/crm/domain/contact"
import { getCaseRecord } from "@/modules/service/composition"
import {
  CASE_ORIGIN_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
} from "@/modules/service/domain/case"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { listCachedTenantMembers } from "@/modules/tenancy/composition"

export const metadata: Metadata = { title: "Case" }

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

function fmtDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleString() : null
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  )
}

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; caseId: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { tenantSlug, caseId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.casesRead)

  const serviceCase = await getCaseRecord(context.tenantId, caseId)
  if (!serviceCase) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.casesWrite,
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
  const returnPath = `/app/${tenantSlug}/cases/${caseId}`

  const [members, companyOptions, contactOptions, activities, auditEvents] =
    await Promise.all([
      listCachedTenantMembers(context.tenantId),
      canWrite
        ? listCompanyOptions(context.tenantId)
        : Promise.resolve([] as CompanyOption[]),
      canWrite
        ? listContactOptions(context.tenantId)
        : Promise.resolve([] as ContactOption[]),
      canReadActivities
        ? listCaseActivityTimeline(context.tenantId, caseId, filters)
        : Promise.resolve([]),
      canReadAudit
        ? listSubjectAuditEvents(context.tenantId, caseId, 20)
        : Promise.resolve([]),
    ])

  const ownerOptions = members.map((m) => ({
    id: m.userId,
    label: m.fullName ?? m.email ?? m.userId,
  }))
  const ownerLabel = serviceCase.ownerId
    ? (ownerOptions.find((o) => o.id === serviceCase.ownerId)?.label ??
      "Asignado")
    : "Sin asignar"

  return (
    <>
      <PageHeader
        title={`${serviceCase.caseNumber} · ${serviceCase.subject}`}
        description="Detalle del caso, SLA, actividad y auditoría."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${tenantSlug}/cases`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Casos
          </Link>
          {canWrite ? (
            <CaseFormDialog
              tenantSlug={tenantSlug}
              companyOptions={companyOptions}
              contactOptions={contactOptions}
              ownerOptions={ownerOptions}
              serviceCase={serviceCase}
              trigger={
                <Button variant="outline" size="sm">
                  Editar
                </Button>
              }
            />
          ) : null}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                {CASE_STATUS_LABELS[serviceCase.status]}
              </span>
              <SlaBadge
                slaDueAt={serviceCase.slaDueAt}
                priority={serviceCase.priority}
                resolvedAt={serviceCase.resolvedAt}
                closedAt={serviceCase.closedAt}
              />
            </div>
            {canWrite ? (
              <div className="flex flex-wrap items-center gap-3">
                <CaseStatusControl
                  tenantSlug={tenantSlug}
                  id={serviceCase.id}
                  status={serviceCase.status}
                />
                <CaseOwnerAssign
                  tenantSlug={tenantSlug}
                  id={serviceCase.id}
                  ownerId={serviceCase.ownerId}
                  ownerOptions={ownerOptions}
                />
              </div>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Empresa" value={serviceCase.companyName} />
            <Detail label="Contacto" value={serviceCase.contactName} />
            <Detail
              label="Prioridad"
              value={CASE_PRIORITY_LABELS[serviceCase.priority]}
            />
            <Detail label="Origen" value={CASE_ORIGIN_LABELS[serviceCase.origin]} />
            <Detail label="Responsable" value={ownerLabel} />
            <Detail label="SLA límite" value={fmtDate(serviceCase.slaDueAt)} />
            <Detail label="Creado" value={fmtDate(serviceCase.createdAt)} />
            <Detail label="Resuelto" value={fmtDate(serviceCase.resolvedAt)} />
            <Detail label="Cerrado" value={fmtDate(serviceCase.closedAt)} />
          </dl>
          {serviceCase.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {serviceCase.description}
            </p>
          ) : null}
        </div>

        {canReadActivities ? (
          <ActivityTimeline
            tenantSlug={tenantSlug}
            returnPath={returnPath}
            caseId={caseId}
            companyId={serviceCase.companyId}
            contactId={serviceCase.contactId}
            activities={activities}
            filters={filters}
            canWrite={canWriteActivities}
          />
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
                        {new Date(ev.occurredAt).toLocaleString()}
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
