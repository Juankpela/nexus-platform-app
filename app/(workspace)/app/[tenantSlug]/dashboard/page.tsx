import type { Metadata } from "next"

import { OperationalCenter } from "@/components/dispatch/operational-center"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Centro Operacional" }

export default async function MissionControlPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.dashboardRead)

  // Enlace público de reportes: hace visible la entrada del Golden Path (reporte).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl = appUrl ? `${appUrl}/r/${tenantSlug}` : null

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Centro de Monitoreo Operacional
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Operación en vivo
          </span>
          · {context.tenant.name} · ¿Qué necesita tu atención ahora?
        </p>
      </header>

      <OperationalCenter
        tenantSlug={tenantSlug}
        tenantId={context.tenantId}
        permissions={context.effectivePermissions}
      />

      {/* Herramienta de activación (no es "atención"): al pie. */}
      {reportUrl ? (
        <StartReceivingCard url={reportUrl} tenantName={context.tenant.name} />
      ) : null}
    </div>
  )
}
