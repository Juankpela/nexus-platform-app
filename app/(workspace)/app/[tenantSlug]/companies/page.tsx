import { Plus, Upload } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { CompanyCsvImport } from "@/components/crm/company-csv-import"
import { CompanyFormDialog } from "@/components/crm/company-form-dialog"
import { CrmStatusToggle } from "@/components/crm/crm-status-toggle"
import { Pagination } from "@/components/crm/pagination"
import { ExportButton } from "@/components/integrations/export-button"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantCompanies } from "@/modules/crm/composition"
import type { CrmStatus } from "@/modules/crm/domain/company"
import { setCompanyStatusAction } from "@/modules/crm/presentation/company-actions"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Companies" }

const PAGE_SIZE = 10

const statusStyles: Record<CrmStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
}

export default async function CompaniesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.companiesRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.companiesWrite,
  )

  const search = sp.search?.trim() ? sp.search.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/companies`

  const result = await listTenantCompanies(context.tenantId, {
    search,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <>
      <PageHeader
        title="Companies"
        description="Manage the companies in your workspace."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <form action={basePath} className="w-full max-w-xs">
            <Input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search companies..."
            />
          </form>
          <div className="flex items-center gap-2">
            <ExportButton tenantSlug={tenantSlug} object="accounts" filters={{ search }} />
            {canWrite ? (
              <>
                <CompanyCsvImport
                  tenantSlug={tenantSlug}
                  trigger={
                    <Button variant="outline">
                      <Upload />
                      Importar empresas
                    </Button>
                  }
                />
                <CompanyFormDialog
                  tenantSlug={tenantSlug}
                  trigger={
                    <Button>
                      <Plus />
                      New company
                    </Button>
                  }
                />
              </>
            ) : null}
          </div>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="No companies"
            description={
              search
                ? "No companies match your search."
                : "Create your first company to get started."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Industry</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {canWrite ? (
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((company) => (
                  <tr key={company.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/app/${tenantSlug}/companies/${company.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {company.name}
                      </Link>
                      {company.taxId ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {company.taxId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {company.industry ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {[company.city, company.country].filter(Boolean).join(", ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {company.phone ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[company.status]}`}
                      >
                        {company.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <CompanyFormDialog
                            tenantSlug={tenantSlug}
                            company={company}
                            trigger={
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            }
                          />
                          <CrmStatusToggle
                            tenantSlug={tenantSlug}
                            id={company.id}
                            status={company.status}
                            action={setCompanyStatusAction}
                          />
                        </div>
                      </td>
                    ) : null}
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
        />
      </div>
    </>
  )
}
