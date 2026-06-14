"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ImportActionState } from "@/lib/csv/import-result"
import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeContactRecordStatus,
  createContactRecord,
  importContactRecords,
  updateContactRecord,
} from "@/modules/crm/composition"
import type { ContactInput } from "@/modules/crm/domain/contact"
import {
  CONTACT_REQUIRED_COLUMNS,
  mapRowsToContactImport,
} from "@/modules/crm/domain/contact-import"
import {
  fail,
  field,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

const idSchema = z.uuid()
const statusSchema = z.enum(["active", "inactive"])
const emailSchema = z.email()

type ParsedContact = { ok: true; data: ContactInput } | { ok: false; message: string }

function readContactInput(formData: FormData): ParsedContact {
  const firstName = field(formData, "first_name")
  if (!firstName) return { ok: false, message: "First name is required." }

  const companyIdRaw = field(formData, "company_id")
  let companyId: string | null = null
  if (companyIdRaw) {
    const parsed = idSchema.safeParse(companyIdRaw)
    if (!parsed.success) return { ok: false, message: "Invalid company." }
    companyId = parsed.data
  }

  const email = field(formData, "email")
  if (email && !emailSchema.safeParse(email).success) {
    return { ok: false, message: "Invalid email address." }
  }

  return {
    ok: true,
    data: {
      companyId,
      firstName,
      lastName: field(formData, "last_name"),
      email,
      phone: field(formData, "phone"),
      mobile: field(formData, "mobile"),
      title: field(formData, "title"),
      department: field(formData, "department"),
      notes: field(formData, "notes"),
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage contacts."
  }
  if (error instanceof ApplicationError && error.code === "CONTACT_NOT_FOUND") {
    return "Contact not found."
  }
  return "The change could not be completed."
}

export async function createContactAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Invalid request.")
  const parsed = readContactInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.contactsWrite,
    )
    await createContactRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/contacts`)
  return { error: null, ok: true }
}

export async function updateContactAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Invalid request.")
  const parsed = readContactInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.contactsWrite,
    )
    await updateContactRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/contacts`)
  return { error: null, ok: true }
}

const MAX_IMPORT_ROWS = 5000

/**
 * CSV import (Inc 2). Same shape as the Companies import: re-checks the
 * required columns server-side, maps rows and delegates. Company links are
 * resolved inside the repository (by NIT, falling back to name).
 */
export async function importContactsAction(
  _state: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const headersJson = formData.get("headers")
  const rowsJson = formData.get("rows")
  if (
    !tenantSlug ||
    typeof headersJson !== "string" ||
    typeof rowsJson !== "string"
  ) {
    return { ok: false, error: "Solicitud inválida.", result: null }
  }

  let headers: unknown
  let rows: unknown
  try {
    headers = JSON.parse(headersJson)
    rows = JSON.parse(rowsJson)
  } catch {
    return { ok: false, error: "El archivo no se pudo leer.", result: null }
  }

  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    return { ok: false, error: "El archivo no tiene el formato esperado.", result: null }
  }
  if (rows.length === 0) {
    return { ok: false, error: "El archivo no tiene filas para importar.", result: null }
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `El archivo supera el máximo de ${MAX_IMPORT_ROWS} filas. Divídelo en partes.`,
      result: null,
    }
  }

  const headerList = headers as string[]
  const missing = CONTACT_REQUIRED_COLUMNS.filter(
    (col) => !headerList.includes(col),
  )
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Falta la columna obligatoria: ${missing.join(", ")}. Descarga la plantilla y úsala como base.`,
      result: null,
    }
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.contactsWrite,
    )
    const mapped = mapRowsToContactImport(headerList, rows as string[][])
    const result = await importContactRecords({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      rows: mapped,
    })

    revalidatePath(`/app/${tenantSlug}/contacts`)
    return { ok: true, error: null, result }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ApplicationError && error.code === "FORBIDDEN"
          ? "No tienes permiso para importar contactos."
          : "La importación falló. Inténtalo de nuevo.",
      result: null,
    }
  }
}

export async function setContactStatusAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  const status = statusSchema.safeParse(field(formData, "status"))
  if (!tenantSlug || !id.success || !status.success) {
    return fail("Invalid request.")
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.contactsWrite,
    )
    await changeContactRecordStatus({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      status: status.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/contacts`)
  return { error: null, ok: true }
}
