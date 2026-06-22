import { describe, expect, it } from "vitest"

import { looksLikeServiceAddress, parseGeocodeResult } from "./geocode"

describe("looksLikeServiceAddress", () => {
  it("acepta direcciones reales con número", () => {
    for (const addr of [
      "Cra 43A #5-15 Medellín",
      "Calle 100 #8A-20 Bogotá",
      "Autopista Medellín Km 7 Copacabana",
      "Carrera 50 45-20 Medellín",
    ]) {
      expect(looksLikeServiceAddress(addr), addr).toBe(true)
    }
  })

  it("rechaza texto que no es una dirección física", () => {
    for (const t of [
      "Bodega principal",
      "Oficina",
      "Planta",
      "Sede norte",
      "Recepción",
      "Almacén",
      "Casa",
      "Edificio",
    ]) {
      expect(looksLikeServiceAddress(t), t).toBe(false)
    }
  })

  it("rechaza vacío o basura mínima", () => {
    expect(looksLikeServiceAddress("")).toBe(false)
    expect(looksLikeServiceAddress("  ")).toBe(false)
    expect(looksLikeServiceAddress("a 1")).toBe(false) // < 6 chars
  })
})

describe("parseGeocodeResult", () => {
  it("extrae lat/lng/formatted del primer resultado cuando status=OK", () => {
    const r = parseGeocodeResult({
      status: "OK",
      results: [
        {
          formatted_address: "Cra. 43a #5-15, El Poblado, Medellín, Antioquia, Colombia",
          geometry: { location: { lat: 6.2086, lng: -75.5659 } },
        },
        { formatted_address: "otro", geometry: { location: { lat: 0, lng: 0 } } },
      ],
    })
    expect(r).toEqual({
      lat: 6.2086,
      lng: -75.5659,
      formattedAddress: "Cra. 43a #5-15, El Poblado, Medellín, Antioquia, Colombia",
    })
  })

  it("devuelve null con ZERO_RESULTS", () => {
    expect(parseGeocodeResult({ status: "ZERO_RESULTS", results: [] })).toBeNull()
  })

  it("devuelve null cuando falta el status OK", () => {
    expect(
      parseGeocodeResult({ results: [{ geometry: { location: { lat: 1, lng: 1 } } }] }),
    ).toBeNull()
  })

  it("devuelve null si las coordenadas están fuera de rango", () => {
    expect(
      parseGeocodeResult({ status: "OK", results: [{ geometry: { location: { lat: 200, lng: 0 } } }] }),
    ).toBeNull()
  })

  it("tolera formatted_address ausente (cadena vacía)", () => {
    const r = parseGeocodeResult({
      status: "OK",
      results: [{ geometry: { location: { lat: 4.65, lng: -74.06 } } }],
    })
    expect(r).toEqual({ lat: 4.65, lng: -74.06, formattedAddress: "" })
  })

  it("devuelve null con entrada nula o basura", () => {
    expect(parseGeocodeResult(null)).toBeNull()
    expect(parseGeocodeResult({ status: "OK" })).toBeNull()
  })
})
