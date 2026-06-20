// Inserta UN caso web "new" coordinable (HVAC) para que aparezca la propuesta
// héroe en el Centro Operacional. Mismo camino que el intake público. Idempotente
// por asunto (no duplica si ya existe uno abierto con el mismo asunto).
import { readFileSync } from "node:fs"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
async function rpc(fn, body) { const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${fn} ${r.status} ${await r.text()}`); return r.json() }
async function get(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`${p} ${r.status} ${await r.text()}`); return r.json() }
async function post(p, body) { const r = await fetch(`${URL}/rest/v1/${p}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${p} ${r.status} ${await r.text()}`); return r.json() }

const [tn] = await get(`tenants?slug=eq.huella-global&select=id`)
const t = tn.id
const subject = "HVAC: aire acondicionado sin enfriamiento en la sala de espera"
const dup = await get(`cases?tenant_id=eq.${t}&subject=eq.${encodeURIComponent(subject)}&status=eq.new&select=id`)
if (dup.length > 0) { console.log("Ya existe un caso abierto idéntico:", dup[0].id); process.exit(0) }

const num = await rpc("next_case_number", { p_tenant_id: t })
const row = await post(`cases`, {
  tenant_id: t,
  case_number: num,
  subject,
  description: "El aire acondicionado HVAC de la sala de espera no enfría. Hace mucho calor y hay pacientes esperando.",
  priority: "high",
  origin: "web",
  reporter_email: "recepcion@northgate.demo",
})
console.log("Caso creado:", row[0].case_number, row[0].id)
