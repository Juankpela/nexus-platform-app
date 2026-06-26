// Casos ABIERTOS con SLA vencido (accionables) para demostrar el drill-down.
// Convierte el breach "resuelto tarde" a cumplido, y añade 3 casos abiertos
// vencidos → breachedCount = 3 = lo que muestra el filtro ?sla=overdue. STAGING.
import { readFileSync } from "node:fs"
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}))
const URL=env.NEXT_PUBLIC_SUPABASE_URL, KEY=env.SUPABASE_SERVICE_ROLE_KEY
if(!URL.includes("oyjvnzjdgbzwojmjjlyn")) throw new Error("ABORT: no es staging")
const H={apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"}
const q=async(p,o={})=>{const r=await fetch(`${URL}/rest/v1/${p}`,{...o,headers:{...H,...o.headers}});const t=await r.text();if(!r.ok)throw new Error(`${p} ${r.status} ${t}`);return t?JSON.parse(t):null}
const selectOne=async(t,f,c="*")=>{const qs=Object.entries(f).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join("&");const r=await q(`${t}?${qs}&select=${c}&limit=1`);return r?.length?r[0]:null}
const insert=async(t,row,c="*")=>{const d=await q(`${t}?select=${c}`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});return Array.isArray(d)?d[0]:d}
const nextNumber=(fn,T)=>q(`rpc/${fn}`,{method:"POST",body:JSON.stringify({p_tenant_id:T})})
async function insWithNum(table,row,field,fn,T,cols="*"){for(let i=0;i<80;i++){const num=await nextNumber(fn,T);try{return await insert(table,{...row,[field]:num},cols)}catch(e){if(String(e.message).includes("23505")&&i<79)continue;throw e}}}
const hAgo=(h)=>new Date(Date.now()-h*3600_000).toISOString()

const t=await selectOne("tenants",{slug:"staging-test"},"id"); const T=t.id
const companies=await q(`companies?tenant_id=eq.${T}&status=eq.active&select=id&order=name`)
const contactOf=async(cid)=> (await selectOne("contacts",{tenant_id:T,company_id:cid},"id"))?.id ?? null

// 1) El breach "resuelto tarde" → cumplido (deja el SLA solo con vencidos abiertos)
const late=await selectOne("cases",{tenant_id:T,subject:"Sin enfriamiento servidores (atendido tarde)"},"id,resolved_at")
if(late){ await q(`cases?tenant_id=eq.${T}&id=eq.${late.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sla_due_at:hAgo((Date.now()-new Date(late.resolved_at).getTime())/3600_000 - 2)})}) ; console.log("✓ breach 'tarde' → cumplido") }

// 2) 3 casos ABIERTOS con SLA vencido (resolvibles)
const OVERDUE=[
  ["Sin enfriamiento sala de cómputo — urgente","escalated","critical",8],
  ["A/A oficina principal sin operar","working","high",20],
  ["Cuarto frío fuera de rango — revisar","new","high",4],
]
let n=0
for(const [subject,status,priority,overdueH] of OVERDUE){
  if(await selectOne("cases",{tenant_id:T,subject},"id")) continue
  const c=companies[n%companies.length]
  await insWithNum("cases",{tenant_id:T,subject,description:"Caso abierto con SLA vencido.",status,priority,origin:"web",
    company_id:c.id,contact_id:await contactOf(c.id),reporter_email:"demo@cliente.demo",
    sla_due_at:hAgo(overdueH),created_at:hAgo(overdueH+24)},"case_number","next_case_number",T,"id")
  n++
}
console.log(`✓ ${n} casos abiertos con SLA vencido → breachedCount=${n}, visibles en ?sla=overdue y resolvibles`)
