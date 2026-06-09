import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import type { Technician, TechnicianInput } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

export type UpdateTechnicianDeps = {
  technicians: TechnicianRepository
  audit: AuditRepository
}

export type UpdateTechnicianInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: TechnicianInput
}

export async function updateTechnician(
  { technicians, audit }: UpdateTechnicianDeps,
  input: UpdateTechnicianInput,
): Promise<Technician> {
  const existing = await technicians.getById(input.tenantId, input.id)
  if (!existing || existing.deletedAt) {
    throw new ApplicationError("Technician not found.", "TECHNICIAN_NOT_FOUND")
  }

  // Uniqueness rules, excluding the record being edited.
  const emailClash = await technicians.findByEmail(input.tenantId, input.data.email)
  if (emailClash && emailClash.id !== input.id) {
    throw new ApplicationError(
      "A technician with this email already exists.",
      "TECHNICIAN_EMAIL_TAKEN",
    )
  }
  if (input.data.employeeId) {
    const idClash = await technicians.findByEmployeeId(
      input.tenantId,
      input.data.employeeId,
    )
    if (idClash && idClash.id !== input.id) {
      throw new ApplicationError(
        "A technician with this employee ID already exists.",
        "TECHNICIAN_EMPLOYEE_ID_TAKEN",
      )
    }
  }

  const record = await technicians.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "service.technician.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: record.id,
    action: "technician.updated",
    metadata: { email: record.email, status: record.status },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
