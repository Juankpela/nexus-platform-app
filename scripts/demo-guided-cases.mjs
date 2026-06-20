// Crea 3 casos del REPORTE GUIADO (con reported_skill_id autoritativo) para
// demostrar coordinación inmediata. Idempotente por subject+status=new.
import { readFileSync } from "node:fs"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
async function rpc(fn, body) { const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${fn} ${r.status}`); return r.json() }
async function get(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`${p} ${r.status}`); return r.json() }
async function post(p, body) { const r = await fetch(`${URL}/rest/v1/${p}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${p} ${r.status} ${await r.text()}`); return r.json() }

const [tn] = await get(`tenants?slug=eq.huella-global&select=id`)
const t = tn.id
const skills = await get(`skills?tenant_id=eq.${t}&select=id,name`)
const byName = Object.fromEntries(skills.map((s) => [s.name, s.id]))

const DEMO = [
  { skill: "HVAC", type: "No enfría", desc: "El quirófano está a 28° y el equipo no enfría." },
  { skill: "Electricidad", type: "Cortocircuito", desc: "Saltan chispas en el tablero del piso 2." },
  { skill: "Plomería", type: "Fuga de agua", desc: "Fuga bajo el lavamanos del baño de visitas." },
]

for (const d of DEMO) {
  const skillId = byName[d.skill]
  const subject = `${d.skill} — ${d.type}`
  const dup = await get(`cases?tenant_id=eq.${t}&subject=eq.${encodeURIComponent(subject)}&status=eq.new&select=id`)
  if (dup.length) { console.log(`• ya existe: ${subject}`); continue }
  const num = await rpc("next_case_number", { p_tenant_id: t })
  const row = await post(`cases`, {
    tenant_id: t, case_number: num, subject,
    description: [d.desc, `Tipo: ${d.type}`, "Dónde: Sede principal", "Reportado por: Recepción"].join("\n"),
    priority: "high", origin: "web", reporter_email: "recepcion@northgate.demo",
    reported_skill_id: skillId,
  })
  console.log(`✓ ${row[0].case_number} · ${subject} · skill=${d.skill}`)
}
