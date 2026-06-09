import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import type { Technician, TechnicianInput } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

export type CreateTechnicianDeps = {
  technicians: TechnicianRepository
  audit: AuditRepository
}

export type CreateTechnicianInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: TechnicianInput
}

export async function createTechnician(
  { technicians, audit }: CreateTechnicianDeps,
  input: CreateTechnicianInput,
): Promise<Technician> {
  // Rule: email unique per tenant (among active records).
  const emailClash = await technicians.findByEmail(input.tenantId, input.data.email)
  if (emailClash) {
    throw new ApplicationError(
      "A technician with this email already exists.",
      "TECHNICIAN_EMAIL_TAKEN",
    )
  }
  // Rule: employee_id unique per tenant (when provided).
  if (input.data.employeeId) {
    const idClash = await technicians.findByEmployeeId(
      input.tenantId,
      input.data.employeeId,
    )
    if (idClash) {
      throw new ApplicationError(
        "A technician with this employee ID already exists.",
        "TECHNICIAN_EMPLOYEE_ID_TAKEN",
      )
    }
  }

  const record = await technicians.create(input.tenantId, input.data)

  await audit.append({
    eventType: "service.technician.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: record.id,
    action: "technician.created",
    metadata: {
      email: record.email,
      employeeId: record.employeeId,
      status: record.status,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
