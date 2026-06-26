// DEMO CREÍBLE (STAGING) — operación sana y realista, no perfecta.
// El agente no puede escribir en la BD compartida; córrelo tú:
//   node scripts/seed-demo-credible.mjs
//
// Qué hace (idempotente, solo STAGING, sin dominio/migraciones nuevas):
//   1) Saca de SLA los casos basura viejos ("Refrigeracion": sla_due_at = null)
//      para que el dashboard deje de mostrar 0% / 9 incumplidos.
//   2) Crea ~9 casos resueltos con SLA realista: 8 cumplidos + 1 incumplido
//      → ~89% de cumplimiento (alto pero no perfecto), repartidos entre clientes.
//   Resultado: SLA creíble + actividad reciente, conservando el único caso
//   abierto intencional ("Requiere atención · 1").
import { readFileSync } from "node:fs"
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}))
const URL=env.NEXT_PUBLIC_SUPABASE_URL, KEY=env.SUPABASE_SERVICE_ROLE_KEY
if(!URL.includes("oyjvnzjdgbzwojmjjlyn")) throw new Error("ABORT: no es staging")
const H={apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"}
const q=async(p,o={})=>{const r=await fetch(`${URL}/rest/v1/${p}`,{...o,headers:{...H,...o.headers}});const t=await r.text();if(!r.ok)throw new Error(`${p} ${r.status} ${t}`);return t?JSON.parse(t):null}
const selectOne=async(t,f,c="*")=>{const qs=Object.entries(f).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join("&");const r=await q(`${t}?${qs}&select=${c}&limit=1`);return r?.length?r[0]:null}
const nextNumber=(fn,T)=>q(`rpc/${fn}`,{method:"POST",body:JSON.stringify({p_tenant_id:T})})
async function insertWithNumber(table,row,field,fn,T,cols="*"){for(let i=0;i<60;i++){const num=await nextNumber(fn,T);try{const d=await q(`${table}?select=${cols}`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...row,[field]:num})});return Array.isArray(d)?d[0]:d}catch(e){if(String(e.message).includes("23505")&&i<59)continue;throw e}}}
const hoursAgo=(h)=>new Date(Date.now()-h*3600_000).toISOString()
const daysAgo=(d)=>hoursAgo(d*24)

const t=await selectOne("tenants",{slug:"staging-test"},"id"); const T=t.id

// 1) Sacar de SLA los casos basura viejos
const junk=await q(`cases?tenant_id=eq.${T}&subject=ilike.*Refrigeracion*&sla_due_at=not.is.null&select=id`)
for(const c of junk) await q(`cases?tenant_id=eq.${T}&id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sla_due_at:null})})
console.log(`✓ ${junk.length} casos basura fuera de SLA`)

// 2) Casos resueltos con SLA realista (8 cumplidos + 1 incumplido)
const companies=await q(`companies?tenant_id=eq.${T}&status=eq.active&select=id,name&order=name`)
const pick=(i)=>companies[i%companies.length]
const CASES=[
  ["Mantenimiento correctivo A/A oficina 3", 2, "met"],
  ["Cambio de filtros unidad central", 3, "met"],
  ["Revisión de fuga de refrigerante", 4, "met"],
  ["Falla de termostato sala de juntas", 5, "met"],
  ["Limpieza de condensador en azotea", 6, "met"],
  ["Ruido anormal en manejadora de aire", 7, "met"],
  ["Reemplazo de capacitor de compresor", 8, "met"],
  ["Calibración de control de temperatura", 9, "met"],
  ["Sin enfriamiento en cuarto de servidores (atendido tarde)", 2, "breached"],
]
let created=0
for(let i=0;i<CASES.length;i++){
  const [subject,dAgo,kind]=CASES[i]
  if(await selectOne("cases",{tenant_id:T,subject},"id")) continue
  const co=pick(i)
  const resolvedAt=daysAgo(dAgo)
  // met: deadline DESPUÉS de la resolución; breached: deadline ANTES (se cerró tarde)
  const slaDueAt=kind==="met"?hoursAgo(dAgo*24-2):hoursAgo(dAgo*24+6)
  await insertWithNumber("cases",{
    tenant_id:T, subject, description:"Servicio HVAC atendido.", status:"resolved",
    priority:"medium", origin:"web", company_id:co.id, reporter_email:"demo@cliente.demo",
    sla_due_at:slaDueAt, resolved_at:resolvedAt,
  },"case_number","next_case_number",T,"id")
  created++
}
console.log(`✓ ${created} casos resueltos con SLA (8 cumplidos + 1 incumplido ≈ 89%)`)
console.log("\nLISTO. Dashboard con operación creíble. Recarga la app.")
