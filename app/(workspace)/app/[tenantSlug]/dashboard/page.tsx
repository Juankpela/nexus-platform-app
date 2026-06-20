import type { Metadata } from "next"

import { OperationalCenter } from "@/components/dispatch/operational-center"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { greetingFor } from "@/modules/platform/presentation/mission-control"
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

  const user = await getCachedCurrentUser()

  // Enlace público de reportes: hace visible la entrada del Golden Path (reporte).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl = appUrl ? `${appUrl}/r/${tenantSlug}` : null

  const name = (user?.email?.split("@")[0] ?? "").replace(/[._-]/g, " ")
  const greeting = greetingFor(new Date().getUTCHours())

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿Qué necesita tu atención ahora?
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
