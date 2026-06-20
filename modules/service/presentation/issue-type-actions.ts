"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  createIssueTypeRecord,
  updateIssueTypeRecord,
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
    return "No tienes permiso para gestionar el catálogo."
  }
  if (error instanceof ApplicationError && error.code === "ISSUE_TYPE_NAME_TAKEN") {
    return "Ya existe un tipo de daño con ese nombre en esta categoría."
  }
  return "No se pudo completar la acción."
}

function revalidateServices(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/services`)
}

export async function createIssueTypeAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const skillId = idSchema.safeParse(field(formData, "skill_id"))
  const name = field(formData, "name")
  const description = field(formData, "description")
  if (!tenantSlug || !skillId.success) return fail("Solicitud inválida.")
  if (!name) return fail("El nombre del tipo de daño es obligatorio.")
  if (name.length > 120) return fail("Nombre demasiado largo.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await createIssueTypeRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      skillId: skillId.data,
      name: name.trim(),
      description: description?.trim() || null,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateServices(tenantSlug)
  return { error: null, ok: true }
}

export async function updateIssueTypeAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  const name = field(formData, "name")
  const description = field(formData, "description")
  if (name !== null && name.trim().length === 0) {
    return fail("El nombre no puede quedar vacío.")
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await updateIssueTypeRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      issueTypeId: id.data,
      patch: {
        ...(name !== null ? { name: name.trim() } : {}),
        ...(description !== null ? { description: description.trim() || null } : {}),
      },
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateServices(tenantSlug)
  return { error: null, ok: true }
}

/** Activar / desactivar (archivar) un tipo de daño sin borrarlo. */
export async function setIssueTypeActiveAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const active = field(formData, "active") === "true"
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await updateIssueTypeRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      issueTypeId: id.data,
      patch: { active },
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidateServices(tenantSlug)
  return { error: null, ok: true }
}
