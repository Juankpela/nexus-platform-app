// Solo lectura — FASE 1 SLA OPERACIONAL. Por tenant: cuántos casos tienen
// prioridad (siempre, NOT NULL) y cuántos tienen / NO tienen sla_due_at.
// Lista los casos sin SLA para saber qué hay que backfillear.
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
if (!BASE || !KEY) throw new Error("Faltan envs")

async function q(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

const tenants = await q("tenants?select=id,name,slug&order=name")
let grandMissing = 0
for (const t of tenants) {
  const cases = await q(
    `cases?tenant_id=eq.${t.id}&select=case_number,priority,sla_due_at,status,created_at&order=created_at.desc`,
  )
  if (cases.length === 0) continue
  const noPriority = cases.filter((c) => !c.priority)
  const noSla = cases.filter((c) => !c.sla_due_at)
  grandMissing += noSla.length
  console.log(
    `\n${t.name} (${t.slug}): ${cases.length} casos | sin prioridad=${noPriority.length} | SIN SLA=${noSla.length}`,
  )
  for (const c of noSla.slice(0, 12)) {
    console.log(`   ✗ ${c.case_number} | prioridad=${c.priority} | estado=${c.status} | creado=${c.created_at?.slice(0, 10)}`)
  }
  if (noSla.length > 12) console.log(`   … y ${noSla.length - 12} más`)
}
console.log(`\n=== TOTAL casos sin SLA en toda la plataforma: ${grandMissing} ===`)
