import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { RevenueTimeline } from "@/components/billing/revenue-timeline"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getCustomerRevenueTimeline } from "@/modules/billing/composition"
import {
  getCompanyRecord,
  listCompanyActivityTimeline,
} from "@/modules/crm/composition"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Empresa" }

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

  const company = await getCompanyRecord(context.tenantId, companyId)
  if (!company) notFound()

  const canReadActivities = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.activitiesRead,
  )
  const canWriteActivities = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.activitiesWrite,
  )

  const canReadRevenue = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesRead,
  )

  const filters = parseFilters(sp)
  const returnPath = `/app/${tenantSlug}/companies/${companyId}`
  const [activities, revenueTimeline] = await Promise.all([
    canReadActivities
      ? listCompanyActivityTimeline(context.tenantId, companyId, filters)
      : Promise.resolve([]),
    canReadRevenue
      ? getCustomerRevenueTimeline(context.tenantId, companyId)
      : Promise.resolve(null),
  ])

  return (
    <>
      <PageHeader title={company.name} description="Company details and activity." />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <Link
          href={`/app/${tenantSlug}/companies`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Companies
        </Link>

        <div className="rounded-xl border bg-card p-5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              company.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {company.status === "active" ? "Active" : "Inactive"}
          </span>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Industry" value={company.industry} />
            <Detail label="Tax ID" value={company.taxId} />
            <Detail label="Website" value={company.website} />
            <Detail label="Phone" value={company.phone} />
            <Detail
              label="Location"
              value={
                [company.city, company.state, company.country]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
            <Detail label="Address" value={company.address} />
          </dl>
          {company.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {company.notes}
            </p>
          ) : null}
        </div>

        {revenueTimeline ? (
          <RevenueTimeline tenantSlug={tenantSlug} timeline={revenueTimeline} />
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
