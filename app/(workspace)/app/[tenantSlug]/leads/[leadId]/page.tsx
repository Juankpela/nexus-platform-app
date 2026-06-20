import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getLeadRecord } from "@/modules/crm/composition"
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  type LeadSource,
} from "@/modules/crm/domain/lead"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { LeadDetailActions } from "./_components/lead-detail-actions"

export const metadata: Metadata = { title: "Prospecto" }

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

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; leadId: string }>
}) {
  const { tenantSlug, leadId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.leadsRead)

  const lead = await getLeadRecord(context.tenantId, leadId)
  if (!lead) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.leadsWrite,
  )

  return (
    <>
      <PageHeader title={lead.name} description="Lead — captura y calificación." />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <Link
          href={`/app/${tenantSlug}/leads`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Leads
        </Link>

        <div className="rounded-xl border bg-card p-5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[lead.status]}`}
          >
            {LEAD_STATUS_LABELS[lead.status]}
          </span>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Empresa" value={lead.company} />
            <Detail label="Email" value={lead.email} />
            <Detail label="Teléfono" value={lead.phone} />
            <Detail
              label="Fuente"
              value={
                lead.source
                  ? (LEAD_SOURCE_LABELS[lead.source as LeadSource] ?? lead.source)
                  : null
              }
            />
          </dl>
          {lead.notes && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {lead.notes}
            </p>
          )}
        </div>

        <LeadDetailActions tenantSlug={tenantSlug} lead={lead} canWrite={canWrite} />
      </div>
    </>
  )
}
