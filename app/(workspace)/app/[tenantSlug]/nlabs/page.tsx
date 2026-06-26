import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { IntelligenceCenter } from "@/components/nlabs/intelligence-center"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { NLABS_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { isTechnicianOnly } from "@/modules/request-context/domain/role"

export const metadata: Metadata = { title: "N-LABS · Inteligencia" }

export default async function NLabsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  if (isTechnicianOnly(context.roleKeys)) redirect(`/app/${tenantSlug}/worker`)
  requirePermission(context.effectivePermissions, NLABS_PERMISSIONS.read)

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      <header>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            N-LABS
          </h1>
          <span className="inline-flex items-center rounded-full border border-nexus-blue/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nexus-blue">
            Beta
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Inteligencia operacional · {context.tenant.name} · Convierte tu
          operación en decisiones, no en reportes.
        </p>
      </header>

      <IntelligenceCenter
        tenantSlug={tenantSlug}
        tenantId={context.tenantId}
        permissions={context.effectivePermissions}
      />
    </div>
  )
}
