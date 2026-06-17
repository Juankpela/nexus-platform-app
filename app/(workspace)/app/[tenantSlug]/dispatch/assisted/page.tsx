import { Inbox } from "lucide-react"
import type { Metadata } from "next"

import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { listAssistedDispatchProposals } from "@/modules/scheduling/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Despacho Asistido" }

export default async function AssistedDispatchPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const proposals = await listAssistedDispatchProposals(context.tenantId)

  return (
    <>
      <PageHeader
        title="Despacho Asistido"
        description="Propuestas generadas por Nexus. Apruébalas en un clic; el sistema crea la orden, asigna y notifica al técnico."
      />
      <div className="space-y-3 px-5 pb-10 sm:px-8">
        {proposals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card py-12 text-center">
            <Inbox className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay propuestas pendientes. Los reportes que el motor pueda despachar con confianza aparecerán aquí.
            </p>
          </div>
        ) : (
          proposals.map((p) => (
            <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
          ))
        )}
      </div>
    </>
  )
}
