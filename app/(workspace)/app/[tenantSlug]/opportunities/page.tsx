import { Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { OpportunityFormDialog } from "@/components/crm/opportunity-form-dialog"
import { Pagination } from "@/components/crm/pagination"
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
  listTenantOpportunities,
} from "@/modules/crm/composition"
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { ContactOption } from "@/modules/crm/domain/contact"
import {
  OPPORTUNITY_BUSINESS_TYPE_LABELS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { listCachedTenantMembers } from "@/modules/tenancy/composition"

export const metadata: Metadata = { title: "Opportunities" }

const PAGE_SIZE = 10

const statusStyles: Record<OpportunityStatus, string> = {
  new: "bg-muted text-muted-foreground",
  discovery: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  proposal: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  negotiation: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  won: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lost: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function parseStatus(value?: string): OpportunityStatus | null {
  return (OPPORTUNITY_STATUSES as string[]).includes(value ?? "")
    ? (value as OpportunityStatus)
    : null
}

export default async function OpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.opportunitiesRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.opportunitiesWrite,
  )

  const search = sp.search?.trim() ? sp.search.trim() : null
  const status = parseStatus(sp.status)
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/opportunities`

  const [result, companyOptions, contactOptions, members] = await Promise.all([
    listTenantOpportunities(context.tenantId, { search, status }, page, PAGE_SIZE),
    canWrite
      ? listCompanyOptions(context.tenantId)
      : Promise.resolve([] as CompanyOption[]),
    canWrite
      ? listContactOptions(context.tenantId)
      : Promise.resolve([] as ContactOption[]),
    canWrite ? listCachedTenantMembers(context.tenantId) : Promise.resolve([]),
  ])

  const ownerOptions = members.map((member) => ({
    id: member.userId,
    label: member.fullName ?? member.email ?? member.userId,
  }))

  const selectClass =
    "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Track and progress your sales pipeline."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form action={basePath} className="flex items-center gap-2">
            <Input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search opportunities..."
              className="w-56"
            />
            <select name="status" defaultValue={status ?? ""} className={selectClass}>
              <option value="">All status</option>
              {OPPORTUNITY_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {OPPORTUNITY_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">
              Filter
            </Button>
          </form>
          {canWrite ? (
            <OpportunityFormDialog
              tenantSlug={tenantSlug}
              companyOptions={companyOptions}
              contactOptions={contactOptions}
              ownerOptions={ownerOptions}
              trigger={
                <Button>
                  <Plus />
                  New opportunity
                </Button>
              }
            />
          ) : null}
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="No opportunities"
            description={
              search || status
                ? "No opportunities match your filters."
                : "Create your first opportunity to start your pipeline."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Opportunity</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((opportunity) => (
                  <tr key={opportunity.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`${basePath}/${opportunity.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {opportunity.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {opportunity.contactName ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {opportunity.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {OPPORTUNITY_BUSINESS_TYPE_LABELS[opportunity.businessType]}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {opportunity.estimatedValue != null
                        ? opportunity.estimatedValue.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[opportunity.status]}`}
                      >
                        {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath={basePath}
          search={search}
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          extraParams={{ status }}
        />
      </div>
    </>
  )
}
