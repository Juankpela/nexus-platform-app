import type { PlatformRepository } from "@/modules/platform/application/ports/platform-repository"
import type { UUID } from "@/types/shared"

export function grantPlatformAdmin(platform: PlatformRepository, userId: UUID) {
  return platform.grantPlatformAdmin(userId)
}
