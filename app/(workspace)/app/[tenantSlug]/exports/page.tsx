import type { Metadata } from "next"

import { ExportDownloadButton } from "@/components/integrations/export-download-button"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Pagination } from "@/components/crm/pagination"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { formatDateTime } from "@/lib/format/datetime"
import { listMyExportJobs } from "@/modules/integrations/composition"
import { EXPORT_JOB_STATUS_LABELS } from "@/modules/integrations/domain/export-job"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Exportaciones" }

const PAGE_SIZE = 20

const statusStyle: Record<string, string> = {
  queued: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  processing: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
}

export default async function ExportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.dashboardRead)

  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const result = await listMyExportJobs(context.tenantId, context.userId, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })
  const base = `/app/${tenantSlug}/exports`

  return (
    <>
      <PageHeader title="Exportaciones" description="Tus exportaciones y descargas." />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        {result.items.length === 0 ? (
          <EmptyState title="Sin exportaciones" description="Las exportaciones en cola aparecerán aquí." />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Objeto</th>
                  <th className="px-4 py-3 font-medium">Formato</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Filas</th>
                  <th className="px-4 py-3 font-medium">Solicitada</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 capitalize">{job.object}</td>
                    <td className="px-4 py-3 uppercase text-muted-foreground">{job.format}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[job.status]}`}>
                        {EXPORT_JOB_STATUS_LABELS[job.status]}
                      </span>
                      {job.status === "failed" && job.lastError ? (
                        <span className="ml-2 text-xs text-muted-foreground">{job.lastError}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{job.rowCount ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(job.createdAt, { year: undefined })}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {job.status === "completed" ? (
                          <ExportDownloadButton tenantSlug={tenantSlug} jobId={job.id} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination basePath={base} search={null} page={page} pageSize={PAGE_SIZE} total={result.total} />
      </div>
    </>
  )
}
