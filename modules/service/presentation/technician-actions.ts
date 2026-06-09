"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  createTechnicianRecord,
  deactivateTechnicianRecord,
  updateTechnicianRecord,
} from "@/modules/service/composition"
import {
  TECHNICIAN_STATUSES,
  type TechnicianInput,
} from "@/modules/service/domain/technician"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const emailSchema = z.email()
const statusSchema = z.enum(TECHNICIAN_STATUSES)

type ParsedTechnician =
  | { ok: true; data: TechnicianInput }
  | { ok: false; message: string }

function readTechnicianInput(formData: FormData): ParsedTechnician {
  const firstName = field(formData, "first_name")
  if (!firstName) return { ok: false, message: "El nombre es obligatorio." }
  const lastName = field(formData, "last_name")
  if (!lastName) return { ok: false, message: "El apellido es obligatorio." }

  const email = emailSchema.safeParse(field(formData, "email"))
  if (!email.success) return { ok: false, message: "Email inválido." }

  const status = statusSchema.safeParse(field(formData, "status"))
  if (!status.success) return { ok: false, message: "Selecciona un estado." }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email: email.data,
      phone: field(formData, "phone"),
      employeeId: field(formData, "employee_id"),
      status: status.data,
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "No tienes permiso para gestionar técnicos."
  }
  if (error instanceof ApplicationError && error.code === "TECHNICIAN_NOT_FOUND") {
    return "Técnico no encontrado."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "TECHNICIAN_EMAIL_TAKEN"
  ) {
    return "Ya existe un técnico con ese email."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "TECHNICIAN_EMPLOYEE_ID_TAKEN"
  ) {
    return "Ya existe un técnico con ese ID de empleado."
  }
  return "No se pudo completar la acción."
}

function revalidate(tenantSlug: string, id?: string) {
  revalidatePath(`/app/${tenantSlug}/technicians`)
  if (id) revalidatePath(`/app/${tenantSlug}/technicians/${id}`)
}

export async function createTechnicianAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Solicitud inválida.")
  const parsed = readTechnicianInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await createTechnicianRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug)
  return { error: null, ok: true }
}

export async function updateTechnicianAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")
  const parsed = readTechnicianInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await updateTechnicianRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}

export async function deactivateTechnicianAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.techniciansWrite,
    )
    await deactivateTechnicianRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}
