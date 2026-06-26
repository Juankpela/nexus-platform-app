import {
  capabilityLabel,
  workspaceNavigation,
} from "@/modules/platform/presentation/navigation"

export type Breadcrumb = {
  label: string
  /** Absolute href, or null for non-navigable crumbs (capability / detail). */
  href: string | null
}

/** segment → { label, capability label } registry derived from the nav definition. */
const SEGMENT_REGISTRY: Record<string, { label: string; group?: string }> =
  Object.fromEntries(
    workspaceNavigation.map((item) => [
      item.segment,
      { label: item.label, group: capabilityLabel(item.capability) },
    ]),
  )

/** Labels for the specialized dashboard sub-routes. */
const DASHBOARD_AREA_LABELS: Record<string, string> = {
  crm: "CRM",
  service: "Service",
  "field-service": "Field Service",
}

/**
 * Pure breadcrumb builder. Given an app pathname like
 * `/app/acme/companies/123`, returns the product-oriented trail:
 *   [ {CRM}, {Companies → /app/acme/companies}, {Detalle} ]
 * Always rooted at a Home crumb pointing to the tenant dashboard.
 */
export function buildBreadcrumbs(
  pathname: string,
  tenantSlug: string,
): Breadcrumb[] {
  const base = `/app/${tenantSlug}`
  const home: Breadcrumb = { label: "Inicio", href: `${base}/dashboard` }

  const prefix = `${base}/`
  if (!pathname.startsWith(prefix)) return [home]

  const segments = pathname.slice(prefix.length).split("/").filter(Boolean)
  if (segments.length === 0) return [home]

  const [first, second] = segments

  // Specialized dashboards: /dashboard, /dashboard/crm, ...
  if (first === "dashboard") {
    if (!second) return [{ label: "Inicio", href: null }]
    const area = DASHBOARD_AREA_LABELS[second]
    return [
      home,
      { label: area ? `Dashboard ${area}` : "Dashboard", href: null },
    ]
  }

  const entry = SEGMENT_REGISTRY[first]
  if (!entry) return [home]

  const crumbs: Breadcrumb[] = [home]
  if (entry.group) crumbs.push({ label: entry.group, href: null })
  crumbs.push({
    label: entry.label,
    // The list page is navigable; on a detail page it links back to the list.
    href: segments.length > 1 ? `${base}/${first}` : null,
  })
  // Detail / nested page.
  if (segments.length > 1) crumbs.push({ label: "Detalle", href: null })

  return crumbs
}
