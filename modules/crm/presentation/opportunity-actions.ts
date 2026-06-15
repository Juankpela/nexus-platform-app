"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  assignOpportunityRecordOwner,
  changeOpportunityRecordStatus,
  createOpportunityRecord,
  listCompanyOptions,
  listContactOptions,
  updateOpportunityRecord,
} from "@/modules/crm/composition"
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { ContactOption } from "@/modules/crm/domain/contact"
import {
  OPPORTUNITY_BUSINESS_TYPES,
  OPPORTUNITY_STATUSES,
  type OpportunityInput,
} from "@/modules/crm/domain/opportunity"
import { listCachedTenantMembers } from "@/modules/tenancy/composition"
import {
  fail,
  field,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

const idSchema = z.uuid()
const businessTypeSchema = z.enum(OPPORTUNITY_BUSINESS_TYPES)
const statusSchema = z.enum(OPPORTUNITY_STATUSES)

export type OpportunityFormOptions = {
  companies: CompanyOption[]
  contacts: ContactOption[]
  owners: { id: string; label: string }[]
}

/**
 * Loads the create/edit dropdown options client-side (on dialog open) instead of
 * serializing them into the page's RSC payload. The opportunities list page is
 * heavy (table/kanban); embedding these arrays in OpportunityFormDialog's props
 * pushes the payload past a Next 16 streaming boundary and the dialog trigger
 * silently fails to render. Fetching on demand keeps the page payload small.
 */
export async function loadOpportunityFormOptionsAction(
  tenantSlug: string,
): Promise<OpportunityFormOptions> {
  const context = await requireCrmContext(
    tenantSlug,
    CRM_PERMISSIONS.opportunitiesWrite,
  )
  const [companies, contacts, members] = await Promise.all([
    listCompanyOptions(context.tenantId),
    listContactOptions(context.tenantId),
    listCachedTenantMembers(context.tenantId),
  ])
  return {
    companies,
    contacts,
    owners: members.map((m) => ({
      id: m.userId,
      label: m.fullName ?? m.email ?? m.userId,
    })),
  }
}

type ParsedOpportunity =
  | { ok: true; data: OpportunityInput }
  | { ok: false; message: string }

function readOpportunityInput(formData: FormData): ParsedOpportunity {
  const company = idSchema.safeParse(field(formData, "company_id"))
  if (!company.success) return { ok: false, message: "Select a company." }
  const contact = idSchema.safeParse(field(formData, "contact_id"))
  if (!contact.success) return { ok: false, message: "Select a contact." }

  const name = field(formData, "name")
  if (!name) return { ok: false, message: "Name is required." }

  const businessType = businessTypeSchema.safeParse(
    field(formData, "business_type"),
  )
  if (!businessType.success) {
    return { ok: false, message: "Select a business type." }
  }

  let estimatedValue: number | null = null
  const valueRaw = field(formData, "estimated_value")
  if (valueRaw) {
    const parsed = Number(valueRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, message: "Invalid estimated value." }
    }
    estimatedValue = parsed
  }

  let probability = 0
  const probabilityRaw = field(formData, "probability")
  if (probabilityRaw) {
    const parsed = Number(probabilityRaw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      return { ok: false, message: "Probability must be between 0 and 100." }
    }
    probability = parsed
  }

  return {
    ok: true,
    data: {
      companyId: company.data,
      contactId: contact.data,
      name,
      businessType: businessType.data,
      estimatedValue,
      probability,
      expectedCloseDate: field(formData, "expected_close_date"),
      description: field(formData, "description"),
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage opportunities."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "OPPORTUNITY_NOT_FOUND"
  ) {
    return "Opportunity not found."
  }
  return "The change could not be completed."
}

function revalidate(tenantSlug: string, id?: string) {
  revalidatePath(`/app/${tenantSlug}/opportunities`)
  if (id) revalidatePath(`/app/${tenantSlug}/opportunities/${id}`)
}

export async function createOpportunityAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Invalid request.")
  const parsed = readOpportunityInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  const ownerRaw = field(formData, "owner_id")
  let ownerId: string | null = null
  if (ownerRaw) {
    const owner = idSchema.safeParse(ownerRaw)
    if (!owner.success) return fail("Invalid owner.")
    ownerId = owner.data
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.opportunitiesWrite,
    )
    await createOpportunityRecord({
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

export async function updateOpportunityAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Invalid request.")
  const parsed = readOpportunityInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.opportunitiesWrite,
    )
    await updateOpportunityRecord({
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

export async function setOpportunityStatusAction(
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
      CRM_PERMISSIONS.opportunitiesWrite,
    )
    await changeOpportunityRecordStatus({
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

export async function assignOpportunityOwnerAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Invalid request.")

  const ownerRaw = field(formData, "owner_id")
  let ownerId: string | null = null
  if (ownerRaw) {
    const owner = idSchema.safeParse(ownerRaw)
    if (!owner.success) return fail("Invalid owner.")
    ownerId = owner.data
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.opportunitiesWrite,
    )
    await assignOpportunityRecordOwner({
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
