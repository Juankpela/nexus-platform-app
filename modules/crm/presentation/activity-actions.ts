"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  changeActivityRecordStatus,
  createActivityRecord,
  updateActivityRecord,
} from "@/modules/crm/composition"
import { ACTIVITY_TYPES } from "@/modules/crm/domain/activity"
import type { ActivityInput } from "@/modules/crm/domain/activity"
import {
  fail,
  field,
  requireCrmContext,
  type CrmActionState,
} from "@/modules/crm/presentation/require-crm-context"

const idSchema = z.uuid()
const typeSchema = z.enum(ACTIVITY_TYPES)
const statusSchema = z.enum(["open", "completed"])

// Only same-app relative paths may be revalidated.
function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/app/") || value.startsWith("//")) return null
  return value
}

type ParsedActivity =
  | { ok: true; data: ActivityInput }
  | { ok: false; message: string }

function readActivityInput(formData: FormData): ParsedActivity {
  const type = typeSchema.safeParse(field(formData, "type"))
  if (!type.success) return { ok: false, message: "Select an activity type." }

  const subject = field(formData, "subject")
  if (!subject) return { ok: false, message: "Subject is required." }

  const parseOptionalId = (raw: string | null) =>
    raw ? idSchema.safeParse(raw) : null

  const companyParsed = parseOptionalId(field(formData, "company_id"))
  if (companyParsed && !companyParsed.success) {
    return { ok: false, message: "Invalid company." }
  }
  const contactParsed = parseOptionalId(field(formData, "contact_id"))
  if (contactParsed && !contactParsed.success) {
    return { ok: false, message: "Invalid contact." }
  }
  const opportunityParsed = parseOptionalId(field(formData, "opportunity_id"))
  if (opportunityParsed && !opportunityParsed.success) {
    return { ok: false, message: "Invalid opportunity." }
  }
  const caseParsed = parseOptionalId(field(formData, "case_id"))
  if (caseParsed && !caseParsed.success) {
    return { ok: false, message: "Invalid case." }
  }
  const assetParsed = parseOptionalId(field(formData, "asset_id"))
  if (assetParsed && !assetParsed.success) {
    return { ok: false, message: "Invalid asset." }
  }

  return {
    ok: true,
    data: {
      type: type.data,
      subject,
      body: field(formData, "body"),
      dueAt: field(formData, "due_at"),
      companyId: companyParsed?.success ? companyParsed.data : null,
      contactId: contactParsed?.success ? contactParsed.data : null,
      opportunityId: opportunityParsed?.success ? opportunityParsed.data : null,
      caseId: caseParsed?.success ? caseParsed.data : null,
      assetId: assetParsed?.success ? assetParsed.data : null,
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "You do not have permission to manage activities."
  }
  if (error instanceof ApplicationError && error.code === "ACTIVITY_NOT_FOUND") {
    return "Activity not found."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "ACTIVITY_TARGET_REQUIRED"
  ) {
    return "An activity must reference a company or a contact."
  }
  return "The change could not be completed."
}

export async function createActivityAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const returnPath = safeReturnPath(field(formData, "returnPath"))
  if (!tenantSlug || !returnPath) return fail("Invalid request.")
  const parsed = readActivityInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.activitiesWrite,
    )
    await createActivityRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(returnPath)
  return { error: null, ok: true }
}

export async function updateActivityAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const returnPath = safeReturnPath(field(formData, "returnPath"))
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !returnPath || !id.success) return fail("Invalid request.")
  const parsed = readActivityInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.activitiesWrite,
    )
    await updateActivityRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(returnPath)
  return { error: null, ok: true }
}

export async function setActivityStatusAction(
  _state: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const returnPath = safeReturnPath(field(formData, "returnPath"))
  const id = idSchema.safeParse(field(formData, "id"))
  const status = statusSchema.safeParse(field(formData, "status"))
  if (!tenantSlug || !returnPath || !id.success || !status.success) {
    return fail("Invalid request.")
  }

  try {
    const context = await requireCrmContext(
      tenantSlug,
      CRM_PERMISSIONS.activitiesWrite,
    )
    await changeActivityRecordStatus({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      status: status.data,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath(returnPath)
  return { error: null, ok: true }
}
