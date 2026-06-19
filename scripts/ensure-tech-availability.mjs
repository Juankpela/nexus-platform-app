// Garantiza que todo técnico ACTIVO tenga ventanas de disponibilidad (Lun–Vie
// 08:00–17:00) y una capacidad diaria, para que el motor de coordinación pueda
// recomendarlos en una demo en vivo. Idempotente: solo agrega lo que falta.
// Reversible (borra las ventanas si quieres revertir). NO toca el motor.
//
// Uso: node scripts/ensure-tech-availability.mjs [tenantSlug]   (default huella-global)

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
const slug = (process.argv[2] ?? "huella-global").toLowerCase()
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

const WEEKDAYS = [1, 2, 3, 4, 5] // Lun–Vie
const START = 480 // 08:00
const END = 1020 // 17:00

async function main() {
  const tRows = await fetch(`${URL}/rest/v1/tenants?slug=eq.${slug}&select=id&limit=1`, { headers: H }).then((r) => r.json())
  if (!tRows.length) { console.error(`Tenant "${slug}" no existe.`); process.exit(1) }
  const tenantId = tRows[0].id

  const techs = await fetch(
    `${URL}/rest/v1/technicians?tenant_id=eq.${tenantId}&deleted_at=is.null&status=eq.active&select=id,first_name,last_name,max_work_orders_per_day`,
    { headers: H },
  ).then((r) => r.json())
  const wins = await fetch(
    `${URL}/rest/v1/technician_availability?tenant_id=eq.${tenantId}&select=technician_id,weekday`,
    { headers: H },
  ).then((r) => r.json())
  const hasWindow = new Set(wins.map((w) => w.technician_id))

  console.log(`Asegurando disponibilidad de técnicos activos en "${slug}"...\n`)
  let added = 0
  for (const t of techs) {
    const name = `${t.first_name} ${t.last_name}`
    // Capacidad por defecto si falta.
    if (t.max_work_orders_per_day == null) {
      await fetch(`${URL}/rest/v1/technicians?tenant_id=eq.${tenantId}&id=eq.${t.id}`, {
        method: "PATCH",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({ max_work_orders_per_day: 6, max_minutes_per_day: 540 }),
      })
      console.log(`  capacidad asignada: ${name} (6 OT/día)`)
    }
    if (hasWindow.has(t.id)) continue
    const rows = WEEKDAYS.map((wd) => ({
      tenant_id: tenantId,
      technician_id: t.id,
      weekday: wd,
      start_minute: START,
      end_minute: END,
    }))
    const res = await fetch(`${URL}/rest/v1/technician_availability`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    added += 1
    console.log(`  horario agregado: ${name} (Lun–Vie 08:00–17:00)`)
  }

  console.log(`\n✓ Listo. ${added} técnico(s) recibieron horario. Todos los activos quedan elegibles.`)
}

main().catch((e) => { console.error("\n✗ Error:", e.message ?? e); process.exit(1) })
