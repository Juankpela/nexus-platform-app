import { describe, expect, it } from "vitest"

import { buildBreadcrumbs } from "@/modules/platform/presentation/breadcrumbs"

const T = "acme"
const labels = (p: string) => buildBreadcrumbs(p, T).map((c) => c.label)

describe("buildBreadcrumbs", () => {
  it("roots everything at Inicio", () => {
    expect(buildBreadcrumbs(`/app/${T}/companies`, T)[0]).toEqual({
      label: "Inicio",
      href: `/app/${T}/dashboard`,
    })
  })

  it("shows group + item for a CRM list page", () => {
    expect(labels(`/app/${T}/companies`)).toEqual(["Inicio", "CRM", "Companies"])
  })

  it("adds a Detalle crumb and links the list on a detail page", () => {
    const crumbs = buildBreadcrumbs(`/app/${T}/work-orders/123`, T)
    expect(crumbs.map((c) => c.label)).toEqual([
      "Inicio",
      "Field Service",
      "Work Orders",
      "Detalle",
    ])
    // Work Orders crumb links back to the list.
    expect(crumbs[2].href).toBe(`/app/${T}/work-orders`)
  })

  it("classifies Service segments", () => {
    expect(labels(`/app/${T}/cases`)).toEqual(["Inicio", "Service", "Cases"])
    expect(labels(`/app/${T}/assets`)).toEqual(["Inicio", "Service", "Assets"])
  })

  it("classifies Field Service segments", () => {
    expect(labels(`/app/${T}/dispatch`)).toEqual([
      "Inicio",
      "Field Service",
      "Dispatch",
    ])
  })

  it("handles specialized dashboards", () => {
    expect(labels(`/app/${T}/dashboard`)).toEqual(["Inicio"])
    expect(labels(`/app/${T}/dashboard/crm`)).toEqual(["Inicio", "Dashboard CRM"])
    expect(labels(`/app/${T}/dashboard/field-service`)).toEqual([
      "Inicio",
      "Dashboard Field Service",
    ])
  })

  it("falls back to Inicio for unknown segments", () => {
    expect(labels(`/app/${T}/nope`)).toEqual(["Inicio"])
  })
})
