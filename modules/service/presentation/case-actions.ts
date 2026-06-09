"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  assignCaseRecordOwner,
  changeCaseRecordStatus,
  createCaseRecord,
  updateCaseRecord,
} from "@/modules/service/composition"
import {
  CASE_ORIGINS,
  CASE_PRIORITIES,
  CASE_STATUSES,
  type CaseInput,
} from "@/modules/service/domain/case"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const prioritySchema = z.enum(CASE_PRIORITIES)
const originSchema = z.enum(CASE_ORIGINS)
const statusSchema = z.enum(CASE_STATUSES)

type ParsedCase =
  | { ok: true; data: CaseInput }
  | { ok: false; message: string }

function readCaseInput(formData: FormData): ParsedCase {
  const subject = field(formData, "subject")
  if (!subject) return { ok: false, message: "El asunto es obligatorio." }

  const priority = prioritySchema.safeParse(field(formData, "priority"))
  if (!priority.success) return { ok: false, message: "Selecciona una prioridad." }

  const origin = originSchema.safeParse(field(formData, "origin"))
  if (!origin.success) return { ok: false, message: "Selecciona un origen." }

  const parseOptionalId = (raw: string | null) =>
    raw ? idSchema.safeParse(raw) : null

  const companyParsed = parseOptionalId(field(formData, "company_id"))
  if (companyParsed && !companyParsed.success) {
    return { ok: false, message: "Empresa inválida." }
  }
  const contactParsed = parseOptionalId(field(formData, "contact_id"))
  if (contactParsed && !contactParsed.success) {
    return { ok: false, message: "Contacto inválido." }
  }
  const assetParsed = parseOptionalId(field(formData, "asset_id"))
  if (assetParsed && !assetParsed.success) {
    return { ok: false, message: "Activo inválido." }
  }

  return {
    ok: true,
    data: {
      subject,
      description: field(formData, "description"),
      priority: priority.data,
      origin: origin.data,
      companyId: companyParsed?.success ? companyParsed.data : null,
      contactId: contactParsed?.success ? contactParsed.data : null,
      assetId: assetParsed?.success ? assetParsed.data : null,
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "No tienes permiso para gestionar casos."
  }
  if (error instanceof ApplicationError && error.code === "CASE_NOT_FOUND") {
    return "Caso no encontrado."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "INVALID_CASE_STATUS_TRANSITION"
  ) {
    return "Transición de estado no permitida."
  }
  return "No se pudo completar la acción."
}

function revalidate(tenantSlug: string, id?: string) {
  revalidatePath(`/app/${tenantSlug}/cases`)
  if (id) revalidatePath(`/app/${tenantSlug}/cases/${id}`)
}

export async function createCaseAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Solicitud inválida.")
  const parsed = readCaseInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  const ownerRaw = field(formData, "owner_id")
  let ownerId: string | null = null
  if (ownerRaw) {
    const owner = idSchema.safeParse(ownerRaw)
    if (!owner.success) return fail("Responsable inválido.")
    ownerId = owner.data
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.casesWrite,
    )
    await createCaseRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      ownerId,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug)
  return { error: null, ok: true }
}

export async function updateCaseAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")
  const parsed = readCaseInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.casesWrite,
    )
    await updateCaseRecord({
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

export async function setCaseStatusAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const status = statusSchema.safeParse(field(formData, "status"))
  if (!tenantSlug || !id.success || !status.success) {
    return fail("Solicitud inválida.")
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.casesWrite,
    )
    await changeCaseRecordStatus({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      status: status.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}

export async function assignCaseOwnerAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  const ownerRaw = field(formData, "owner_id")
  let ownerId: string | null = null
  if (ownerRaw) {
    const owner = idSchema.safeParse(ownerRaw)
    if (!owner.success) return fail("Responsable inválido.")
    ownerId = owner.data
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.casesWrite,
    )
    await assignCaseRecordOwner({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      ownerId,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}
