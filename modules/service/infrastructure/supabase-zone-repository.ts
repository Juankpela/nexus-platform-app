import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ZoneRepository } from "@/modules/service/application/ports/zone-repository"
import type { Zone, ZoneInput } from "@/modules/service/domain/zone"
import type { TechnicianZone } from "@/modules/service/domain/technician-zone"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

const PG_UNIQUE_VIOLATION = "23505"

type ZoneRow = Database["public"]["Tables"]["service_zones"]["Row"]
type TechnicianZoneRowWithRef =
  Database["public"]["Tables"]["technician_zones"]["Row"] & {
    service_zones: { name: string } | null
  }

function toZone(row: ZoneRow): Zone {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseZoneRepository implements ZoneRepository {
  async listZones(tenantId: UUID): Promise<Zone[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("service_zones")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("archived_at", null)
      .order("name", { ascending: true })

    if (error) {
      throw new ApplicationError("Unable to list zones.", "ZONE_LIST_FAILED", error)
    }
    return (data ?? []).map(toZone)
  }

  async createZone(tenantId: UUID, input: ZoneInput): Promise<Zone> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("service_zones")
      .insert({ tenant_id: tenantId, name: input.name })
      .select("*")
      .single()

    if (error || !data) {
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ApplicationError("Zone name already exists.", "ZONE_NAME_TAKEN", error)
      }
      throw new ApplicationError("Unable to create zone.", "ZONE_CREATE_FAILED", error)
    }
    return toZone(data)
  }

  async archiveZone(tenantId: UUID, id: UUID, archivedAt: string): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("service_zones")
      .update({ archived_at: archivedAt })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError("Unable to archive zone.", "ZONE_ARCHIVE_FAILED", error)
    }
  }

  async listTechnicianZones(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<TechnicianZone[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technician_zones")
      .select("zone_id, created_at, updated_at, service_zones(name)")
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)

    if (error) {
      throw new ApplicationError(
        "Unable to list technician zones.",
        "TECHNICIAN_ZONE_LIST_FAILED",
        error,
      )
    }
    return (data as unknown as TechnicianZoneRowWithRef[])
      .map((row) => ({
        zoneId: row.zone_id,
        zoneName: row.service_zones?.name ?? "—",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
      .sort((a, b) => a.zoneName.localeCompare(b.zoneName))
  }

  async assignTechnicianZone(
    tenantId: UUID,
    technicianId: UUID,
    zoneId: UUID,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client.from("technician_zones").upsert(
      { tenant_id: tenantId, technician_id: technicianId, zone_id: zoneId },
      { onConflict: "tenant_id,technician_id,zone_id" },
    )

    if (error) {
      throw new ApplicationError(
        "Unable to assign zone to technician.",
        "TECHNICIAN_ZONE_ASSIGN_FAILED",
        error,
      )
    }
  }

  async removeTechnicianZone(
    tenantId: UUID,
    technicianId: UUID,
    zoneId: UUID,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("technician_zones")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .eq("zone_id", zoneId)

    if (error) {
      throw new ApplicationError(
        "Unable to remove technician zone.",
        "TECHNICIAN_ZONE_REMOVE_FAILED",
        error,
      )
    }
  }
}
