"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ImportActionState } from "@/lib/csv/import-result"
import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeCompanyRecordStatus,
  createCompanyRecord,
  importCompanyRecords,
  updateCompanyRecord,
} from "@/modules/crm/composition"
import type { CompanyInput } from "@/modules/crm/domain/company"
import {
  COMPANY_REQUIRED_COLUMNS,
  mapRowsToCompanyImport,
} from "@/modules/crm/domain/company-import"
import {
  fail,
  field,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

const idSchema = z.uuid()
const statusSchema = z.enum(["active", "inactive"])

function readCompanyInput(formData: FormData): CompanyInput | null {
  const name = field(formData, "name")
  if (!name) return null
  return {
    name,
    taxId: field(formData, "tax_id"),
    industry: field(formData, "industry"),
    website: field(formData, "website"),
    phone: field(formData, "phone"),
    address: field(formData, "address"),
    city: field(formData, "city"),
    state: field(formData, "state"),
    country: field(formData, "country"),
    notes: field(formData, "notes"),
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage companies."
  }
  if (error instanceof ApplicationError && error.code === "COMPANY_NOT_FOUND") {
    return "Company not found."
  }
  return "The change could not be completed."
}

export async function createCompanyAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Invalid request.")
  const data = readCompanyInput(formData)
  if (!data) return fail("Company name is required.")

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.companiesWrite,
    )
    await createCompanyRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/companies`)
  return { error: null, ok: true }
}

export async function updateCompanyAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Invalid request.")
  const data = readCompanyInput(formData)
  if (!data) return fail("Company name is required.")

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.companiesWrite,
    )
    await updateCompanyRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/companies`)
  return { error: null, ok: true }
}

const MAX_IMPORT_ROWS = 5000

/**
 * CSV import (Inc 1). Receives the parsed headers + rows from the upload card,
 * re-checks the required columns server-side, maps to typed rows and delegates
 * to the import use-case. Returns counts + per-row errors for the result view.
 */
export async function importCompaniesAction(
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
  const missing = COMPANY_REQUIRED_COLUMNS.filter(
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
      CRM_PERMISSIONS.companiesWrite,
    )
    const mapped = mapRowsToCompanyImport(headerList, rows as string[][])
    const result = await importCompanyRecords({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      rows: mapped,
    })

    revalidatePath(`/app/${tenantSlug}/companies`)
    return { ok: true, error: null, result }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ApplicationError && error.code === "FORBIDDEN"
          ? "No tienes permiso para importar empresas."
          : "La importación falló. Inténtalo de nuevo.",
      result: null,
    }
  }
}

export async function setCompanyStatusAction(
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
      CRM_PERMISSIONS.companiesWrite,
    )
    await changeCompanyRecordStatus({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      status: status.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(`/app/${tenantSlug}/companies`)
  return { error: null, ok: true }
}
