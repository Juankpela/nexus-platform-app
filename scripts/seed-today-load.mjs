// Carga de HOY desigual entre técnicos → utilización realista + sobreutilizados.
// Capacidad estándar 480 min. Crea, por técnico, una OT de hoy con la duración
// objetivo (idempotente). Solo datos. Uso: node scripts/seed-today-load.mjs
import { readFileSync } from "node:fs"
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}))
const URL=env.NEXT_PUBLIC_SUPABASE_URL, KEY=env.SUPABASE_SERVICE_ROLE_KEY
if(!URL.includes("oyjvnzjdgbzwojmjjlyn")) throw new Error("ABORT: no es staging")
const H={apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"}
const q=async(p,o={})=>{const r=await fetch(`${URL}/rest/v1/${p}`,{...o,headers:{...H,...o.headers}});const t=await r.text();if(!r.ok)throw new Error(`${p} ${r.status} ${t}`);return t?JSON.parse(t):null}
const selectOne=async(t,f,c="*")=>{const qs=Object.entries(f).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join("&");const r=await q(`${t}?${qs}&select=${c}&limit=1`);return r?.length?r[0]:null}
const insert=async(t,row,c="*")=>{const d=await q(`${t}?select=${c}`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});return Array.isArray(d)?d[0]:d}
const update=(t,f,patch)=>{const qs=Object.entries(f).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join("&");return q(`${t}?${qs}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)})}
const nextNumber=(fn,T)=>q(`rpc/${fn}`,{method:"POST",body:JSON.stringify({p_tenant_id:T})})
async function insWithNum(table,row,field,fn,T,cols="*"){for(let i=0;i<80;i++){const num=await nextNumber(fn,T);try{return await insert(table,{...row,[field]:num},cols)}catch(e){if(String(e.message).includes("23505")&&i<79)continue;throw e}}}
const todayAt=(h,m=0)=>{const d=new Date();d.setHours(h,m,0,0);return d.toISOString()}

const t=await selectOne("tenants",{slug:"staging-test"},"id"); const T=t.id
const companies=await q(`companies?tenant_id=eq.${T}&status=eq.active&select=id&order=name`)
const contactOf=async(cid)=> (await selectOne("contacts",{tenant_id:T,company_id:cid},"id"))?.id ?? null
const techs=(await q(`technicians?tenant_id=eq.${T}&deleted_at=is.null&status=eq.active&select=id,first_name&order=first_name`)).filter(x=>x.first_name!=="Tec")

// minutos de hoy por técnico (480 = 100%): 2 sobrecargados, varios ocupados, 2 holgados
const PLAN=[540,510,440,410,390,370,340,300]
let n=0
for(let i=0;i<PLAN.length && i<techs.length;i++){
  const mins=PLAN[i]
  const subject=`Jornada de hoy — ${techs[i].first_name}`
  if(await selectOne("work_orders",{tenant_id:T,subject},"id")) continue
  const c=companies[i%companies.length]
  const status = i<2 ? "in_progress" : "scheduled"   // los 2 sobrecargados, en ejecución
  const caseRow=await insWithNum("cases",{tenant_id:T,subject:`(WO) ${subject}`,description:"Trabajo del día.",
    status:"working",priority:i<2?"high":"medium",origin:"web",company_id:c.id,contact_id:await contactOf(c.id),
    reporter_email:"demo@cliente.demo",created_at:todayAt(7)},"case_number","next_case_number",T,"id")
  const wo=await insWithNum("work_orders",{tenant_id:T,case_id:caseRow.id,company_id:c.id,subject,
    description:"Carga del día.",priority:i<2?"high":"medium",status,
    scheduled_start:todayAt(8),scheduled_end:todayAt(8,mins),created_at:todayAt(7)},
    "work_order_number","next_work_order_number",T,"id")
  await update("cases",{tenant_id:T,id:caseRow.id},{work_order_id:wo.id})
  await insert("work_order_assignments",{tenant_id:T,work_order_id:wo.id,technician_id:techs[i].id,
    scheduled_start:todayAt(8),scheduled_end:todayAt(8,mins),estimated_duration_minutes:mins,
    status:i<2?"in_progress":"scheduled"},"id")
  n++
}
console.log(`✓ ${n} jornadas de hoy (utils ${PLAN.map(m=>Math.round(m/480*100)+"%").join(" ")}): 2 sobrecargados, varios ocupados`)
