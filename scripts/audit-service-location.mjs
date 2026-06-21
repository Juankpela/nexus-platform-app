// SOLO LECTURA — Diagnóstico de cobertura del DESTINO del servicio (ETA Fase 2).
// No escribe nada. Mide dónde vive realmente la dirección del servicio para decidir
// entre "derivar ubicación" vs "Service Location de primera clase".
//
// Clasificación de cada case por su `description` (única vía donde el intake guarda
// la ubicación, como texto libre "Dónde: ..."):
//   - GPS parseable : la descripción contiene coords (URL Maps ?q=lat,lng)
//   - Texto libre   : tiene línea "Dónde:" con texto pero SIN coords
//   - Sin ubicación : ni coords ni "Dónde:" con contenido
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) throw new Error("Faltan envs (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")

async function q(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

// Coordenadas dentro del texto: ?q=lat,lng (lo que arma public-report-form al
// pulsar "usar mi ubicación") o cualquier par lat,lng en una URL de maps.
const COORD_RE = /[?&]q=(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/i
const DONDE_RE = /D[oó]nde:\s*(.+)/i

function classify(description) {
  const text = (description || "").trim()
  if (!text) return "none"
  if (COORD_RE.test(text)) return "gps"
  const m = DONDE_RE.exec(text)
  if (m) {
    // "Dónde:" con algo más que una URL vacía → texto libre útil.
    const after = m[1].trim()
    if (after.length > 0) return "free"
  }
  return "none"
}

function pct(n, total) {
  if (!total) return "0%"
  return `${((n / total) * 100).toFixed(1)}%`
}

const tenants = await q("tenants?select=id,name,slug&order=name")

const grand = { cases: 0, gps: 0, free: 0, none: 0, wo: 0, woAsset: 0, assets: 0, assetsLoc: 0 }
const perTenant = []

for (const t of tenants) {
  const cases = await q(`cases?tenant_id=eq.${t.id}&select=description&limit=10000`)
  const wos = await q(`work_orders?tenant_id=eq.${t.id}&select=asset_id&limit=10000`)
  const assets = await q(`assets?tenant_id=eq.${t.id}&select=location&limit=10000`)
  if (cases.length === 0 && wos.length === 0 && assets.length === 0) continue

  const row = { name: t.name, slug: t.slug, cases: cases.length, gps: 0, free: 0, none: 0 }
  for (const c of cases) {
    const k = classify(c.description)
    row[k === "gps" ? "gps" : k === "free" ? "free" : "none"]++
  }
  row.wo = wos.length
  row.woAsset = wos.filter((w) => w.asset_id).length
  row.assets = assets.length
  row.assetsLoc = assets.filter((a) => (a.location || "").trim().length > 0).length

  perTenant.push(row)
  for (const k of Object.keys(grand)) grand[k] += row[k] ?? 0
}

console.log("\n=== COBERTURA DEL DESTINO DEL SERVICIO (read-only) ===\n")
console.log("GLOBAL (todos los tenants)")
console.log("┌─────────────────────────────┬──────────┬─────────┐")
console.log("│ Métrica                     │ Cantidad │ %       │")
console.log("├─────────────────────────────┼──────────┼─────────┤")
const rows = [
  ["Cases totales", grand.cases, "100%"],
  ["GPS parseable", grand.gps, pct(grand.gps, grand.cases)],
  ["Texto libre", grand.free, pct(grand.free, grand.cases)],
  ["Sin ubicación", grand.none, pct(grand.none, grand.cases)],
  ["WO totales", grand.wo, "100%"],
  ["WO con asset", grand.woAsset, pct(grand.woAsset, grand.wo)],
  ["Assets totales", grand.assets, "100%"],
  ["Assets con location", grand.assetsLoc, pct(grand.assetsLoc, grand.assets)],
]
for (const [m, c, p] of rows) {
  console.log(`│ ${m.padEnd(27)} │ ${String(c).padStart(8)} │ ${String(p).padStart(7)} │`)
}
console.log("└─────────────────────────────┴──────────┴─────────┘")

console.log("\nPor tenant:")
for (const r of perTenant) {
  console.log(
    `\n• ${r.name} (${r.slug})` +
      `\n   cases=${r.cases}  gps=${r.gps} (${pct(r.gps, r.cases)})  ` +
      `free=${r.free} (${pct(r.free, r.cases)})  none=${r.none} (${pct(r.none, r.cases)})` +
      `\n   WO=${r.wo}  con_asset=${r.woAsset} (${pct(r.woAsset, r.wo)})  ` +
      `assets=${r.assets}  con_location=${r.assetsLoc} (${pct(r.assetsLoc, r.assets)})`,
  )
}
console.log("")
