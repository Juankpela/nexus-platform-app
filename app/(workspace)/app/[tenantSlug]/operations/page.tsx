import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { SupervisionStation } from "@/components/operations/supervision-station"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { getSupervisionStation } from "@/modules/supervision/composition"

export const metadata: Metadata = { title: "Supervisión operacional" }

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  // v1 reutiliza un permiso de lectura existente (sin tocar RBAC/seed); un permiso
  // dedicado sería un PR aparte.
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  // Read Model determinístico: interpreta el estado operacional real y lo adapta a
  // los contratos congelados. Solo cambia el ORIGEN de los datos; la UI no se toca.
  const { items, health, belowThresholdCount } = await getSupervisionStation(
    context.tenantId,
    new Date(),
  )

  return (
    <>
      <PageHeader
        title="Supervisión operacional"
        description="Protege los compromisos en riesgo antes de su punto de no retorno."
      />
      <SupervisionStation items={items} health={health} belowThresholdCount={belowThresholdCount} />
    </>
  )
}
