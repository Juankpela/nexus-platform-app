"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
} from "@/modules/authorization/domain/permission"
import {
  approveWorkOrderRecordBilling,
  assignWorkOrderRecordTechnician,
  changeWorkOrderRecordStatus,
  createWorkOrderFromQuoteRecord,
  createWorkOrderRecord,
  setWorkOrderRecordBillable,
  updateWorkOrderRecord,
} from "@/modules/service/composition"
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderInput,
} from "@/modules/service/domain/work-order"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const prioritySchema = z.enum(WORK_ORDER_PRIORITIES)
const statusSchema = z.enum(WORK_ORDER_STATUSES)

type ParsedWorkOrder =
  | { ok: true; data: WorkOrderInput }
  | { ok: false; message: string }

function parseTimestamp(raw: string | null): string | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function readWorkOrderInput(formData: FormData): ParsedWorkOrder {
  const subject = field(formData, "subject")
  if (!subject) return { ok: false, message: "El asunto es obligatorio." }

  const priority = prioritySchema.safeParse(field(formData, "priority"))
  if (!priority.success) return { ok: false, message: "Selecciona una prioridad." }

  const parseOptionalId = (raw: string | null) =>
    raw ? idSchema.safeParse(raw) : null
  const companyParsed = parseOptionalId(field(formData, "company_id"))
  if (companyParsed && !companyParsed.success) {
    return { ok: false, message: "Empresa inválida." }
  }
  const caseParsed = parseOptionalId(field(formData, "case_id"))
  if (caseParsed && !caseParsed.success) {
    return { ok: false, message: "Caso inválido." }
  }
  const assetParsed = parseOptionalId(field(formData, "asset_id"))
  if (assetParsed && !assetParsed.success) {
    return { ok: false, message: "Activo inválido." }
  }

  let laborHours: number | null = null
  const laborRaw = field(formData, "labor_hours")
  if (laborRaw) {
    const parsed = Number(laborRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, message: "Horas inválidas." }
    }
    laborHours = parsed
  }

  return {
    ok: true,
    data: {
      subject,
      description: field(formData, "description"),
      priority: priority.data,
      companyId: companyParsed?.success ? companyParsed.data : null,
      caseId: caseParsed?.success ? caseParsed.data : null,
      assetId: assetParsed?.success ? assetParsed.data : null,
      scheduledStart: parseTimestamp(field(formData, "scheduled_start")),
      scheduledEnd: parseTimestamp(field(formData, "scheduled_end")),
      slaDueAt: parseTimestamp(field(formData, "sla_due_at")),
      laborHours,
      resolutionSummary: field(formData, "resolution_summary"),
      completionNotes: field(formData, "completion_notes"),
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
    return "No tienes permiso para gestionar órdenes de trabajo."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "WORK_ORDER_NOT_FOUND"
  ) {
    return "Orden de trabajo no encontrada."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "INVALID_WORK_ORDER_STATUS_TRANSITION"
  ) {
    return "Transición de estado no permitida."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "WORK_ORDER_NOT_BILLABLE"
  ) {
    return "Solo las órdenes facturables pueden aprobarse para facturación."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "WORK_ORDER_NOT_COMPLETED"
  ) {
    return "Solo las órdenes completadas pueden aprobarse para facturación."
  }
  if (error instanceof ApplicationError && error.code === "QUOTE_NOT_ACCEPTED") {
    return "Solo las cotizaciones aceptadas pueden generar una orden de trabajo."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "QUOTE_ALREADY_HAS_WORK_ORDER"
  ) {
    return "Esta cotización ya tiene una orden de trabajo."
  }
  if (
    error instanceof ApplicationError &&
    error.code === "QUOTE_NO_SERVICE_LINES"
  ) {
    return "Esta cotización no tiene líneas de servicio. Una cotización solo de productos debe convertirse en Sales Order (E6), no en orden de trabajo."
  }
  return "No se pudo completar la acción."
}

function revalidate(tenantSlug: string, id?: string, caseId?: string | null) {
  revalidatePath(`/app/${tenantSlug}/work-orders`)
  if (id) revalidatePath(`/app/${tenantSlug}/work-orders/${id}`)
  if (caseId) revalidatePath(`/app/${tenantSlug}/cases/${caseId}`)
}

export async function createWorkOrderAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return fail("Solicitud inválida.")
  const parsed = readWorkOrderInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    await createWorkOrderRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, undefined, parsed.data.caseId)
  return { error: null, ok: true }
}

export async function updateWorkOrderAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")
  const parsed = readWorkOrderInput(formData)
  if (!parsed.ok) return fail(parsed.message)

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    await updateWorkOrderRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      data: parsed.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data, parsed.data.caseId)
  return { error: null, ok: true }
}

export async function setWorkOrderStatusAction(
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
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    await changeWorkOrderRecordStatus({
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

export type CreateWorkOrderFromQuoteState = ServiceActionState & {
  workOrderId?: string
  serviceLineCount?: number
  productLineCount?: number
}

export async function createWorkOrderFromQuoteAction(
  tenantSlug: string,
  quoteId: string,
): Promise<CreateWorkOrderFromQuoteState> {
  const id = idSchema.safeParse(quoteId)
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    const result = await createWorkOrderFromQuoteRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      quoteId: id.data,
    })
    revalidate(tenantSlug, result.workOrder.id)
    revalidatePath(`/app/${tenantSlug}/quotes/${quoteId}`)
    return {
      error: null,
      ok: true,
      workOrderId: result.workOrder.id,
      serviceLineCount: result.serviceLineCount,
      productLineCount: result.productLineCount,
    }
  } catch (error) {
    return fail(describeError(error))
  }
}

export async function setWorkOrderBillableAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")
  const billable = field(formData, "billable") === "true"

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    await setWorkOrderRecordBillable({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      billable,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}

export async function approveWorkOrderBillingAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  try {
    const context = await requireServiceContext(
      tenantSlug,
      BILLING_PERMISSIONS.invoicesWrite,
    )
    await approveWorkOrderRecordBilling({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      approvedAt: new Date().toISOString(),
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}

export async function assignWorkOrderTechnicianAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return fail("Solicitud inválida.")

  const techRaw = field(formData, "technician_id")
  let technicianId: string | null = null
  if (techRaw) {
    const tech = idSchema.safeParse(techRaw)
    if (!tech.success) return fail("Técnico inválido.")
    technicianId = tech.data
  }

  try {
    const context = await requireServiceContext(
      tenantSlug,
      SERVICE_PERMISSIONS.workOrdersWrite,
    )
    await assignWorkOrderRecordTechnician({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      id: id.data,
      technicianId,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidate(tenantSlug, id.data)
  return { error: null, ok: true }
}
