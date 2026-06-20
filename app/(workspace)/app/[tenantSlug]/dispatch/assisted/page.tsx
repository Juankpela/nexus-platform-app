import type { Metadata } from "next"

import { OperationalCenter } from "@/components/dispatch/operational-center"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Coordinación" }

export default async function CoordinacionPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  return (
    <>
      <PageHeader
        title="Coordinación Operacional"
        description="¿Qué está coordinando Nexus ahora mismo?"
      />
      <div className="px-5 pb-10 sm:px-8">
        <OperationalCenter
          tenantSlug={tenantSlug}
          tenantId={context.tenantId}
          permissions={context.effectivePermissions}
        />
      </div>
    </>
  )
}
