import { describe, expect, it } from "vitest"

import {
  buildWhatsAppUrl,
  completedMessage,
  confirmationMessage,
  enRouteMessage,
  normalizePhone,
  type WhatsAppMessageContext,
} from "./whatsapp-link"

describe("normalizePhone", () => {
  it("antepone el indicativo a un móvil colombiano de 10 dígitos", () => {
    expect(normalizePhone("3001234567")).toBe("573001234567")
  })

  it("limpia espacios, guiones y el signo +", () => {
    expect(normalizePhone("+57 300 123 4567")).toBe("573001234567")
    expect(normalizePhone("300-123-4567")).toBe("573001234567")
  })

  it("respeta un número que ya trae indicativo", () => {
    expect(normalizePhone("573001234567")).toBe("573001234567")
  })

  it("devuelve null si no hay dígitos suficientes o está vacío", () => {
    expect(normalizePhone("123")).toBeNull()
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})

describe("buildWhatsAppUrl", () => {
  it("arma el enlace wa.me con el mensaje codificado", () => {
    const url = buildWhatsAppUrl("3001234567", "Hola mundo")
    expect(url).toBe("https://wa.me/573001234567?text=Hola%20mundo")
  })

  it("devuelve null si el teléfono no es utilizable", () => {
    expect(buildWhatsAppUrl(null, "x")).toBeNull()
    expect(buildWhatsAppUrl("abc", "x")).toBeNull()
  })
})

describe("mensajes al cliente", () => {
  const ctx: WhatsAppMessageContext = {
    technicianName: "Daniel Peláez",
    caseSubject: "HVAC — No enfría",
    workOrderNumber: "WO-2026-0021",
    whenText: "viernes 20 de junio, 3:30 p.m.",
    trackingUrl: "https://nexus.app/seguimiento/abc",
  }

  it("en camino menciona técnico, solicitud, orden y seguimiento", () => {
    const m = enRouteMessage(ctx)
    expect(m).toContain("Daniel Peláez va en camino")
    expect(m).toContain('"HVAC — No enfría"')
    expect(m).toContain("orden WO-2026-0021")
    expect(m).toContain("https://nexus.app/seguimiento/abc")
  })

  it("confirmación incluye el horario agendado", () => {
    expect(confirmationMessage(ctx)).toContain("viernes 20 de junio, 3:30 p.m.")
  })

  it("completado agradece y no incluye horario", () => {
    const m = completedMessage(ctx)
    expect(m).toContain("quedó completado")
    expect(m).not.toContain("3:30")
  })

  it("sin tracking ni orden, el mensaje sigue siendo válido", () => {
    const m = enRouteMessage({
      technicianName: null,
      caseSubject: "Fuga de agua",
      workOrderNumber: null,
      whenText: null,
      trackingUrl: null,
    })
    expect(m).toContain("Su técnico asignado va en camino")
    expect(m).not.toContain("orden")
    expect(m).not.toContain("Siga el estado")
  })
})
