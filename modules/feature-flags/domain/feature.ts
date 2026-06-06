export const FEATURES = {
  foundation: "foundation",
  crm: "crm",
  sales: "sales",
  service: "service",
  customerPortal: "customer_portal",
  fieldService: "field_service",
  ai: "ai",
} as const

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES]

export function isFeatureEnabled(features: readonly string[], feature: string) {
  return features.includes(feature)
}
