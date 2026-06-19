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

  it("shows just the item for a pinned (ungrouped) Golden Path page", () => {
    // Clientes is a primary, ungrouped item → no group crumb in between.
    expect(labels(`/app/${T}/companies`)).toEqual(["Inicio", "Clientes"])
  })

  it("adds a Detalle crumb and links the list on a detail page", () => {
    const crumbs = buildBreadcrumbs(`/app/${T}/work-orders/123`, T)
    expect(crumbs.map((c) => c.label)).toEqual(["Inicio", "Trabajo", "Detalle"])
    // Trabajo is ungrouped, so the list-linked crumb sits at index 1.
    expect(crumbs[1].href).toBe(`/app/${T}/work-orders`)
  })

  it("classifies Service segments by process group", () => {
    // Solicitudes (cases) is a pinned Golden Path item → ungrouped.
    expect(labels(`/app/${T}/cases`)).toEqual(["Inicio", "Solicitudes"])
    // Activos lives under the Service process group.
    expect(labels(`/app/${T}/assets`)).toEqual(["Inicio", "Servicio y campo", "Activos"])
  })

  it("classifies the manual dispatch board under its process group", () => {
    expect(labels(`/app/${T}/dispatch`)).toEqual([
      "Inicio",
      "Servicio y campo",
      "Tablero",
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
