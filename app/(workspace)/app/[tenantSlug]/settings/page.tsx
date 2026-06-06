import type { Metadata } from "next"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.settingsRead,
  )

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your tenant workspace."
      />
      <EmptyState
        title="Workspace settings"
        description="Tenant configuration will be added here without coupling settings to future business modules."
      />
    </>
  )
}
