// Solo lectura: investiga los dos "Daniel" para resolver el duplicado con criterio.
import { readFileSync } from "node:fs"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
async function q(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); if (!r.ok) throw new Error(`${p} ${r.status} ${await r.text()}`); return r.json() }

const [tn] = await q(`tenants?slug=eq.huella-global&select=id`)
const t = tn.id
const ids = ["c19bdff9", "5655879b"]
// Trae ambos Daniel con TODAS las columnas para ver user_id / email / created_at.
const techs = await q(`technicians?tenant_id=eq.${t}&first_name=ilike.*Daniel*&select=*`)
for (const x of techs) {
  console.log(`\n── ${x.first_name} ${x.last_name} [${x.id.slice(0,8)}] ──`)
  console.log(`  status=${x.status} created_at=${x.created_at}`)
  console.log(`  user_id=${x.user_id ?? "—"}  email=${x.email ?? "—"}  phone=${x.phone ?? "—"}`)
  const asg = await q(`work_order_assignments?technician_id=eq.${x.id}&select=id,status,scheduled_start`)
  const byStatus = asg.reduce((m, a) => ((m[a.status] = (m[a.status]||0)+1), m), {})
  console.log(`  asignaciones=${asg.length} ${JSON.stringify(byStatus)}`)
  const exe = await q(`work_order_executions?technician_id=eq.${x.id}&select=id,status`)
  console.log(`  ejecuciones=${exe.length} ${JSON.stringify(exe.reduce((m,e)=>((m[e.status]=(m[e.status]||0)+1),m),{}))}`)
}
// ¿Hay un user de auth con email danielpelaez@gmail.com y a qué technician se liga?
const members = await q(`memberships?tenant_id=eq.${t}&select=user_id,role`).catch(()=>[])
console.log(`\nmemberships del tenant: ${members.length}`)
