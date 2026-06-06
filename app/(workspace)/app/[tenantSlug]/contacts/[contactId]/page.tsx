import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityTimeline } from "@/components/crm/activity-timeline"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getContactRecord,
  listContactActivityTimeline,
} from "@/modules/crm/composition"
import {
  ACTIVITY_TYPES,
  type ActivityFilters,
  type ActivityType,
} from "@/modules/crm/domain/activity"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Contact" }

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

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; contactId: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { tenantSlug, contactId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.contactsRead)

  const contact = await getContactRecord(context.tenantId, contactId)
  if (!contact) notFound()

  const canReadActivities = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.activitiesRead,
  )
  const canWriteActivities = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.activitiesWrite,
  )

  const filters = parseFilters(sp)
  const returnPath = `/app/${tenantSlug}/contacts/${contactId}`
  const activities = canReadActivities
    ? await listContactActivityTimeline(context.tenantId, contactId, filters)
    : []

  const fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ")

  return (
    <>
      <PageHeader title={fullName} description="Contact details and activity." />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <Link
          href={`/app/${tenantSlug}/contacts`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Contacts
        </Link>

        <div className="rounded-xl border bg-card p-5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              contact.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {contact.status === "active" ? "Active" : "Inactive"}
          </span>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Company" value={contact.companyName} />
            <Detail label="Title" value={contact.title} />
            <Detail label="Department" value={contact.department} />
            <Detail label="Email" value={contact.email} />
            <Detail label="Phone" value={contact.phone} />
            <Detail label="Mobile" value={contact.mobile} />
          </dl>
          {contact.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {contact.notes}
            </p>
          ) : null}
        </div>

        {canReadActivities ? (
          <ActivityTimeline
            tenantSlug={tenantSlug}
            returnPath={returnPath}
            contactId={contactId}
            companyId={contact.companyId}
            activities={activities}
            filters={filters}
            canWrite={canWriteActivities}
          />
        ) : null}
      </div>
    </>
  )
}
