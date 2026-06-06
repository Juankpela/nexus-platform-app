import type { Metadata } from "next"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import {
  FOUNDATION_PERMISSIONS,
} from "@/modules/authorization/domain/permission"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.dashboardRead,
  )

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A clear view of your workspace."
      />
      <EmptyState
        title="Your dashboard is ready"
        description="Operational metrics and module insights will appear here as capabilities are enabled."
      />
    </>
  )
}
