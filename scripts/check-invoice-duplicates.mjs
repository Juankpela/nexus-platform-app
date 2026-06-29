// P0-2 — Chequeo READ-ONLY: ¿existe más de una factura activa (status<>'void')
// para el mismo work_order o el mismo quote dentro de un tenant?
// Si las hay, el candado de unicidad (20260629001) NO debe aplicarse hasta
// resolverlas. No escribe nada.
//
//   node scripts/check-invoice-duplicates.mjs --env .env.local   (staging)
//   node scripts/check-invoice-duplicates.mjs --env .env.prod    (producción)
// Usa fetch directo a PostgREST (evita el cliente realtime de supabase-js, que
// requiere WebSocket nativo no disponible en Node < 22).
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
if (!url || !key) {
  console.error(`⚠ Falta URL o SERVICE_ROLE_KEY en ${envFile}`)
  process.exit(1)
}
const ref = url.match(/https:\/\/([a-z0-9]+)\./)?.[1]
console.log(`Proyecto: ${ref} (${envFile})`)

const res = await fetch(
  `${url}/rest/v1/invoices?status=neq.void&select=id,tenant_id,work_order_id,quote_id,status`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
)
if (!res.ok) {
  console.error(`Error consultando invoices: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()

const dupes = (keyField) => {
  const seen = new Map()
  for (const inv of data) {
    if (!inv[keyField]) continue
    const k = `${inv.tenant_id}:${inv[keyField]}`
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, n]) => n > 1)
}

const woDupes = dupes("work_order_id")
const quoteDupes = dupes("quote_id")

console.log(`Facturas activas: ${data.length}`)
console.log(`Duplicados por work_order: ${woDupes.length}`)
console.log(`Duplicados por quote: ${quoteDupes.length}`)

if (woDupes.length || quoteDupes.length) {
  console.error("⛔ HAY DUPLICADOS — resuélvelos (void) antes de aplicar el candado:")
  for (const [k, n] of [...woDupes, ...quoteDupes]) console.error(`   ${k} → ${n} facturas`)
  process.exit(1)
}
console.log("✓ Sin duplicados activos. Seguro aplicar el candado de unicidad.")
process.exit(0)
