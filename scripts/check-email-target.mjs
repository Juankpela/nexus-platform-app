// P0-1 — Verifica el estado de entregabilidad de email SIN enviar correo.
// Espeja la lógica de lib/email/send-email.ts::emailConfigStatus para poder
// validar un archivo de entorno (.env.prod, .env.local) antes de desplegar.
//
//   node scripts/check-email-target.mjs --env .env.prod
//
// Sale con código 0 si "production", 1 si "sandbox"/"disabled" (para CI/checks).
import { readFileSync } from "node:fs"

const argIdx = process.argv.indexOf("--env")
const envFile = argIdx !== -1 ? process.argv[argIdx + 1] : ".env.local"

let raw = ""
try {
  raw = readFileSync(envFile, "utf8")
} catch {
  console.error(`⚠ No se encontró ${envFile}.`)
  process.exit(1)
}

const read = (key) => {
  const m = raw.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, "m"))
  if (!m) return ""
  return m[1].trim().replace(/^["']|["']$/g, "")
}

const RESEND_API_KEY = read("RESEND_API_KEY")
const EMAIL_FROM = read("EMAIL_FROM")
const EMAIL_SANDBOX_TO = read("EMAIL_SANDBOX_TO")

function status() {
  if (!RESEND_API_KEY || !EMAIL_FROM) return "disabled"
  const addr = /<([^>]+)>/.exec(EMAIL_FROM)?.[1] ?? EMAIL_FROM
  return /@resend\.dev\s*$/i.test(addr) ? "sandbox" : "production"
}

const s = status()
console.log(`archivo:         ${envFile}`)
console.log(`EMAIL_FROM:      ${EMAIL_FROM || "(vacío)"}`)
console.log(`EMAIL_SANDBOX_TO:${EMAIL_SANDBOX_TO ? " " + EMAIL_SANDBOX_TO : " (vacío)"}`)
console.log(`deliverability:  ${s}`)

if (s === "production") {
  if (EMAIL_SANDBOX_TO) {
    console.warn("⚠ EMAIL_SANDBOX_TO sigue definido; en producción debe estar vacío.")
  }
  console.log("✓ El cliente externo recibirá los correos.")
  process.exit(0)
}
if (s === "sandbox") {
  console.error("⛔ SANDBOX: el cliente externo NO recibe; todo se redirige al dueño.")
  console.error("   Verifica un dominio en Resend y pon EMAIL_FROM con ese dominio.")
  process.exit(1)
}
console.error("⛔ DISABLED: falta RESEND_API_KEY o EMAIL_FROM.")
process.exit(1)
