import { notFound } from "next/navigation"

import { isFeatureEnabled } from "@/modules/feature-flags/domain/feature"

export function requireFeature(enabledFeatures: readonly string[], feature: string) {
  if (!isFeatureEnabled(enabledFeatures, feature)) {
    notFound()
  }
}
