// Solo lectura de auth: genera una sesión válida (admin magic-link) para el admin
// y emite la(s) cookie(s) `sb-<ref>-auth-token` que espera @supabase/ssr (0.10.x:
// `base64-` + base64url(JSON), chunked a 3180). Imprime JSON [{name,value}] para
// inyectar en el navegador y tomar capturas locales. NO modifica datos.
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const { stringToBase64URL } = createRequire(import.meta.url)(
  "@supabase/ssr/dist/main/utils/base64url.js",
)
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const REF = URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)[1]
const EMAIL = process.argv[2] ?? "juankpela10@hotmail.com"

// 1) Magic link (admin) → hashed_token
const gl = await fetch(`${URL}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "magiclink", email: EMAIL }),
})
if (!gl.ok) throw new Error(`generate_link ${gl.status} ${await gl.text()}`)
const link = await gl.json()
const tokenHash = link.hashed_token ?? link.properties?.hashed_token
if (!tokenHash) throw new Error(`sin hashed_token: ${JSON.stringify(link).slice(0, 300)}`)

// 2) Verify → session
const vr = await fetch(`${URL}/auth/v1/verify`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
})
if (!vr.ok) throw new Error(`verify ${vr.status} ${await vr.text()}`)
const session = await vr.json()
if (!session.access_token) throw new Error(`sin access_token: ${JSON.stringify(session).slice(0, 300)}`)

// 3) Cookie(s) en el formato de @supabase/ssr
const encoded = "base64-" + stringToBase64URL(JSON.stringify(session))
const NAME = `sb-${REF}-auth-token`
const MAX = 3180
let cookies
if (encodeURIComponent(encoded).length <= MAX) {
  cookies = [{ name: NAME, value: encoded }]
} else {
  cookies = []
  for (let i = 0, p = 0; p < encoded.length; i++, p += MAX) {
    cookies.push({ name: `${NAME}.${i}`, value: encoded.slice(p, p + MAX) })
  }
}
console.log(JSON.stringify({ ref: REF, email: EMAIL, expires_at: session.expires_at, cookies }))
