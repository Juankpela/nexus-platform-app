import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { OpportunityFormDialog } from "@/components/crm/opportunity-form-dialog"
import { OpportunityOwnerAssign } from "@/components/crm/opportunity-owner-assign"
import { OpportunityStatusControl } from "@/components/crm/opportunity-status-control"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getOpportunityRecord,
  listCompanyOptions,
  listContactOptions,
  listOpportunityActivityTimeline,
} from "@/modules/crm/composition"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { ContactOption } from "@/modules/crm/domain/contact"
import {
  OPPORTUNITY_BUSINESS_TYPE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/modules/crm/domain/opportunity"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { listCachedTenantMembers } from "@/modules/tenancy/composition"

export const metadata: Metadata = { title: "Oportunidad" }

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

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; opportunityId: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { tenantSlug, opportunityId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.opportunitiesRead,
  )

  const opportunity = await getOpportunityRecord(context.tenantId, opportunityId)
  if (!opportunity) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.opportunitiesWrite,
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
  const returnPath = `/app/${tenantSlug}/opportunities/${opportunityId}`

  const [members, companyOptions, contactOptions, activities] =
    await Promise.all([
      listCachedTenantMembers(context.tenantId),
      canWrite
        ? listCompanyOptions(context.tenantId)
        : Promise.resolve([] as CompanyOption[]),
      canWrite
        ? listContactOptions(context.tenantId)
        : Promise.resolve([] as ContactOption[]),
      canReadActivities
        ? listOpportunityActivityTimeline(
            context.tenantId,
            opportunityId,
            filters,
          )
        : Promise.resolve([]),
    ])

  const ownerOptions = members.map((member) => ({
    id: member.userId,
    label: member.fullName ?? member.email ?? member.userId,
  }))
  const ownerLabel = opportunity.ownerId
    ? (ownerOptions.find((o) => o.id === opportunity.ownerId)?.label ??
      "Assigned")
    : "Unassigned"

  return (
    <>
      <PageHeader
        title={opportunity.name}
        description="Opportunity details, status, and activity."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${tenantSlug}/opportunities`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Oportunidades
          </Link>
          {canWrite ? (
            <OpportunityFormDialog
              tenantSlug={tenantSlug}
              companyOptions={companyOptions}
              contactOptions={contactOptions}
              ownerOptions={ownerOptions}
              opportunity={opportunity}
              trigger={
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              }
            />
          ) : null}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            </span>
            {canWrite ? (
              <div className="flex flex-wrap items-center gap-3">
                <OpportunityStatusControl
                  tenantSlug={tenantSlug}
                  id={opportunity.id}
                  status={opportunity.status}
                />
                <OpportunityOwnerAssign
                  tenantSlug={tenantSlug}
                  id={opportunity.id}
                  ownerId={opportunity.ownerId}
                  ownerOptions={ownerOptions}
                />
              </div>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail
              label="Empresa"
              value={opportunity.companyName}
              href={opportunity.companyId ? `/app/${tenantSlug}/companies/${opportunity.companyId}` : undefined}
            />
            <Detail
              label="Contacto"
              value={opportunity.contactName}
              href={opportunity.contactId ? `/app/${tenantSlug}/contacts/${opportunity.contactId}` : undefined}
            />
            <Detail
              label="Business type"
              value={OPPORTUNITY_BUSINESS_TYPE_LABELS[opportunity.businessType]}
            />
            <Detail
              label="Estimated value"
              value={
                opportunity.estimatedValue != null
                  ? opportunity.estimatedValue.toLocaleString()
                  : null
              }
            />
            <Detail
              label="Probability"
              value={`${opportunity.probability}%`}
            />
            <Detail
              label="Expected close"
              value={opportunity.expectedCloseDate}
            />
            <Detail label="Owner" value={ownerLabel} />
          </dl>
          {opportunity.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {opportunity.description}
            </p>
          ) : null}
        </div>

        {canReadActivities ? (
          <ActivityTimeline
            tenantSlug={tenantSlug}
            returnPath={returnPath}
            opportunityId={opportunityId}
            companyId={opportunity.companyId}
            contactId={opportunity.contactId}
            activities={activities}
            filters={filters}
            canWrite={canWriteActivities}
          />
        ) : null}
      </div>
    </>
  )
}
