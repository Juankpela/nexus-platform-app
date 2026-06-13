import type { UUID } from "@/types/shared"

/** Resolves the active tenant members that should receive a notification. */
export interface RecipientResolver {
  /** User ids of active members holding the given permission (ADR-030). */
  resolveByPermission(tenantId: UUID, permissionKey: string): Promise<UUID[]>
}
