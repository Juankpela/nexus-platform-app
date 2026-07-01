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

  it("groups every nav page under its commercial capability", () => {
    // Clientes vive bajo la capacidad CRM (navegación por capacidades, PRODUCT-004).
    expect(labels(`/app/${T}/companies`)).toEqual(["Inicio", "CRM", "Clientes"])
  })

  it("adds a Detalle crumb and links the list on a detail page", () => {
    const crumbs = buildBreadcrumbs(`/app/${T}/work-orders/123`, T)
    expect(crumbs.map((c) => c.label)).toEqual([
      "Inicio",
      "Operaciones",
      "Órdenes de trabajo",
      "Detalle",
    ])
    // El crumb de la lista (índice 2, después del grupo) enlaza de vuelta.
    expect(crumbs[2].href).toBe(`/app/${T}/work-orders`)
  })

  it("classifies Service segments under Operaciones", () => {
    expect(labels(`/app/${T}/cases`)).toEqual(["Inicio", "Operaciones", "Solicitudes"])
    expect(labels(`/app/${T}/assets`)).toEqual(["Inicio", "Operaciones", "Equipos"])
  })

  it("classifies the manual dispatch board under Operaciones", () => {
    expect(labels(`/app/${T}/dispatch`)).toEqual([
      "Inicio",
      "Operaciones",
      "Despacho",
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
