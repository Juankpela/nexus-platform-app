/**
 * Generador de código QR autónomo (sin dependencias npm, sin servicio externo).
 * Port fiel y reducido del QR Code generator de Nayuki (dominio público / MIT),
 * recortado a lo que el panel necesita: modo BYTE (UTF-8), nivel de corrección
 * MEDIUM, selección automática de versión y salida como string SVG.
 *
 * Se vendoriza en lugar de añadir una dependencia para respetar el North Star
 * (usar capacidades existentes, sin nueva supply chain). La salida es un SVG con
 * rutas `data:`-compatibles → escaneable y descargable en cliente.
 */

// ── Reed–Solomon sobre GF(256) ────────────────────────────────────────────────

function reedSolomonComputeDivisor(degree: number): number[] {
  if (degree < 1 || degree > 255) throw new RangeError("degree out of range")
  // Coeficientes del polinomio generador, de mayor a menor grado (omitido el 1 líder).
  const result: number[] = []
  for (let i = 0; i < degree - 1; i++) result.push(0)
  result.push(1)
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = reedSolomonMultiply(root, 0x02)
  }
  return result
}

function reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    divisor.forEach((coef, i) => (result[i] ^= reedSolomonMultiply(coef, factor)))
  }
  return result
}

function reedSolomonMultiply(x: number, y: number): number {
  if (x >>> 8 !== 0 || y >>> 8 !== 0) throw new RangeError("byte out of range")
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

// ── Tablas del estándar QR (Nayuki) — índice [version], 0 = relleno ilegal ─────

// ECC nivel MEDIUM (el panel fija M: buen equilibrio robustez/tamaño para imprimir).
const ECC_CODEWORDS_PER_BLOCK = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26,
  26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
]
const NUM_ERROR_CORRECTION_BLOCKS = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17,
  18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
]
const ECC_FORMAT_BITS = 0 // bits de formato para nivel MEDIUM

const MIN_VERSION = 1
const MAX_VERSION = 40

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}

function getNumDataCodewords(ver: number): number {
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ver] * NUM_ERROR_CORRECTION_BLOCKS[ver]
  )
}

// ── Construcción de la matriz ─────────────────────────────────────────────────

class QrCode {
  readonly size: number
  private readonly modules: boolean[][] = []
  private readonly isFunction: boolean[][] = []

  constructor(readonly version: number, dataCodewords: number[]) {
    this.size = version * 4 + 17
    const row: boolean[] = []
    for (let i = 0; i < this.size; i++) row.push(false)
    for (let i = 0; i < this.size; i++) {
      this.modules.push(row.slice())
      this.isFunction.push(row.slice())
    }
    this.drawFunctionPatterns()
    const allCodewords = this.addEccAndInterleave(dataCodewords)
    this.drawCodewords(allCodewords)
    // Elegir la máscara con menor penalización.
    let minPenalty = Infinity
    let bestMask = 0
    for (let mask = 0; mask < 8; mask++) {
      this.applyMask(mask)
      this.drawFormatBits(mask)
      const penalty = this.getPenaltyScore()
      if (penalty < minPenalty) {
        bestMask = mask
        minPenalty = penalty
      }
      this.applyMask(mask) // deshacer
    }
    this.applyMask(bestMask)
    this.drawFormatBits(bestMask)
  }

