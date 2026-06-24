import { describe, expect, it } from "vitest"

import { buildCustomerNotifyActions } from "@/modules/notifications/domain/customer-notify-plan"
import {
  buildServiceLifecycle,
  type ServiceLifecycleInput,
} from "@/modules/service/domain/service-lifecycle"
import type { WhatsAppMessageContext } from "@/modules/notifications/domain/whatsapp-link"

const baseInput: ServiceLifecycleInput = {
  reportedAt: "2026-06-23T10:00:00Z",
  coordinatedAt: null,
  technicianName: "Diego Torres",
  scheduledStart: null,
  acceptedAt: null,
  enRouteAt: null,
  arrivedAt: null,
  startedAt: null,
  completedAt: null,
  unableAt: null,
  unableReason: null,
  invoiceIssuedAt: null,
  paidAt: null,
}

const ctx: WhatsAppMessageContext = {
  technicianName: "Diego Torres",
  caseSubject: "Falla de red",
  workOrderNumber: "WO-2026-0006",
  whenText: "mar 23 de jun",
  trackingUrl: null,
}

const PHONE = "3017099122" // móvil CO válido (normaliza a 57…)

const plan = (input: Partial<ServiceLifecycleInput>, phone: string | null = PHONE) =>
  buildCustomerNotifyActions(
    buildServiceLifecycle({ ...baseInput, ...input }),
    ctx,
    phone,
  )

const phaseOf = (
  actions: ReturnType<typeof buildCustomerNotifyActions>,
  label: string,
) => actions.find((a) => a.label === label)!.phase

describe("buildCustomerNotifyActions", () => {
  it("expone los 4 avisos en orden de operación", () => {
    expect(plan({}).map((a) => a.label)).toEqual([
      "Confirmar visita",
      "Voy en camino",
      "Llegué al sitio",
      "Trabajo completado",
    ])
  })

  it("con el técnico recién asignado (a punto de aceptar), el actual es 'Confirmar visita' y 'Voy en camino' queda futuro", () => {
    const actions = plan({ coordinatedAt: "2026-06-23T10:32:00Z" })
    expect(phaseOf(actions, "Confirmar visita")).toBe("current")
    expect(phaseOf(actions, "Voy en camino")).toBe("future")
    // El futuro no es clicable (sin enlace) pero sí trae el motivo.
    const enRoute = actions.find((a) => a.label === "Voy en camino")!
    expect(enRoute.url).toBeNull()
    expect(enRoute.hint).toBeTruthy()
  })

  it("cuando el técnico ya aceptó, el actual avanza a 'Voy en camino'", () => {
    const actions = plan({
      coordinatedAt: "2026-06-23T10:32:00Z",
      acceptedAt: "2026-06-23T10:40:00Z",
    })
    expect(phaseOf(actions, "Confirmar visita")).toBe("past")
    expect(phaseOf(actions, "Voy en camino")).toBe("current")
    expect(phaseOf(actions, "Llegué al sitio")).toBe("future")
    // El pasado sigue disponible para reenviar (con enlace).
    expect(actions.find((a) => a.label === "Confirmar visita")!.url).not.toBeNull()
  })

  it("tras avisar 'voy en camino', el resaltado pasa a 'Llegué al sitio'", () => {
    const actions = plan({
      coordinatedAt: "2026-06-23T10:32:00Z",
      acceptedAt: "2026-06-23T10:40:00Z",
      enRouteAt: "2026-06-23T11:00:00Z",
    })
    expect(phaseOf(actions, "Voy en camino")).toBe("past")
    expect(phaseOf(actions, "Llegué al sitio")).toBe("current")
    expect(phaseOf(actions, "Trabajo completado")).toBe("future")
  })

  it("con el trabajo completado, el actual es 'Trabajo completado' y los demás quedan reenviables", () => {
    const actions = plan({
      coordinatedAt: "2026-06-23T10:32:00Z",
      acceptedAt: "2026-06-23T10:40:00Z",
      enRouteAt: "2026-06-23T11:00:00Z",
      arrivedAt: "2026-06-23T11:30:00Z",
      startedAt: "2026-06-23T11:35:00Z",
      completedAt: "2026-06-23T12:30:00Z",
    })
    expect(phaseOf(actions, "Trabajo completado")).toBe("current")
    expect(actions.filter((a) => a.phase === "past")).toHaveLength(3)
    expect(actions.every((a) => a.url !== null)).toBe(true)
  })

  it("sin teléfono utilizable, ningún aviso lleva enlace pero las fases se conservan", () => {
    const actions = plan({ coordinatedAt: "2026-06-23T10:32:00Z" }, null)
    expect(actions.every((a) => a.url === null)).toBe(true)
    expect(phaseOf(actions, "Confirmar visita")).toBe("current")
  })

  it("sin línea de vida (lista vacía) cae al primer aviso", () => {
    const actions = buildCustomerNotifyActions([], ctx, PHONE)
    expect(phaseOf(actions, "Confirmar visita")).toBe("current")
  })
})
