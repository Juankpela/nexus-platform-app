import { notFound } from "next/navigation"

import { hasPermission } from "@/modules/authorization/domain/permission"

export function requirePermission(
  effectivePermissions: readonly string[],
  permission: string,
) {
  if (!hasPermission(effectivePermissions, permission)) {
    notFound()
  }
}
