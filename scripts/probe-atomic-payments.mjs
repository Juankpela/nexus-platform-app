// P0-3 — Sonda READ-ONLY de despliegue (segura para producción).
// NO muta datos: envía entradas inválidas que las RPCs rechazan ANTES de cualquier
// escritura (la transacción se revierte sin tocar facturas ni pagos). Confirma que
// record_payment y reverse_payment están desplegadas y sus guards ejecutan.
//
//   node scripts/probe-atomic-payments.mjs --env .env.prod
import { readFileSync } from "node:fs"

const argIdx = process.argv.indexOf("--env")
const envFile = argIdx !== -1 ? process.argv[argIdx + 1] : ".env.local"
const raw = readFileSync(envFile, "utf8")
const read = (k) => {
  const m = raw.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m"))
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : ""
}
const url = read("NEXT_PUBLIC_SUPABASE_URL")
const key = read("SUPABASE_SERVICE_ROLE_KEY")
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
console.log(`Proyecto: ${url.match(/https:\/\/([a-z0-9]+)\./)?.[1]} (${envFile}) — sonda read-only\n`)

let failures = 0
const check = (cond, label) => {
  console.log(`${cond ? "✓" : "⛔"} ${label}`)
  if (!cond) failures++
}
const rpc = async (fn, body) => {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) })
  return { ok: res.ok, status: res.status, text: res.ok ? "" : await res.text() }
}
const ZERO = "00000000-0000-0000-0000-000000000000"

// 1) record_payment con asignaciones vacías → PAYMENT_NO_ALLOCATIONS (sin escritura).
const a = await rpc("record_payment", {
  p_tenant_id: ZERO, p_company_id: ZERO, p_payment_date: "2026-06-29",
  p_method: "transfer", p_reference: null, p_note: null, p_allocations: [],
})
check(!a.ok && a.text.includes("PAYMENT_NO_ALLOCATIONS"), `record_payment desplegada y valida entrada (${a.status})`)

// 2) reverse_payment con id inexistente → PAYMENT_NOT_FOUND (sin escritura).
const b = await rpc("reverse_payment", {
  p_tenant_id: ZERO, p_payment_id: ZERO, p_reversed_by: null,
  p_reversed_at: "2026-06-29T00:00:00Z", p_reason: "probe",
})
check(!b.ok && b.text.includes("PAYMENT_NOT_FOUND"), `reverse_payment desplegada y valida entrada (${b.status})`)

console.log(`\n${failures === 0 ? "✓ Ambas RPCs vivas en prod (sin mutar datos)" : "⛔ " + failures + " fallo(s)"}`)
process.exit(failures === 0 ? 0 : 1)
