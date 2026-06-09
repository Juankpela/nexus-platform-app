import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import type { UUID } from "@/types/shared"

export type DeactivateTechnicianDeps = {
  technicians: TechnicianRepository
  audit: AuditRepository
}

export type DeactivateTechnicianInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
}

/**
 * Soft delete only — never hard-delete. Preserves history for any work orders
 * the technician was assigned to. Sets deleted_at; the repository also flips
 * status to 'inactive'.
 */
export async function deactivateTechnician(
  { technicians, audit }: DeactivateTechnicianDeps,
  input: DeactivateTechnicianInput,
): Promise<void> {
  const existing = await technicians.getById(input.tenantId, input.id)
  if (!existing || existing.deletedAt) {
    throw new ApplicationError("Technician not found.", "TECHNICIAN_NOT_FOUND")
  }

  await technicians.softDelete(
    input.tenantId,
    input.id,
    new Date().toISOString(),
  )

  await audit.append({
    eventType: "service.technician.deactivated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: input.id,
    action: "technician.deactivated",
    metadata: { email: existing.email },
    requestId: input.requestId,
    source: "web",
  })
}
