import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { ServiceCatalogManager } from "@/components/service/service-catalog-manager"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { listTenantIssueTypes, listTenantSkills } from "@/modules/service/composition"

export const metadata: Metadata = { title: "Catálogo de servicios" }

export default async function ServiceCatalogPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.techniciansRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.techniciansWrite,
  )
  const [skills, issueTypes] = await Promise.all([
    listTenantSkills(context.tenantId),
    listTenantIssueTypes(context.tenantId),
  ])

  return (
    <>
      <PageHeader
        title="Catálogo de servicios"
        description="Las categorías que atiendes y los tipos de daño que tus clientes pueden reportar."
      />
      <div className="px-5 py-6 sm:px-8">
        <ServiceCatalogManager
          tenantSlug={tenantSlug}
          skills={skills}
          issueTypes={issueTypes}
          canWrite={canWrite}
        />
      </div>
    </>
  )
}
