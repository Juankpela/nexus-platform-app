// Seed de DEMO para encender el pipeline SLA → alerta → notificación → propuesta.
//
// - Pone sla_due_at en algunas WOs abiertas (vencidas + at-risk) para que el
//   scanner SLA genere alertas y notificaciones.
// - Crea una asignación + una ejecución "No pude completar" con motivo
//   reagendable (customer_absent) para que el motor de propuestas (dry-run)
//   proponga un reagendamiento.
//
// Idempotente. Usa el service role (omite RLS). Correr DESPUÉS de db:push.
//
// Uso:
//   node scripts/seed-sla-demo.mjs <tenantSlug>
//   node scripts/seed-sla-demo.mjs huella-global

import { readFileSync } from "node:fs"

function loadEnv(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq === -1) continue
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      env[t.slice(0, eq).trim()] = v
    }
  } catch (e) {
    console.error(`No pude leer ${path}:`, e.message)
    process.exit(1)
  }
  return env
}

const env = loadEnv(".env.local")
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const tenantSlug = process.argv[2] ?? "huella-global"
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

async function req(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text}`)
  return body
}
const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString()
const H = 3_600_000

async function main() {
  const tenants = await req(`${URL}/rest/v1/tenants?slug=eq.${tenantSlug}&select=id`)
  if (!tenants.length) throw new Error(`No existe el tenant ${tenantSlug}`)
  const tenantId = tenants[0].id
  console.log(`Tenant ${tenantSlug}: ${tenantId}`)

  // Open WOs (not terminal), newest first.
  const wos = await req(
    `${URL}/rest/v1/work_orders?tenant_id=eq.${tenantId}&status=not.in.(completed,cancelled)&select=id,work_order_number,scheduled_start,scheduled_end&order=created_at.desc&limit=10`,
  )
  if (wos.length < 2) {
    console.warn("  ⚠ Se necesitan ≥2 WOs abiertas. Crea órdenes primero.")
    return
  }

  // 1) SLA deadlines: vencida / at-risk / vencida.
  const slaPlan = [
    { wo: wos[0], sla: iso(-3 * H), label: "vencida (critical)" },
    { wo: wos[1], sla: iso(1 * H), label: "at-risk (warning, <2h)" },
  ]
  if (wos[2]) slaPlan.push({ wo: wos[2], sla: iso(-1 * H), label: "vencida (critical)" })

  for (const p of slaPlan) {
    await req(`${URL}/rest/v1/work_orders?id=eq.${p.wo.id}&tenant_id=eq.${tenantId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ sla_due_at: p.sla }),
    })
    console.log(`  SLA · ${p.wo.work_order_number}: ${p.label}`)
  }

  // 2) Reschedule candidate: assignment + unable_to_complete execution (customer_absent).
  const techs = await req(
    `${URL}/rest/v1/technicians?tenant_id=eq.${tenantId}&deleted_at=is.null&status=eq.active&select=id,first_name,last_name&limit=1`,
  )
  if (!techs.length) {
    console.warn("  ⚠ Sin técnicos activos — omito la propuesta de reschedule.")
  } else {
    const tech = techs[0]
    const wo = wos[0]
    // Ensure an assignment for (wo, tech).
    let asg = await req(
      `${URL}/rest/v1/work_order_assignments?tenant_id=eq.${tenantId}&work_order_id=eq.${wo.id}&select=id&limit=1`,
    )
    let assignmentId
    if (asg.length) {
      assignmentId = asg[0].id
    } else {
      const created = await req(`${URL}/rest/v1/work_order_assignments?select=id`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          tenant_id: tenantId,
          work_order_id: wo.id,
          technician_id: tech.id,
          scheduled_start: iso(-5 * H),
          scheduled_end: iso(-3 * H),
          estimated_duration_minutes: 120,
          status: "scheduled",
        }),
      })
      assignmentId = created[0].id
    }
    // Execution: reported unable_to_complete with a reschedulable reason.
    await req(
      `${URL}/rest/v1/work_order_executions?on_conflict=assignment_id&select=id`,
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          tenant_id: tenantId,
          assignment_id: assignmentId,
          work_order_id: wo.id,
          technician_id: tech.id,
          status: "unable_to_complete",
          non_completion_reason: "customer_absent",
          unable_to_complete_at: iso(-30 * 60_000),
          unable_reason: "Cliente no se encontraba en sitio (demo)",
        }),
      },
    )
    console.log(`  Reschedule · ${wo.work_order_number} → ${tech.first_name} ${tech.last_name} (customer_absent → reagendable)`)
  }

  console.log(`\n✓ Listo. Dispara el cron (Vercel → Crons → Run, o curl con CRON_SECRET) y revisa: tarjeta SLA, campanita y propuestas en /dispatch.`)
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message ?? e)
  process.exit(1)
})
