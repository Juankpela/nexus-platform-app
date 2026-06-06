"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeCompanyRecordStatus,
  createCompanyRecord,
  updateCompanyRecord,
} from "@/modules/crm/composition"
import type { CompanyInput } from "@/modules/crm/domain/company"
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
