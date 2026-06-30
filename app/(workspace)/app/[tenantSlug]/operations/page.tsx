import type { Metadata } from "next"

import { OperationalStation } from "@/components/operations/operational-station"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Supervisión operacional" }

/** Placeholder de región para la carcasa (PR-0). Cada bloque real lo reemplaza en su PR. */
function RegionPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-dashed bg-muted/10 px-6 py-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground ${className}`}
    >
      {label}
    </div>
  )
}

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

  return (
    <>
      <PageHeader
        title="Supervisión operacional"
        description="Protege los compromisos en riesgo antes de su punto de no retorno."
      />
      <OperationalStation
        health={<RegionPlaceholder label="salud operacional" />}
        hero={<RegionPlaceholder label="la decisión de ahora · Hero" className="min-h-[20rem]" />}
        queue={<RegionPlaceholder label="cola de supervisión" className="min-h-[20rem]" />}
      />
    </>
  )
}
