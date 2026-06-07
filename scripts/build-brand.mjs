// Genera los assets de marca de Nexus a partir de SVG vectorial.
//   - public/brand/nexus-logo.svg        (vector, fuente de verdad — claro)
//   - public/brand/nexus-logo.png        (lockup, fondo transparente, para claro)
//   - public/brand/nexus-logo-dark.png   (lockup, texto claro, para oscuro)
//   - public/brand/nexus-icon.png        (solo el monograma N)
//   - public/brand/nexus-icon-dark.png   (solo el monograma N)
//
// Uso: node scripts/build-brand.mjs

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(ROOT, "public", "brand")

// ── Paleta oficial de marca NEXUS ────────────────────────────────────────────
const NAVY = "#0B1020" // Nexus Midnight (wordmark sobre claro)
const WHITE = "#F8FAFC" // wordmark sobre oscuro
const BLUE = "#2563EB" // Nexus Blue
const GREEN = "#10B981" // Nexus Emerald
const ORANGE = "#F97316" // Nexus Orange
const GRAY = "#64748B" // Nexus Silver

// Monograma "N": pierna izquierda (azul/naranja), diagonal gris, pierna derecha
// (verde). La diagonal se dibuja primero; las piernas la tapan dejando ver la
// banda gris en el centro, formando la N.
function iconInner() {
  return `
    <polygon points="20,18 44,18 100,102 76,102" fill="${GRAY}"/>
    <polygon points="20,18 44,18 44,60 20,60" fill="${BLUE}"/>
    <polygon points="20,60 44,60 44,102 20,102" fill="${ORANGE}"/>
    <polygon points="76,18 100,18 100,102 76,102" fill="${GREEN}"/>`
}

const FONT =
  "Segoe UI, Arial, 'Helvetica Neue', Helvetica, sans-serif"

function logoSvg(textColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="560" height="170">
  <g transform="translate(8,25)">${iconInner()}</g>
  <text x="170" y="98" font-family="${FONT}" font-size="74" font-weight="800" letter-spacing="2" fill="${textColor}">NEXUS</text>
  <text x="173" y="132" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="0.4">
    <tspan fill="${BLUE}">Where&#160;</tspan><tspan fill="${ORANGE}">Operations&#160;</tspan><tspan fill="${GREEN}">Connect.</tspan>
  </text>
</svg>`
}

function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${iconInner()}
</svg>`
}

async function toPng(svg, file, width) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize({ width })
    .png()
    .toFile(join(OUT, file))
  console.log(`  ✓ ${file}`)
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  // Vector fuente (claro)
  writeFileSync(join(OUT, "nexus-logo.svg"), logoSvg(NAVY))
  console.log("  ✓ nexus-logo.svg")

  await toPng(logoSvg(NAVY), "nexus-logo.png", 1120)
  await toPng(logoSvg(WHITE), "nexus-logo-dark.png", 1120)
  await toPng(iconSvg(), "nexus-icon.png", 512)
  await toPng(iconSvg(), "nexus-icon-dark.png", 512)

  console.log("\nListo. Assets en public/brand/")
}

main().catch((error) => {
  console.error("Error generando marca:", error)
  process.exit(1)
})
