"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  archiveZoneRecord,
  assignTechnicianZoneRecord,
  createZoneRecord,
  removeTechnicianZoneRecord,
} from "@/modules/service/composition"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "No tienes permiso para gestionar zonas."
  }
  if (error instanceof ApplicationError && error.code === "ZONE_NAME_TAKEN") {
    return "Ya existe una zona con ese nombre."
  }
  return "No se pudo completar la acción."
}

function revalidateTechnician(tenantSlug: string, technicianId?: string) {
  revalidatePath(`/app/${tenantSlug}/technicians`)
  if (technicianId) revalidatePath(`/app/${tenantSlug}/technicians/${technicianId}`)
}

export async function createZoneAction(
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
    await createZoneRecord({
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

export async function archiveZoneAction(
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
    await archiveZoneRecord({
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

export async function assignTechnicianZoneAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const zoneId = idSchema.safeParse(field(formData, "zone_id"))
  if (!tenantSlug || !technicianId.success || !zoneId.success) {
    return fail("Solicitud inválida.")
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await assignTechnicianZoneRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      zoneId: zoneId.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateTechnician(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}

export async function removeTechnicianZoneAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const zoneId = idSchema.safeParse(field(formData, "zone_id"))
  if (!tenantSlug || !technicianId.success || !zoneId.success) {
    return fail("Solicitud inválida.")
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await removeTechnicianZoneRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      zoneId: zoneId.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateTechnician(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}
