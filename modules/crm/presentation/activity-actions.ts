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

  const companyIdRaw = field(formData, "company_id")
  const contactIdRaw = field(formData, "contact_id")
  let companyId: string | null = null
  let contactId: string | null = null
  if (companyIdRaw) {
    const parsed = idSchema.safeParse(companyIdRaw)
    if (!parsed.success) return { ok: false, message: "Invalid company." }
    companyId = parsed.data
  }
  if (contactIdRaw) {
    const parsed = idSchema.safeParse(contactIdRaw)
    if (!parsed.success) return { ok: false, message: "Invalid contact." }
    contactId = parsed.data
  }

  return {
    ok: true,
    data: {
      type: type.data,
      subject,
      body: field(formData, "body"),
      dueAt: field(formData, "due_at"),
      companyId,
      contactId,
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