  getModule(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x]
  }

  private setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y][x] = isDark
    this.isFunction[y][x] = true
  }

  private drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0)
      this.setFunctionModule(i, 6, i % 2 === 0)
    }
    this.drawFinderPattern(3, 3)
    this.drawFinderPattern(this.size - 4, 3)
    this.drawFinderPattern(3, this.size - 4)

    const alignPatPos = this.getAlignmentPatternPositions()
    const numAlign = alignPatPos.length
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (
          !(
            (i === 0 && j === 0) ||
            (i === 0 && j === numAlign - 1) ||
            (i === numAlign - 1 && j === 0)
          )
        ) {
          this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j])
        }
      }
    }

    this.drawFormatBits(0)
    this.drawVersion()
  }

  private drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412
    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i))
    this.setFunctionModule(8, 7, getBit(bits, 6))
    this.setFunctionModule(8, 8, getBit(bits, 7))
    this.setFunctionModule(7, 8, getBit(bits, 8))
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i))
    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i))
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i))
    this.setFunctionModule(8, this.size - 8, true)
  }

  private drawVersion(): void {
    if (this.version < 7) return
    let rem = this.version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (this.version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const color = getBit(bits, i)
      const a = this.size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      this.setFunctionModule(a, b, color)
      this.setFunctionModule(b, a, color)
    }
  }

  private drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4)
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }

  private getAlignmentPatternPositions(): number[] {
    if (this.version === 1) return []
    const numAlign = Math.floor(this.version / 7) + 2
    const step =
      this.version === 32
        ? 26
        : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2
    const result: number[] = [6]
    for (let pos = this.size - 7; result.length < numAlign; pos -= step) {
      result.splice(1, 0, pos)
    }
    return result
  }

  private addEccAndInterleave(data: number[]): number[] {
    const ver = this.version
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ver]
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ver]
    const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8)
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks)
    const shortBlockLen = Math.floor(rawCodewords / numBlocks)

    const blocks: number[][] = []
    const rsDiv = reedSolomonComputeDivisor(blockEccLen)
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1))
      k += dat.length
      const ecc = reedSolomonComputeRemainder(dat, rsDiv)
      if (i < numShortBlocks) dat.push(0)
      blocks.push(dat.concat(ecc))
    }

    const result: number[] = []
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((block, j) => {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i])
      })
    }
    return result
  }

  private drawCodewords(data: number[]): void {
    let i = 0
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? this.size - 1 - vert : vert
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7))
            i++
          }
        }
      }
    }
  }

  private applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break
          case 1: invert = y % 2 === 0; break
          case 2: invert = x % 3 === 0; break
          case 3: invert = (x + y) % 3 === 0; break
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break
          default: throw new Error("unreachable")
        }
        if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x]
      }
    }
  }

  private getPenaltyScore(): number {
    let result = 0
    const size = this.size
    const mods = this.modules

    // Filas/columnas con corridas largas del mismo color.
    for (let y = 0; y < size; y++) {
      let runColor = false
      let runX = 0
      const runHistory = [0, 0, 0, 0, 0, 0, 0]
      for (let x = 0; x < size; x++) {
        if (mods[y][x] === runColor) {
          runX++
          if (runX === 5) result += 3
          else if (runX > 5) result++
        } else {
          this.finderPenaltyAddHistory(runX, runHistory)
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * 40
          runColor = mods[y][x]
          runX = 1
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * 40
    }
    for (let x = 0; x < size; x++) {
      let runColor = false
      let runY = 0
      const runHistory = [0, 0, 0, 0, 0, 0, 0]
      for (let y = 0; y < size; y++) {
        if (mods[y][x] === runColor) {
          runY++
          if (runY === 5) result += 3
          else if (runY > 5) result++
        } else {
          this.finderPenaltyAddHistory(runY, runHistory)
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * 40
          runColor = mods[y][x]
          runY = 1
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * 40
    }

    // Bloques 2x2 del mismo color.
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = mods[y][x]
        if (
          color === mods[y][x + 1] &&
          color === mods[y + 1][x] &&
          color === mods[y + 1][x + 1]
        )
          result += 3
      }
    }

    // Balance de oscuros.
    let dark = 0
    for (const r of mods) for (const c of r) if (c) dark++
    const total = size * size
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
    result += k * 10
    return result
  }

  private finderPenaltyCountPatterns(runHistory: number[]): number {
    const n = runHistory[1]
    const core =
      n > 0 &&
      runHistory[2] === n &&
      runHistory[3] === n * 3 &&
      runHistory[4] === n &&
      runHistory[5] === n
    return (
      (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
      (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0)
    )
  }

  private finderPenaltyTerminateAndCount(
    currentRunColor: boolean,
    currentRunLength: number,
    runHistory: number[],
  ): number {
    if (currentRunColor) {
      this.finderPenaltyAddHistory(currentRunLength, runHistory)
      currentRunLength = 0
    }
    currentRunLength += this.size
    this.finderPenaltyAddHistory(currentRunLength, runHistory)
    return this.finderPenaltyCountPatterns(runHistory)
  }

  private finderPenaltyAddHistory(currentRunLength: number, runHistory: number[]): void {
    if (runHistory[0] === 0) currentRunLength += this.size
    runHistory.pop()
    runHistory.unshift(currentRunLength)
  }
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0
}

// ── Codificación de texto (modo BYTE / UTF-8) ─────────────────────────────────

function encodeText(text: string): QrCode {
  const utf8: number[] = Array.from(new TextEncoder().encode(text))

  // Elegir la versión más pequeña que albeste los datos en modo byte (nivel M).
  let version = MIN_VERSION
  let dataCapacityBits = 0
  for (; ; version++) {
    if (version > MAX_VERSION) throw new RangeError("Datos demasiado largos para un QR")
    dataCapacityBits = getNumDataCodewords(version) * 8
    const charCountBits = version < 10 ? 8 : 16
    const usedBits = 4 + charCountBits + utf8.length * 8
    if (usedBits <= dataCapacityBits) break
  }

  // Construir el bitstream: modo byte (0100) + cuenta + datos.
  const bb: number[] = []
  const appendBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1)
  }
  appendBits(0b0100, 4)
  appendBits(utf8.length, version < 10 ? 8 : 16)
  for (const b of utf8) appendBits(b, 8)

  // Terminador + padding a byte + bytes de relleno alternados.
  appendBits(0, Math.min(4, dataCapacityBits - bb.length))
  appendBits(0, (8 - (bb.length % 8)) % 8)
  for (let pad = 0xec; bb.length < dataCapacityBits; pad ^= 0xec ^ 0x11) appendBits(pad, 8)

  const dataCodewords: number[] = []
  for (let i = 0; i < bb.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb[i + j]
    dataCodewords.push(byte)
  }
  return new QrCode(version, dataCodewords)
}

// ── Salida SVG ────────────────────────────────────────────────────────────────

/**
 * Devuelve un string SVG (cuadrado, módulos negros sobre fondo blanco) para el
 * texto dado. `border` = módulos de zona tranquila. Listo para descargar como
 * archivo .svg o incrustar en un `<img src="data:image/svg+xml,...">`.
 */
/** Matriz de módulos (true = oscuro). Exportada para verificación en tests. */
export function qrMatrix(text: string): boolean[][] {
  const qr = encodeText(text)
  const m: boolean[][] = []
  for (let y = 0; y < qr.size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < qr.size; x++) row.push(qr.getModule(x, y))
    m.push(row)
  }
  return m
}

export function toQrSvg(text: string, border = 4): string {
  const qr = encodeText(text)
  const dim = qr.size + border * 2
  const parts: string[] = []
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y)) parts.push(`M${x + border},${y + border}h1v1h-1z`)
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${dim} ${dim}" stroke="none">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<path d="${parts.join(" ")}" fill="#000000"/>`,
    `</svg>`,
  ].join("\n")
}
