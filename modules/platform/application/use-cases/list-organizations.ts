import type { PlatformRepository } from "@/modules/platform/application/ports/platform-repository"

export function listOrganizations(platform: PlatformRepository) {
  return platform.listOrganizations()
}
