// FASE 1 SLA OPERACIONAL — backfill idempotente. Rellena cases.sla_due_at SOLO
// donde está NULL, usando la MISMA regla que modules/service/domain/sla.ts:
//   sla_due_at = created_at + SLA_HOURS_BY_PRIORITY[priority] horas.
// No toca casos que ya tienen SLA. Sin riesgo de sobrescritura.
import { readFileSync } from "node:fs"

// Espejo EXACTO de SLA_HOURS_BY_PRIORITY (sla.ts). Si cambia allá, cambiar aquí.
const SLA_HOURS_BY_PRIORITY = { critical: 4, high: 8, medium: 24, low: 72 }

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
if (!BASE || !KEY) throw new Error("Faltan envs")
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

async function get(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers: H })
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
  return res.json()
}
async function patch(path, body) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status} ${await res.text()}`)
}

function computeSlaDueAt(createdAtIso, priority) {
  const hours = SLA_HOURS_BY_PRIORITY[priority]
  if (!hours) return null
  return new Date(new Date(createdAtIso).getTime() + hours * 3_600_000).toISOString()
}

const missing = await get(
  "cases?sla_due_at=is.null&select=id,case_number,priority,created_at&order=created_at",
)
console.log(`Casos sin SLA: ${missing.length}`)
let fixed = 0
for (const c of missing) {
  const due = computeSlaDueAt(c.created_at, c.priority)
  if (!due) {
    console.log(`   ⚠ ${c.case_number}: prioridad inválida '${c.priority}' — omitido`)
    continue
  }
  await patch(`cases?id=eq.${c.id}`, { sla_due_at: due })
  fixed++
  console.log(`   ✓ ${c.case_number} | ${c.priority} | SLA → ${due}`)
}
console.log(`\nBackfill completo: ${fixed}/${missing.length} actualizados.`)
