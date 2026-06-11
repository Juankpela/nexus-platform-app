"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeLeadRecordStatus,
  convertLeadRecord,
  createLeadRecord,
  updateLeadRecord,
} from "@/modules/crm/composition"
import { OPPORTUNITY_BUSINESS_TYPES } from "@/modules/crm/domain/opportunity"
import {
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from "@/modules/crm/domain/lead"
import {
  fail,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

export type LeadActionState = CrmActionState & { data?: Lead }
export type ConvertActionState = CrmActionState & { opportunityId?: string }

const LeadInputSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  source: z.string().nullable(),
  notes: z.string().nullable(),
})

function parseLeadInput(formData: FormData) {
  return LeadInputSchema.parse({
    name: formData.get("name"),
    company: formData.get("company") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    source: formData.get("source") || null,
    notes: formData.get("notes") || null,
  })
}

function handleError(err: unknown): CrmActionState {
  if (err instanceof ApplicationError) return fail(err.message)
  if (err instanceof z.ZodError) {
    return fail(err.issues.map((i) => i.message).join(", "))
  }
  console.error(err)
  return fail("An unexpected error occurred.")
}

export async function createLeadAction(
  tenantSlug: string,
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.leadsWrite,
    )
    const data = parseLeadInput(formData)
    const lead = await createLeadRecord({
      tenantId,
      actorId: userId,
      requestId,
      ownerId: null,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/leads`)
    return { ok: true, error: null, data: lead }
  } catch (err) {
    return handleError(err)
  }
}

export async function updateLeadAction(
  tenantSlug: string,
  leadId: string,
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.leadsWrite,
    )
    const data = parseLeadInput(formData)
    const lead = await updateLeadRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: leadId,
      data,
    })
    revalidatePath(`/app/${tenantSlug}/leads`)
    revalidatePath(`/app/${tenantSlug}/leads/${leadId}`)
    return { ok: true, error: null, data: lead }
  } catch (err) {
    return handleError(err)
  }
}

export async function changeLeadStatusAction(
  tenantSlug: string,
  leadId: string,
  status: LeadStatus,
): Promise<CrmActionState> {
  try {
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
      return fail("Estado inválido.")
    }
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.leadsWrite,
    )
    await changeLeadRecordStatus({
      tenantId,
      actorId: userId,
      requestId,
      id: leadId,
      status,
    })
    revalidatePath(`/app/${tenantSlug}/leads`)
    revalidatePath(`/app/${tenantSlug}/leads/${leadId}`)
    return { ok: true, error: null }
  } catch (err) {
    return handleError(err)
  }
}

export async function convertLeadAction(
  tenantSlug: string,
  leadId: string,
  _prev: ConvertActionState,
  formData: FormData,
): Promise<ConvertActionState> {
  try {
    const { tenantId, userId, requestId } = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.leadsWrite,
    )
    const opportunityName = z
      .string()
      .min(1)
      .max(200)
      .parse(formData.get("opportunityName"))
    const businessType = z
      .enum(OPPORTUNITY_BUSINESS_TYPES)
      .parse(formData.get("businessType"))

    const result = await convertLeadRecord({
      tenantId,
      actorId: userId,
      requestId,
      id: leadId,
      data: { opportunityName, businessType },
    })
    revalidatePath(`/app/${tenantSlug}/leads`)
    revalidatePath(`/app/${tenantSlug}/leads/${leadId}`)
    return { ok: true, error: null, opportunityId: result.opportunityId }
  } catch (err) {
    return handleError(err)
  }
}
