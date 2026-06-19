// Consolida el técnico "Daniel" duplicado en la cuenta CON login (decisión del
// founder). Idempotente. Imprime BACKUP antes de mutar (para rollback manual).
//   KEEP = c19bdff9 (login danielpelaez@gmail.com)
//   DROP = 5655879b (HVAC senior, sin login, seed Northgate)
// Acciones: +skill HVAC senior a KEEP · mover assignments/executions/work_orders
// de DROP→KEEP · normalizar nombre KEEP · soft-delete DROP.
import { readFileSync } from "node:fs"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
async function get(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`GET ${p} ${r.status} ${await r.text()}`); return r.json() }
async function patch(p, body) { const r = await fetch(`${URL}/rest/v1/${p}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`PATCH ${p} ${r.status} ${await r.text()}`); return r.json() }
async function post(p, body) { const r = await fetch(`${URL}/rest/v1/${p}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`POST ${p} ${r.status} ${await r.text()}`); return r.json() }

const [tn] = await get(`tenants?slug=eq.huella-global&select=id`)
const t = tn.id
const [keep] = await get(`technicians?tenant_id=eq.${t}&email=eq.danielpelaez@gmail.com&select=id,first_name,last_name,max_minutes_per_day`)
const [drop] = await get(`technicians?tenant_id=eq.${t}&email=eq.daniel.pelaez@northgate.demo&select=id,first_name,last_name`)
if (!keep || !drop) throw new Error(`No se encontraron ambos Daniel (keep=${!!keep} drop=${!!drop})`)
const [hvac] = await get(`skills?tenant_id=eq.${t}&name=eq.HVAC&select=id`)
if (!hvac) throw new Error("No existe la skill HVAC")
console.log(`KEEP=${keep.id} DROP=${drop.id} HVAC=${hvac.id}`)

// ── BACKUP (para rollback manual) ───────────────────────────────────────────
const bAsg = await get(`work_order_assignments?technician_id=eq.${drop.id}&select=id`)
const bExe = await get(`work_order_executions?technician_id=eq.${drop.id}&select=id`)
const bWoCol = await get(`work_orders?assigned_technician_id=eq.${drop.id}&select=id`).catch(() => null)
console.log("\n=== BACKUP (rollback: volver estos technician_id a DROP, quitar HVAC de KEEP, deleted_at=null en DROP) ===")
console.log(`  assignments→KEEP: ${bAsg.map((x) => x.id).join(", ") || "(ninguna)"}`)
console.log(`  executions→KEEP:  ${bExe.map((x) => x.id).join(", ") || "(ninguna)"}`)
console.log(`  work_orders.assigned_technician_id→KEEP: ${bWoCol ? (bWoCol.map((x) => x.id).join(", ") || "(ninguna)") : "(columna no existe)"}`)

// ── 1) HVAC senior a KEEP (idempotente) ─────────────────────────────────────
const existing = await get(`technician_skills?technician_id=eq.${keep.id}&skill_id=eq.${hvac.id}&select=technician_id`)
if (existing.length === 0) {
  await post(`technician_skills`, { tenant_id: t, technician_id: keep.id, skill_id: hvac.id, level: "senior" })
  console.log("\n✓ +HVAC senior a KEEP")
} else { console.log("\n• KEEP ya tenía HVAC") }

// ── 2) Mover asignaciones / ejecuciones / work_orders ───────────────────────
const mAsg = await patch(`work_order_assignments?technician_id=eq.${drop.id}`, { technician_id: keep.id })
console.log(`✓ ${mAsg.length} asignaciones → KEEP`)
const mExe = await patch(`work_order_executions?technician_id=eq.${drop.id}`, { technician_id: keep.id })
console.log(`✓ ${mExe.length} ejecuciones → KEEP`)
if (bWoCol) {
  const mWo = await patch(`work_orders?assigned_technician_id=eq.${drop.id}`, { assigned_technician_id: keep.id })
  console.log(`✓ ${mWo.length} work_orders.assigned_technician_id → KEEP`)
}

// ── 3) Normalizar nombre KEEP + capacidad HVAC, soft-delete DROP ────────────
await patch(`technicians?id=eq.${keep.id}`, { first_name: "Daniel", last_name: "Peláez", max_minutes_per_day: Math.max(keep.max_minutes_per_day ?? 0, 540) })
console.log("✓ KEEP normalizado a 'Daniel Peláez' (cap 540min)")
await patch(`technicians?id=eq.${drop.id}`, { deleted_at: new Date().toISOString(), status: "inactive" })
console.log("✓ DROP soft-eliminado (deleted_at + inactive)")

// ── Verificación ────────────────────────────────────────────────────────────
const skills = await get(`technician_skills?technician_id=eq.${keep.id}&select=skill_id,level`)
const skMap = Object.fromEntries((await get(`skills?tenant_id=eq.${t}&select=id,name`)).map((s) => [s.id, s.name]))
console.log("\n=== VERIFICACIÓN — skills de KEEP ===")
for (const s of skills) console.log(`  ${skMap[s.skill_id]}: ${s.level}`)
const left = await get(`technicians?tenant_id=eq.${t}&deleted_at=is.null&first_name=ilike.*Daniel*&select=id,first_name,last_name`)
console.log(`\nDaniel activos restantes: ${left.length} → ${left.map((x) => `${x.first_name} ${x.last_name}`).join(", ")}`)
