import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AvailabilityRepository } from "@/modules/service/application/ports/availability-repository"
import type {
  AvailabilityException,
  AvailabilityExceptionInput,
  ExceptionKind,
  TechnicianCapacity,
  WeeklyWindow,
  WeeklyWindowInput,
  Weekday,
} from "@/modules/service/domain/availability"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type WindowRow = Database["public"]["Tables"]["technician_availability"]["Row"]
type ExceptionRow =
  Database["public"]["Tables"]["technician_availability_exceptions"]["Row"]

function toWindow(row: WindowRow): WeeklyWindow {
  return {
    id: row.id,
    weekday: row.weekday as Weekday,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toException(row: ExceptionRow): AvailabilityException {
  return {
    id: row.id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    kind: row.kind as ExceptionKind,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseAvailabilityRepository implements AvailabilityRepository {
  async listWindows(tenantId: UUID, technicianId: UUID): Promise<WeeklyWindow[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technician_availability")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .order("weekday", { ascending: true })
      .order("start_minute", { ascending: true })

    if (error) {
      throw new ApplicationError("Unable to list availability.", "AVAILABILITY_LIST_FAILED", error)
    }
    return (data ?? []).map(toWindow)
  }

  async addWindow(
    tenantId: UUID,
    technicianId: UUID,
    input: WeeklyWindowInput,
  ): Promise<WeeklyWindow> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technician_availability")
      .insert({
        tenant_id: tenantId,
        technician_id: technicianId,
        weekday: input.weekday,
        start_minute: input.startMinute,
        end_minute: input.endMinute,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError("Unable to add availability window.", "AVAILABILITY_ADD_FAILED", error)
    }
    return toWindow(data)
  }

  async removeWindow(tenantId: UUID, technicianId: UUID, windowId: UUID): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("technician_availability")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .eq("id", windowId)

    if (error) {
      throw new ApplicationError("Unable to remove availability window.", "AVAILABILITY_REMOVE_FAILED", error)
    }
  }

  async listExceptions(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<AvailabilityException[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technician_availability_exceptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .order("date_from", { ascending: true })

    if (error) {
      throw new ApplicationError("Unable to list exceptions.", "EXCEPTION_LIST_FAILED", error)
    }
    return (data ?? []).map(toException)
  }

  async addException(
    tenantId: UUID,
    technicianId: UUID,
    input: AvailabilityExceptionInput,
  ): Promise<AvailabilityException> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technician_availability_exceptions")
      .insert({
        tenant_id: tenantId,
        technician_id: technicianId,
        date_from: input.dateFrom,
        date_to: input.dateTo,
        start_minute: input.startMinute,
        end_minute: input.endMinute,
        kind: input.kind,
        note: input.note,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError("Unable to add exception.", "EXCEPTION_ADD_FAILED", error)
    }
    return toException(data)
  }

  async removeException(
    tenantId: UUID,
    technicianId: UUID,
    exceptionId: UUID,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("technician_availability_exceptions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .eq("id", exceptionId)

    if (error) {
      throw new ApplicationError("Unable to remove exception.", "EXCEPTION_REMOVE_FAILED", error)
    }
  }

  async getCapacity(tenantId: UUID, technicianId: UUID): Promise<TechnicianCapacity> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("max_work_orders_per_day, max_minutes_per_day")
      .eq("tenant_id", tenantId)
      .eq("id", technicianId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError("Unable to load capacity.", "CAPACITY_LOAD_FAILED", error)
    }
    return {
      maxWorkOrdersPerDay: data?.max_work_orders_per_day ?? null,
      maxMinutesPerDay: data?.max_minutes_per_day ?? null,
    }
  }

  async setCapacity(
    tenantId: UUID,
    technicianId: UUID,
    capacity: TechnicianCapacity,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("technicians")
      .update({
        max_work_orders_per_day: capacity.maxWorkOrdersPerDay,
        max_minutes_per_day: capacity.maxMinutesPerDay,
      })
      .eq("tenant_id", tenantId)
      .eq("id", technicianId)

    if (error) {
      throw new ApplicationError("Unable to set capacity.", "CAPACITY_SET_FAILED", error)
    }
  }
}
