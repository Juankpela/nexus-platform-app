import { describe, expect, it } from "vitest"

import { buildEta, etaIfCurrent, parseDirectionsResult, type Eta } from "./eta"

describe("parseDirectionsResult", () => {
  it("extrae duración (min) y distancia (m) del primer leg", () => {
    const r = parseDirectionsResult({
      status: "OK",
      routes: [{ legs: [{ duration: { value: 1080 }, distance: { value: 8200 } }] }],
    })
    expect(r).toEqual({ durationMinutes: 18, distanceM: 8200 })
  })

  it("prefiere duration_in_traffic cuando está presente", () => {
    const r = parseDirectionsResult({
      status: "OK",
      routes: [
        {
          legs: [
            {
              duration: { value: 600 }, // 10 min sin tráfico
              duration_in_traffic: { value: 1500 }, // 25 min con tráfico
              distance: { value: 5000 },
            },
          ],
        },
      ],
    })
    expect(r).toEqual({ durationMinutes: 25, distanceM: 5000 })
  })

  it("devuelve null con ZERO_RESULTS / status no OK / vacío", () => {
    expect(parseDirectionsResult({ status: "ZERO_RESULTS", routes: [] })).toBeNull()
    expect(parseDirectionsResult({ routes: [{ legs: [{ distance: { value: 1 } }] }] })).toBeNull()
    expect(parseDirectionsResult(null)).toBeNull()
  })
})

describe("buildEta", () => {
  it("arrivalAt = computedAt + durationMinutes", () => {
    const eta = buildEta({ durationMinutes: 18, distanceM: 8200 }, "2026-06-22T14:00:00.000Z")
    expect(eta.durationMinutes).toBe(18)
    expect(eta.arrivalAt).toBe("2026-06-22T14:18:00.000Z")
    expect(eta.computedAt).toBe("2026-06-22T14:00:00.000Z")
    expect(eta.distanceM).toBe(8200)
    expect(eta.source).toBe("google_directions")
  })
})

describe("etaIfCurrent", () => {
  const eta: Eta = {
    durationMinutes: 18,
    arrivalAt: "2026-06-22T14:18:00.000Z",
    computedAt: "2026-06-22T14:00:00.000Z",
    distanceM: 8200,
    source: "google_directions",
  }
  it("muestra el ETA si la llegada aún no ha pasado", () => {
    expect(etaIfCurrent(eta, "2026-06-22T14:05:00.000Z")).toEqual(eta)
  })
  it("oculta el ETA (null) si arrivalAt ya pasó", () => {
    expect(etaIfCurrent(eta, "2026-06-22T14:30:00.000Z")).toBeNull()
  })
  it("null entra → null sale", () => {
    expect(etaIfCurrent(null, "2026-06-22T14:00:00.000Z")).toBeNull()
  })
})
