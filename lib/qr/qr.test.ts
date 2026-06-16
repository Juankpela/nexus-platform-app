import { describe, expect, it } from "vitest"

import { qrMatrix, toQrSvg } from "./qr"

describe("qr generator", () => {
  it("produce un SVG con viewBox cuadrado y módulos", () => {
    const svg = toQrSvg("https://nexus.app/r/huella-global")
    expect(svg).toContain("<svg")
    expect(svg).toMatch(/viewBox="0 0 (\d+) \1"/)
    expect(svg).toContain('fill="#000000"')
  })

  it("matriz cuadrada con los tres finder patterns 7x7", () => {
    const m = qrMatrix("https://nexus.app/r/huella-global")
    expect(m.length).toBe(m[0].length)
    const isFinder = (oy: number, ox: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const ring = y === 0 || y === 6 || x === 0 || x === 6
          const core = y >= 2 && y <= 4 && x >= 2 && x <= 4
          if (m[oy + y][ox + x] !== (ring || core)) return false
        }
      return true
    }
    const n = m.length
    expect(isFinder(0, 0)).toBe(true)
    expect(isFinder(0, n - 7)).toBe(true)
    expect(isFinder(n - 7, 0)).toBe(true)
  })

  // Verificación independiente: decodifica el QR con jsqr (instalado --no-save
  // solo para esta corrida; el import es opcional para no romper CI).
  it("decodifica de vuelta al texto original (jsqr)", async () => {
    let jsQR: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null
    try {
      const mod = await import("jsqr")
      jsQR = (mod.default ?? mod) as typeof jsQR
    } catch {
      // jsqr no disponible (CI normal) → omitir.
    }
    if (!jsQR) return

    const text = "https://nexus-platform-app-rouge.vercel.app/r/huella-global"
    const m = qrMatrix(text)
    const border = 4
    const scale = 6
    const mods = m.length
    const dim = (mods + border * 2) * scale
    const rgba = new Uint8ClampedArray(dim * dim * 4)
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 255
      rgba[i + 3] = 255
    }
    for (let y = 0; y < mods; y++) {
      for (let x = 0; x < mods; x++) {
        if (!m[y][x]) continue
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = (x + border) * scale + dx
            const py = (y + border) * scale + dy
            const o = (py * dim + px) * 4
            rgba[o] = rgba[o + 1] = rgba[o + 2] = 0
          }
        }
      }
    }
    const result = jsQR(rgba, dim, dim)
    expect(result?.data).toBe(text)
  })
})
