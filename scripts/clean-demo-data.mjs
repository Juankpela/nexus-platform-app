// Higiene de datos para demo: cierra casos de prueba/QA de hitos anteriores y
// cancela sus órdenes de trabajo, para que las pantallas muestren solo el
// dataset de industria + el escenario Northgate. NO borra nada (solo cambia
// estado → reversible). Idempotente: re-ejecutar no hace daño.
//
// Uso: node scripts/clean-demo-data.mjs [tenantSlug]   (default huella-global)

import { readFileSync } from "node:fs"

function loadEnv(path) {
  const env = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[k] = v
  }
  return env
}

const env = loadEnv(".env.local")
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const slug = (process.argv[2] ?? "huella-global").toLowerCase()
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

// Casos de prueba/QA a cerrar (no son datos de industria ni Northgate).
const TEST_CASES = [
  "CASE-2026-0014", // QA Fase 1 GPS - reporte de prueba
  "CASE-2026-0015", // QA Fase 2 foto - reporte de prueba
  "CASE-2026-0016", // Eléctrico: tengo un daño
  "CASE-2026-0017", // Plomería: fuga en baño piso 2 (prueba)
  "CASE-2026-0018", // Plomería: fuga en cocina (Hito D)
  "CASE-2026-0019", // Eléctrico: Prueba PVAHOS
]
const TEST_WORK_ORDERS = [
  "WO-2026-0022", // Plomería: fuga en baño piso 2
  "WO-2026-0023", // Plomería: fuga en cocina (Hito D)
]

async function patch(table, col, value, tenantId, patchBody) {
  const url = `${URL}/rest/v1/${table}?tenant_id=eq.${tenantId}&${col}=eq.${encodeURIComponent(value)}`
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(patchBody),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  const rows = text ? JSON.parse(text) : []
  return rows.length
}

async function main() {
  const tRows = await fetch(
    `${URL}/rest/v1/tenants?slug=eq.${slug}&select=id&limit=1`,
    { headers: H },
  ).then((r) => r.json())
  if (!tRows.length) {
    console.error(`Tenant "${slug}" no existe.`)
    process.exit(1)
  }
  const tenantId = tRows[0].id
  console.log(`Limpieza de datos demo en "${slug}"...\n`)

  let closed = 0
  for (const cn of TEST_CASES) {
    const n = await patch("cases", "case_number", cn, tenantId, { status: "closed" })
    if (n) {
      closed += n
      console.log(`  caso cerrado: ${cn}`)
    }
  }
  let cancelled = 0
  let execsClosed = 0
  for (const wn of TEST_WORK_ORDERS) {
    const n = await patch("work_orders", "work_order_number", wn, tenantId, { status: "cancelled" })
    if (n) {
      cancelled += n
      console.log(`  WO cancelada: ${wn}`)
    }
    // La WO cancelada puede tener una ejecución aún "activa" (accepted/on_site/
    // working) que el monitor de campo seguiría mostrando. La cerramos para que
    // no fugue a "Operaciones activas".
    const woRows = await fetch(
      `${URL}/rest/v1/work_orders?tenant_id=eq.${tenantId}&work_order_number=eq.${encodeURIComponent(wn)}&select=id`,
      { headers: H },
    ).then((r) => r.json())
    for (const wo of woRows) {
      const url = `${URL}/rest/v1/work_order_executions?tenant_id=eq.${tenantId}&work_order_id=eq.${wo.id}&status=in.(accepted,on_site,working)`
      const res = await fetch(url, {
        method: "PATCH",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ status: "unable_to_complete" }),
      })
      const txt = await res.text()
      if (res.ok && txt) {
        const rows = JSON.parse(txt)
        if (rows.length) {
          execsClosed += rows.length
          console.log(`  ejecución neutralizada de ${wn}`)
        }
      }
    }
  }

  console.log(
    `\n✓ Listo. ${closed} caso(s) cerrado(s), ${cancelled} WO cancelada(s), ${execsClosed} ejecución(es) cerrada(s).`,
  )
  console.log(`  Reversible: reabre con un cambio de estado si los necesitas.`)
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message ?? e)
  process.exit(1)
})
