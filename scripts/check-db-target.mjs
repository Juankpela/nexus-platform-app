// Guard de seguridad: impide (por defecto) que el desarrollo local apunte a
// PRODUCCIÓN. Lee .env.local, extrae el ref de Supabase y BLOQUEA si es el de
// prod. Se ejecuta como `predev` para que ningún `npm run dev` escriba en prod
// por accidente. Escape consciente: ALLOW_PROD_DEV=1 npm run dev
import { readFileSync } from "node:fs"

const PROD_REF = "orueodkxqhtbqjddpkrr" // NEXUS (producción)
const STAGING_REF = "oyjvnzjdgbzwojmjjlyn" // nexus-staging

let env = ""
try {
  env = readFileSync(".env.local", "utf8")
} catch {
  console.error("⚠ No se encontró .env.local — no puedo verificar el destino de la BD.")
  process.exit(0)
}

const m = env.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*https:\/\/([a-z0-9]+)\.supabase\.co/)
const ref = m?.[1] ?? "desconocido"
const label = ref === PROD_REF ? "PRODUCCIÓN" : ref === STAGING_REF ? "STAGING" : ref

if (ref === PROD_REF && process.env.ALLOW_PROD_DEV !== "1") {
  console.error("\n  ⛔  .env.local apunta a PRODUCCIÓN (" + ref + ").")
  console.error("      El desarrollo local NO debe leer/escribir en prod.")
  console.error("      Apunta a staging (.env.local de staging + db:link:staging).")
  console.error("      Si DE VERDAD lo necesitas: ALLOW_PROD_DEV=1 npm run dev\n")
  process.exit(1)
}

console.log(`✓ DB target del desarrollo local: ${label} (${ref})`)
