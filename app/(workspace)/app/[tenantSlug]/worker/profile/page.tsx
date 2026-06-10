import type { Metadata } from "next"

import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { resolveCurrentTechnician } from "@/modules/field-execution/composition"
import { getTechnicianRecord } from "@/modules/service/composition"
import {
  TECHNICIAN_STATUS_LABELS,
  technicianFullName,
} from "@/modules/service/domain/technician"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Perfil" }

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? "—"}</span>
    </div>
  )
}

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.fieldRead)

  const [user, technician] = await Promise.all([
    getCachedCurrentUser(),
    resolveCurrentTechnician(context.tenantId, context.userId),
  ])

  const record = technician
    ? await getTechnicianRecord(context.tenantId, technician.id)
    : null

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Perfil</h1>

      <div className="rounded-xl border bg-card p-4">
        {record ? (
          <>
            <Row label="Nombre" value={technicianFullName(record)} />
            <Row label="Email" value={record.email} />
            <Row label="ID empleado" value={record.employeeId} />
            <Row label="Estado" value={TECHNICIAN_STATUS_LABELS[record.status]} />
          </>
        ) : (
          <Row label="Usuario" value={user?.email ?? null} />
        )}
        <Row label="Organización" value={context.tenant.name} />
      </div>

      {!record ? (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Tu usuario no está vinculado a un técnico.
        </p>
      ) : null}
    </div>
  )
}
