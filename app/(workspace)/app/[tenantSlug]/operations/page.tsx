import type { Metadata } from "next"

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
      {/* Título ligero: orientación mínima. Sin descripción de filosofía del producto
          (limpieza 2026-06-30): nada que explique el producto compite con el Hero. */}
      <div className="px-5 pb-5 pt-7 sm:px-8">
        <h1 className="text-[1.7rem] font-bold leading-tight tracking-[-0.02em] text-foreground">
          Supervisión operacional
        </h1>
      </div>
      <SupervisionStation items={items} health={health} belowThresholdCount={belowThresholdCount} />
    </>
  )
}
