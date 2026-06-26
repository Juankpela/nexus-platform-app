import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Brain } from "lucide-react"

import { OperationalCenter } from "@/components/dispatch/operational-center"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  FOUNDATION_PERMISSIONS,
  NLABS_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { isTechnicianOnly } from "@/modules/request-context/domain/role"

export const metadata: Metadata = { title: "Centro Operacional" }

export default async function MissionControlPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  // El técnico puro no vive en el back-office: su casa es el móvil de campo.
  if (isTechnicianOnly(context.roleKeys)) redirect(`/app/${tenantSlug}/worker`)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.dashboardRead)

  // Enlace público de reportes: hace visible la entrada del Golden Path (reporte).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl = appUrl ? `${appUrl}/r/${tenantSlug}` : null

  // Paneles por área (CRM / Service / Field Service): subdashboards ya existentes,
  // enlazados desde el Centro Operacional y filtrados por permiso de lectura.
  const dashboardLinks = [
    hasPermission(context.effectivePermissions, CRM_PERMISSIONS.opportunitiesRead)
      ? { href: `/app/${tenantSlug}/dashboard/crm`, label: "Panel CRM" }
      : null,
    hasPermission(context.effectivePermissions, SERVICE_PERMISSIONS.casesRead)
      ? { href: `/app/${tenantSlug}/dashboard/service`, label: "Panel Service" }
      : null,
    hasPermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)
      ? { href: `/app/${tenantSlug}/dashboard/field-service`, label: "Panel Field Service" }
      : null,
  ].filter((x): x is { href: string; label: string } => x !== null)

  const canNlabs = hasPermission(context.effectivePermissions, NLABS_PERMISSIONS.read)

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

      {dashboardLinks.length > 0 || canNlabs ? (
        <div className="flex flex-wrap items-center gap-2">
          {canNlabs ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/app/${tenantSlug}/nlabs`}>
                <Brain className="size-4" />
                N-LABS · Inteligencia
              </Link>
            </Button>
          ) : null}
          {dashboardLinks.length > 0 ? (
            <span className="text-xs font-medium text-muted-foreground">
              Paneles por área:
            </span>
          ) : null}
          {dashboardLinks.map((d) => (
            <Button key={d.href} asChild size="sm" variant="outline">
              <Link href={d.href}>{d.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}

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
