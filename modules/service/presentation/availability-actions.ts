"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  addAvailabilityExceptionRecord,
  addAvailabilityWindowRecord,
  removeAvailabilityExceptionRecord,
  removeAvailabilityWindowRecord,
  setTechnicianCapacityRecord,
} from "@/modules/service/composition"
import {
  EXCEPTION_KINDS,
  hhmmToMinutes,
  isWeekday,
} from "@/modules/service/domain/availability"
import {
  fail,
  field,
  requireServiceContext,
  type ServiceActionState,
} from "@/modules/service/presentation/require-service-context"

const idSchema = z.uuid()
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const kindSchema = z.enum(EXCEPTION_KINDS)

function describeError(error: unknown): string {
  if (error instanceof ApplicationError) {
    if (error.code === "FORBIDDEN") return "No tienes permiso para gestionar disponibilidad."
    if (error.code === "INVALID_AVAILABILITY_WINDOW") return "Horario inválido (fin debe ser mayor que inicio)."
    if (error.code === "INVALID_EXCEPTION_RANGE") return "Rango de fechas inválido."
    if (error.code === "INVALID_EXCEPTION_WINDOW") return "Horario de la excepción inválido."
  }
  return "No se pudo completar la acción."
}

function rv(tenantSlug: string, technicianId: string) {
  revalidatePath(`/app/${tenantSlug}/technicians/${technicianId}`)
}

async function ctx(tenantSlug: string) {
  return requireServiceContext(tenantSlug, SERVICE_PERMISSIONS.techniciansWrite)
}

export async function addAvailabilityWindowAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  if (!tenantSlug || !technicianId.success) return fail("Solicitud inválida.")

  const weekday = Number(field(formData, "weekday"))
  const start = hhmmToMinutes(field(formData, "start") ?? "")
  const end = hhmmToMinutes(field(formData, "end") ?? "")
  if (!isWeekday(weekday)) return fail("Día inválido.")
  if (start === null || end === null) return fail("Horario inválido.")

  try {
    const context = await ctx(tenantSlug)
    await addAvailabilityWindowRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      data: { weekday, startMinute: start, endMinute: end },
    })
  } catch (error) {
    return fail(describeError(error))
  }
  rv(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}

export async function removeAvailabilityWindowAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const windowId = idSchema.safeParse(field(formData, "window_id"))
  if (!tenantSlug || !technicianId.success || !windowId.success) return fail("Solicitud inválida.")

  try {
    const context = await ctx(tenantSlug)
    await removeAvailabilityWindowRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      windowId: windowId.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }
  rv(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}

export async function addAvailabilityExceptionAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const dateFrom = dateSchema.safeParse(field(formData, "date_from"))
  const dateTo = dateSchema.safeParse(field(formData, "date_to"))
  const kind = kindSchema.safeParse(field(formData, "kind"))
  if (!tenantSlug || !technicianId.success) return fail("Solicitud inválida.")
  if (!dateFrom.success || !dateTo.success) return fail("Fechas inválidas.")
  if (!kind.success) return fail("Selecciona un tipo.")

  const startRaw = field(formData, "start")
  const endRaw = field(formData, "end")
  let startMinute: number | null = null
  let endMinute: number | null = null
  if (startRaw || endRaw) {
    startMinute = hhmmToMinutes(startRaw ?? "")
    endMinute = hhmmToMinutes(endRaw ?? "")
    if (startMinute === null || endMinute === null) return fail("Horario de la excepción inválido.")
  }

  try {
    const context = await ctx(tenantSlug)
    await addAvailabilityExceptionRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      data: {
        dateFrom: dateFrom.data,
        dateTo: dateTo.data,
        startMinute,
        endMinute,
        kind: kind.data,
        note: field(formData, "note"),
      },
    })
  } catch (error) {
    return fail(describeError(error))
  }
  rv(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}

export async function removeAvailabilityExceptionAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  const exceptionId = idSchema.safeParse(field(formData, "exception_id"))
  if (!tenantSlug || !technicianId.success || !exceptionId.success) return fail("Solicitud inválida.")

  try {
    const context = await ctx(tenantSlug)
    await removeAvailabilityExceptionRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      exceptionId: exceptionId.data,
    })
  } catch (error) {
    return fail(describeError(error))
  }
  rv(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}

function parseCapacityField(raw: string | null, max: number): number | null | "invalid" {
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > max) return "invalid"
  return n
}

export async function setTechnicianCapacityAction(
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const technicianId = idSchema.safeParse(field(formData, "technician_id"))
  if (!tenantSlug || !technicianId.success) return fail("Solicitud inválida.")

  const maxWo = parseCapacityField(field(formData, "max_work_orders_per_day"), 1000)
  const maxMin = parseCapacityField(field(formData, "max_minutes_per_day"), 1440)
  if (maxWo === "invalid" || maxMin === "invalid") return fail("Valores de capacidad inválidos.")

  try {
    const context = await ctx(tenantSlug)
    await setTechnicianCapacityRecord({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      technicianId: technicianId.data,
      capacity: { maxWorkOrdersPerDay: maxWo, maxMinutesPerDay: maxMin },
    })
  } catch (error) {
    return fail(describeError(error))
  }
  rv(tenantSlug, technicianId.data)
  return { error: null, ok: true }
}
