// REPARA la coherencia del escenario demo:
//  1) Crea work_order_executions faltantes:
//       · WO completed  → ejecución "completed" (aceptó→llegó→inició→completó)
//       · WO in_progress→ ejecución "working" (aceptó→llegó→inició)
//     Sin esto, el app del técnico ve la asignación como "pending" y muestra
//     "Aceptar asignación" en órdenes ya completadas (bug reportado).
//  2) Reemplaza títulos de seed ("(WO) …", "(INV) …", "Servicio completado — X #n",
//     "Jornada de hoy — X") por asuntos HVAC realistas (en casos y órdenes).
// Idempotente. Uso:
//   node scripts/repair-demo-data.mjs [slug] [envfile]
//   staging:  node scripts/repair-demo-data.mjs staging-test .env.local
//   prod:     node scripts/repair-demo-data.mjs demo-hvac .env.prod
import { readFileSync } from "node:fs"

const SLUG = (process.argv[2] ?? "staging-test").toLowerCase()
const ENVFILE = process.argv[3] ?? ".env.local"
const env = Object.fromEntries(readFileSync(ENVFILE, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")] }))
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error(`✗ ${ENVFILE} incompleto`); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
const q = async (p, o = {}) => { const r = await fetch(`${URL}/rest/v1/${p}`, { ...o, headers: { ...H, ...o.headers } }); const t = await r.text(); if (!r.ok) throw new Error(`${p} ${r.status} ${t}`); return t ? JSON.parse(t) : null }
const ins = (t, row) => q(`${t}`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) })
const upd = (t, f, patch) => { const qs = Object.entries(f).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&"); return q(`${t}?${qs}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) }) }
const minsBefore = (iso, m) => new Date(new Date(iso).getTime() - m * 60000).toISOString()

const POOL = [
  "Mantenimiento preventivo de aire acondicionado", "Reparación de unidad condensadora",
  "Cambio de filtros y limpieza de serpentín", "Recarga de gas refrigerante R-410A",
  "Revisión y ajuste de termostato", "Diagnóstico de falla de enfriamiento",
  "Mantenimiento de chiller", "Servicio a cuarto frío", "Ajuste de manejadora de aire",
  "Revisión eléctrica del equipo HVAC", "Limpieza de condensador en azotea",
  "Reemplazo de capacitor de compresor",
]
const isDebug = (s) => /^\(WO\)|^\(INV\)|^Servicio completado|^Jornada de hoy/.test(s ?? "")

const [tenant] = await q(`tenants?slug=eq.${SLUG}&select=id,name`)
if (!tenant) throw new Error(`Tenant "${SLUG}" no existe en ${ENVFILE}`)
const T = tenant.id
console.log(`Reparando "${tenant.name}" (${SLUG}) en ${ENVFILE}\n`)

// ── 1) Títulos realistas (órdenes + sus casos, en pareja) ─────────────────────
const wos = await q(`work_orders?tenant_id=eq.${T}&select=id,subject,case_id,status,actual_start,actual_end,scheduled_start,scheduled_end`)
let renamed = 0, p = 0
for (const wo of wos) {
  if (!isDebug(wo.subject)) continue
  const subject = POOL[p % POOL.length]; p++
  await upd("work_orders", { tenant_id: T, id: wo.id }, { subject })
  if (wo.case_id) await upd("cases", { tenant_id: T, id: wo.case_id }, { subject })
  wo.subject = subject
  renamed++
}
// Casos sueltos con título de seed (sin orden)
const cases = await q(`cases?tenant_id=eq.${T}&select=id,subject`)
for (const c of cases) {
  if (!isDebug(c.subject)) continue
  await upd("cases", { tenant_id: T, id: c.id }, { subject: POOL[p % POOL.length] }); p++; renamed++
}
console.log(`✓ ${renamed} títulos de seed → asuntos HVAC realistas`)

// ── 2) Ejecuciones faltantes (coherencia del flujo del técnico) ───────────────
const assigns = await q(`work_order_assignments?tenant_id=eq.${T}&select=id,work_order_id,technician_id`)
const execs = await q(`work_order_executions?tenant_id=eq.${T}&select=assignment_id`)
const hasExec = new Set(execs.map((e) => e.assignment_id))
const woById = new Map(wos.map((w) => [w.id, w]))
let made = 0
for (const a of assigns) {
  if (hasExec.has(a.id)) continue
  const wo = woById.get(a.work_order_id)
  if (!wo) continue
  if (wo.status === "completed") {
    const end = wo.actual_end ?? wo.scheduled_end ?? new Date().toISOString()
    const start = wo.actual_start ?? wo.scheduled_start ?? minsBefore(end, 120)
    await ins("work_order_executions", {
      tenant_id: T, assignment_id: a.id, work_order_id: wo.id, technician_id: a.technician_id,
      status: "completed", accepted_at: minsBefore(start, 40), arrived_at: minsBefore(start, 10),
      started_at: start, completed_at: end, resolution_notes: "Servicio ejecutado y verificado.",
    })
    made++
  } else if (wo.status === "in_progress") {
    const start = wo.scheduled_start ?? new Date().toISOString()
    await ins("work_order_executions", {
      tenant_id: T, assignment_id: a.id, work_order_id: wo.id, technician_id: a.technician_id,
      status: "working", accepted_at: minsBefore(start, 40), arrived_at: minsBefore(start, 10), started_at: start,
    })
    made++
  }
}
console.log(`✓ ${made} ejecuciones creadas (completadas/en curso) → el técnico ya no ve "aceptar" en órdenes hechas`)
console.log("\n✓ Reparación lista. Recarga la app.")
