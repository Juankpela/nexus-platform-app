"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  archiveSkillRecord,
  assignTechnicianSkillRecord,
  createSkillRecord,
  removeTechnicianSkillRecord,
} from "@/modules/service/composition"
import { SKILL_LEVELS } from "@/modules/service/domain/skill"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const levelSchema = z.enum(SKILL_LEVELS)

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "No tienes permiso para gestionar habilidades."
  }
  if (error instanceof ApplicationError && error.code === "SKILL_NAME_TAKEN") {
    return "Ya existe una habilidad con ese nombre."
  }
  return "No se pudo completar la acción."
}

function revalidateTechnician(tenantSlug: string, technicianId?: string) {
  revalidatePath(`/app/${tenantSlug}/technicians`)
  if (technicianId) revalidatePath(`/app/${tenantSlug}/technicians/${technicianId}`)
}

export async function createSkillAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const name = field(formData, "name")
  const technicianId = field(formData, "technician_id")
  if (!tenantSlug || !name) return fail("El nombre es obligatorio.")
  if (name.length > 80) return fail("Nombre demasiado largo.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await createSkillRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: { name },
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateTechnician(tenantSlug, technicianId ?? undefined)
  return { error: null, ok: true }
}

export async function archiveSkillAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const technicianId = field(formData, "technician_id")
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await archiveSkillRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      archivedAt: new Date().toISOString(),
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateTechnician(tenantSlug, technicianId ?? undefined)
  return { error: null, ok: true }
}

export async function assignTechnicianSkillAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const skillId = idSchema.safeParse(field(formData, "skill_id"))
  const level = levelSchema.safeParse(field(formData, "level"))
  if (!tenantSlug || !technicianId.success || !skillId.success) {
    return fail("Solicitud inválida.")
  }
  if (!level.success) return fail("Selecciona un nivel.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await assignTechnicianSkillRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      data: { skillId: skillId.data, level: level.data },
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateTechnician(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}

export async function removeTechnicianSkillAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const skillId = idSchema.safeParse(field(formData, "skill_id"))
  if (!tenantSlug || !technicianId.success || !skillId.success) {
    return fail("Solicitud inválida.")
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await removeTechnicianSkillRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      skillId: skillId.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateTechnician(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}
