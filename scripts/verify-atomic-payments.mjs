// P0-3 — Verificación de integridad contra DB real de las RPCs atómicas.
// Prueba el escenario de carrera que el flujo secuencial NO resistía:
//   - Dos pagos CONCURRENTES por el saldo COMPLETO de la misma factura.
//     Esperado: exactamente 1 éxito, 1 PAYMENT_OVER_ALLOCATION; el saldo final
//     es el correcto (no se duplica el cobro).
//   - Idempotencia de reversa: reversar dos veces → la 2ª falla NOT_REVERSIBLE.
// No destructivo: reversa y borra el pago de prueba para restaurar el estado.
//
//   node scripts/verify-atomic-payments.mjs --env .env.local   (staging)
//   node scripts/verify-atomic-payments.mjs --env .env.prod    (prod, autorizado)
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
const ref = url.match(/https:\/\/([a-z0-9]+)\./)?.[1]
console.log(`Proyecto: ${ref} (${envFile})\n`)

let failures = 0
const check = (cond, label) => {
  console.log(`${cond ? "✓" : "⛔"} ${label}`)
  if (!cond) failures++
}
const rpc = (fn, body) =>
  fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) })
const getInvoice = async (id, tenant) => {
  const r = await fetch(
    `${url}/rest/v1/invoices?id=eq.${id}&tenant_id=eq.${tenant}&select=total_amount,amount_paid,status`,
    { headers: H },
  )
  return (await r.json())[0]
}

// 1) Tomar una factura pagable con saldo > 0.
const r = await fetch(
  `${url}/rest/v1/invoices?status=in.(issued,partially_paid)&select=id,tenant_id,company_id,total_amount,amount_paid&limit=20`,
  { headers: H },
)
const inv = (await r.json()).find((i) => Number(i.total_amount) - Number(i.amount_paid) > 0)
if (!inv) {
  console.log("⚠ No hay factura pagable con saldo; no se puede correr la prueba aquí.")
  process.exit(0)
}
const tenant = inv.tenant_id
const paid0 = Number(inv.amount_paid)
const balance = Number(inv.total_amount) - paid0
console.log(`Factura ${inv.id} · total ${inv.total_amount} · pagado ${paid0} · saldo ${balance}\n`)

const alloc = [{ invoice_id: inv.id, amount: balance }]
const body = (a) => ({
  p_tenant_id: tenant,
  p_company_id: inv.company_id,
  p_payment_date: "2026-06-29",
  p_method: "transfer",
  p_reference: "P0-3-verify",
  p_note: "verificación atómica (se reversa y borra)",
  p_allocations: a,
})

// 2) Dos pagos CONCURRENTES por el saldo completo.
console.log("→ Disparando 2 pagos concurrentes por el saldo completo…")
const [a, b] = await Promise.all([rpc("record_payment", body(alloc)), rpc("record_payment", body(alloc))])
const results = await Promise.all([
  a.ok ? a.json() : a.text().then((t) => ({ __error: t })),
  b.ok ? b.json() : b.text().then((t) => ({ __error: t })),
])
const oks = results.filter((x) => !x.__error)
const errs = results.filter((x) => x.__error)
check(oks.length === 1, `exactamente 1 pago aceptado (fueron ${oks.length})`)
check(errs.length === 1, `exactamente 1 pago rechazado (fueron ${errs.length})`)
// El 2º pago, tras esperar el FOR UPDATE, re-lee la factura ya pagada: el rechazo
// válido es OVER_ALLOCATION (si el 1º fue parcial) o NOT_PAYABLE (si el 1º la dejó
// 'paid'). Cualquiera de los dos impide el doble cobro.
check(
  errs.every(
    (e) =>
      e.__error.includes("PAYMENT_OVER_ALLOCATION") ||
      e.__error.includes("INVOICE_NOT_PAYABLE"),
  ),
  `el rechazo bloquea el doble cobro (${errs.map((e) => (e.__error.match(/PAYMENT_OVER_ALLOCATION|INVOICE_NOT_PAYABLE/) || ["?"])[0]).join(",")})`,
)

// 3) El saldo final es el correcto (NO duplicado).
const after = await getInvoice(inv.id, tenant)
check(
  Number(after.amount_paid) === paid0 + balance,
  `amount_paid correcto = ${paid0 + balance} (real ${after.amount_paid}, NO duplicado)`,
)
check(after.status === "paid", `factura quedó 'paid' (real '${after.status}')`)

// 4) Reversa del pago aceptado + idempotencia (doble reversa).
const paymentId = oks[0]?.id
if (paymentId) {
  const rev1 = await rpc("reverse_payment", {
    p_tenant_id: tenant,
    p_payment_id: paymentId,
    p_reversed_by: null,
    p_reversed_at: "2026-06-29T00:00:00Z",
    p_reason: "verificación P0-3",
  })
  check(rev1.ok, "primera reversa OK")
  const afterRev = await getInvoice(inv.id, tenant)
  check(Number(afterRev.amount_paid) === paid0, `saldo restaurado a ${paid0} tras reversa`)

  const rev2 = await rpc("reverse_payment", {
    p_tenant_id: tenant,
    p_payment_id: paymentId,
    p_reversed_by: null,
    p_reversed_at: "2026-06-29T00:00:00Z",
    p_reason: "doble reversa",
  })
  const rev2body = rev2.ok ? "" : await rev2.text()
  check(!rev2.ok && rev2body.includes("PAYMENT_NOT_REVERSIBLE"), "segunda reversa rechazada (idempotente)")

  // 5) Limpieza: borrar allocations + pago de prueba para restaurar el estado.
  await fetch(`${url}/rest/v1/payment_allocations?payment_id=eq.${paymentId}`, { method: "DELETE", headers: H })
  await fetch(`${url}/rest/v1/payments?id=eq.${paymentId}`, { method: "DELETE", headers: H })
  const restored = await getInvoice(inv.id, tenant)
  check(Number(restored.amount_paid) === paid0 && restored.status !== "paid", "estado de la factura restaurado")
}

console.log(`\n${failures === 0 ? "✓ TODO OK" : "⛔ " + failures + " FALLO(S)"} — pagos atómicos`)
process.exit(failures === 0 ? 0 : 1)
