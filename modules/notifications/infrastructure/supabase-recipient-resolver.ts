import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ApplicationError } from "@/lib/errors/application-error"
import type { RecipientResolver } from "@/modules/notifications/application/ports/recipient-resolver"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

/**
 * Resolves recipients via the tenant_users_with_permission RPC (ADR-030).
 * Constructed with the client for the context — admin in the cron fan-out.
 */
export class SupabaseRecipientResolver implements RecipientResolver {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async resolveByPermission(tenantId: UUID, permissionKey: string): Promise<UUID[]> {
    const { data, error } = await this.client.rpc("tenant_users_with_permission", {
      p_tenant_id: tenantId,
      p_permission_key: permissionKey,
    })

    if (error) {
      throw new ApplicationError(
        "Unable to resolve notification recipients.",
        "RECIPIENT_RESOLVE_FAILED",
        error,
      )
    }
    return (data ?? []) as UUID[]
  }
}
