// ─────────────────────────────────────────────────────────────────────────────
// DISPONIBILIDAD PARA EL TENANT DEMO 'demo-hvac' (prod) — parche de datos.
//
// El seed original (seed-prod-demo.mjs) creó técnicos + skills pero SIN ventanas
// de disponibilidad (technician_availability), así que el motor de despacho no
// encuentra huecos ni relajando reglas. Este script agrega Lun–Vie 08:00–17:00 a
// todo técnico del tenant que aún no tenga ventanas. Idempotente y ADITIVO:
// no borra ni modifica nada existente; solo toca el tenant 'demo-hvac'.
//
// Igual que el seed original, usa .env.prod (decisión consciente de tocar prod):
//   node scripts/seed-demo-availability.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs"

const SLUG = "demo-hvac"
const WORK_DAYS = [1, 2, 3, 4, 5] // Lun–Vie
const DAY_START = 8 * 60 // 08:00
const DAY_END = 17 * 60 // 17:00

let env
try {
  env = Object.fromEntries(
    readFileSync(".env.prod", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]
      }),
  )
} catch {
  console.error("✗ Falta nexus-platform/.env.prod (URL + SERVICE_ROLE_KEY de prod).")
  process.exit(1)
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error("✗ .env.prod incompleto")
  process.exit(1)
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
const q = async (p, o = {}) => {
  const r = await fetch(`${URL}/rest/v1/${p}`, { ...o, headers: { ...H, ...o.headers } })
  const t = await r.text()
  if (!r.ok) throw new Error(`${p} ${r.status} ${t}`)
  return t ? JSON.parse(t) : null
}

const tenant = (await q(`tenants?slug=eq.${SLUG}&select=id,name&limit=1`))?.[0]
if (!tenant) {
  console.error(`✗ Tenant '${SLUG}' no existe`)
  process.exit(1)
}
console.log(`Tenant: ${tenant.name} (${SLUG})`)

const techs = await q(
  `technicians?tenant_id=eq.${tenant.id}&status=eq.active&select=id,first_name,last_name`,
)
let added = 0
for (const t of techs) {
  const existing = await q(
    `technician_availability?tenant_id=eq.${tenant.id}&technician_id=eq.${t.id}&select=id&limit=1`,
  )
  if (existing.length) {
    console.log(`= ${t.first_name} ${t.last_name} ya tiene disponibilidad`)
    continue
  }
  await q("technician_availability", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      WORK_DAYS.map((weekday) => ({
        tenant_id: tenant.id,
        technician_id: t.id,
        weekday,
        start_minute: DAY_START,
        end_minute: DAY_END,
      })),
    ),
  })
  added++
  console.log(`✓ ${t.first_name} ${t.last_name}: Lun–Vie 08:00–17:00`)
}
console.log(`\nListo: ${added} técnicos con disponibilidad nueva, ${techs.length - added} ya la tenían.`)
