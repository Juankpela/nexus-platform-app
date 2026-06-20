import { describe, expect, it } from "vitest"

import { isTechnicianOnly, landingPathFor } from "./role"

describe("isTechnicianOnly", () => {
  it("es true cuando el único rol es técnico", () => {
    expect(isTechnicianOnly(["technician"])).toBe(true)
  })

  it("es false con roles de back-office, aunque también sea técnico", () => {
    expect(isTechnicianOnly(["technician", "supervisor"])).toBe(false)
    expect(isTechnicianOnly(["tenant_admin"])).toBe(false)
    expect(isTechnicianOnly(["supervisor", "technician"])).toBe(false)
  })

  it("es false sin roles (no asume nada)", () => {
    expect(isTechnicianOnly([])).toBe(false)
  })
})

describe("landingPathFor", () => {
  it("manda al técnico puro a su móvil de campo", () => {
    expect(landingPathFor("oracle", ["technician"])).toBe("/app/oracle/worker")
  })

  it("manda a cualquier rol de back-office al Centro Operacional", () => {
    expect(landingPathFor("oracle", ["supervisor"])).toBe("/app/oracle/dashboard")
    expect(landingPathFor("oracle", ["technician", "tenant_admin"])).toBe("/app/oracle/dashboard")
    expect(landingPathFor("oracle", [])).toBe("/app/oracle/dashboard")
  })
})
