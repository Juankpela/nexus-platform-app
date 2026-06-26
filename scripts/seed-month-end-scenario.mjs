// ESCENARIO DE CIERRE DE MES (STAGING) — empresa HVAC creíble, últimas 2 semanas.
// Solo datos, idempotente, sin tocar modelo/permisos/consultas. Construye la
// historia que los dashboards (y la IA futura) deben poder leer:
//   · CRM: pipeline con movimiento (etapas, oportunidades estancadas, won/lost).
//   · Servicio: SLA ~90% (algunos al límite, pocos incumplidos), estados variados.
//   · Field: órdenes repartidas DESIGUAL entre técnicos, resolución coherente.
//   · Activos: con historial de intervenciones.
// Uso:  node scripts/seed-month-end-scenario.mjs
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
const H2=(h)=>new Date(Date.now()-h*3600_000).toISOString()
const dAgo=(d)=>H2(d*24)
const fromNowH=(h)=>new Date(Date.now()+h*3600_000).toISOString()
const dateOnly=(iso)=>iso.slice(0,10)

const t=await selectOne("tenants",{slug:"staging-test"},"id"); const T=t.id
const companies=(await q(`companies?tenant_id=eq.${T}&status=eq.active&select=id,name&order=name`))
const co=(i)=>companies[i%companies.length]
const contactOf=async(cid)=> (await selectOne("contacts",{tenant_id:T,company_id:cid},"id"))?.id ?? null
const techs=(await q(`technicians?tenant_id=eq.${T}&deleted_at=is.null&select=id,first_name&order=first_name`)).filter(x=>x.first_name!=="Tec")
const assets=(await q(`assets?tenant_id=eq.${T}&select=id&order=asset_number`))
console.log(`base: ${companies.length} empresas · ${techs.length} técnicos · ${assets.length} activos`)

// ── CRM: pipeline con movimiento (etapas + estancadas + won/lost) ─────────────
const OPPS=[
  [0,"Renovación de chillers — Centro Andino","machinery",95_000_000,"proposal",55,12,11,3],   // ESTANCADA
  [1,"Contrato mantenimiento anual — Hotel La Fontana","consulting",48_000_000,"negotiation",70,10,1,2],
  [2,"Climatización bloque quirúrgico — Clínica","machinery",120_000_000,"negotiation",60,13,10,5], // ESTANCADA
  [3,"Equipos de cocina — La Brasa Roja","machinery",30_000_000,"proposal",40,9,2,8],
  [4,"Modernización HVAC — Torre Calle 100","machinery",64_000_000,"discovery",30,6,1,15],
  [5,"Mantenimiento preventivo — Bodytech","consulting",18_000_000,"new",15,3,1,20],
  [6,"Cuartos fríos — Frigorífico del Valle","consulting",42_000_000,"won",100,14,2,-1],
  [0,"Repotenciación A/A oficinas — Andino","machinery",26_000_000,"won",100,12,4,-3],
  [2,"Ampliación de ductos — Clínica","machinery",38_000_000,"won",100,11,3,-2],
  [1,"Piloto sensores IoT — La Fontana","consulting",22_000_000,"lost",0,13,5,-4],
]
let nOpp=0
for(const [ci,name,bt,val,status,prob,cAgo,uAgo,closeIn] of OPPS){
  if(await selectOne("opportunities",{tenant_id:T,name},"id")) continue
  const c=co(ci)
  await insert("opportunities",{tenant_id:T,company_id:c.id,contact_id:await contactOf(c.id),business_type:bt,name,
    estimated_value:val,status,probability:prob,expected_close_date:dateOnly(closeIn>=0?fromNowH(closeIn*24):dAgo(-closeIn)),
    description:"Oportunidad del cierre de mes.",created_at:dAgo(cAgo),updated_at:dAgo(uAgo)},"id")
  nOpp++
}
console.log(`✓ CRM: ${nOpp} oportunidades (pipeline + 3 ganadas + 1 perdida + 2 estancadas)`)

// ── SERVICIO: casos con SLA ~90% (al límite + pocos incumplidos) ──────────────
// kind: met(resuelto a tiempo) | breach(resuelto tarde) | risk(abierto cerca SLA) | ok_open(abierto en tiempo)
const CASES=[
  ["Mantenimiento correctivo A/A — oficina 3","resolved","medium","met",5,0],
  ["Cambio de filtros — unidad central","resolved","low","met",4,1],
  ["Fuga de refrigerante — azotea","resolved","high","met",6,2],
  ["Termostato sin respuesta — sala juntas","closed","medium","met",8,3],
  ["Ruido en manejadora — piso 2","resolved","medium","met",3,4],
  ["Limpieza de condensador","resolved","low","met",7,5],
  ["Reemplazo de capacitor — compresor","resolved","high","met",2,6],
  ["Calibración de control","closed","medium","met",9,7],
  ["Sin enfriamiento servidores (atendido tarde)","resolved","critical","breach",1,8],
  ["Falla crítica A/A quirófano — en proceso","working","critical","risk",0,9],   // abierto, cerca SLA
  ["Goteo en cava — revisión","escalated","high","risk",1,0],                        // escalado, cerca SLA
  ["Revisión preventiva — lobby","waiting_customer","medium","ok_open",1,1],
  ["Cotización de repuesto — recepción","new","low","ok_open",0,2],
]
let nCase=0, nByAsset=0
for(const [subject,status,priority,kind,cAgo,assetIdx] of CASES){
  if(await selectOne("cases",{tenant_id:T,subject},"id")){continue}
  const c=co(assetIdx)
  const assetId = assets[assetIdx]?.id ?? null
  let sla_due_at=null, resolved_at=null, closed_at=null
  if(kind==="met"){ resolved_at=dAgo(cAgo); sla_due_at=H2(cAgo*24-2) }            // due después de resolver
  else if(kind==="breach"){ resolved_at=dAgo(cAgo); sla_due_at=H2(cAgo*24+6) }   // due antes de resolver
  else if(kind==="risk"){ sla_due_at=fromNowH(2) }                                // abierto, vence en 2h
  else if(kind==="ok_open"){ sla_due_at=fromNowH(20) }                            // abierto, holgado
  if(status==="closed") closed_at=resolved_at
  const row={tenant_id:T,subject,description:"Caso de servicio.",status,priority,origin:"web",
    company_id:c.id,contact_id:await contactOf(c.id),reporter_email:"demo@cliente.demo",
    sla_due_at,resolved_at,closed_at,created_at:dAgo(cAgo+1)}
  if(assetId && assetIdx<6){ row.asset_id=assetId; nByAsset++ }
  await insWithNum("cases",row,"case_number","next_case_number",T,"id")
  nCase++
}
console.log(`✓ Servicio: ${nCase} casos (≈92% SLA, 1 incumplido, 2 al límite) · ${nByAsset} ligados a activos`)

// ── FIELD: órdenes completadas DESIGUAL entre técnicos + abiertas/hoy ─────────
// Carga histórica desigual: tech0=5, tech1=4, tech2=3, tech3=2, tech4=1
const LOAD=[5,4,3,2,1]
let nWO=0
for(let ti=0; ti<LOAD.length && ti<techs.length; ti++){
  for(let k=0;k<LOAD[ti];k++){
    const subject=`Servicio completado — ${techs[ti].first_name} #${k+1}`
    if(await selectOne("work_orders",{tenant_id:T,subject},"id")) continue
    const c=co(ti+k)
    const startAgo=(ti+k)%12 + 1           // repartidas en ~12 días
    const durH=2+((ti+k)%4)                 // 2..5h → promedio ~3.5h
    const caseRow=await insWithNum("cases",{tenant_id:T,subject:`(WO) ${subject}`,description:"Orden ejecutada.",
      status:"closed",priority:"medium",origin:"web",company_id:c.id,contact_id:await contactOf(c.id),
      reporter_email:"demo@cliente.demo",resolved_at:dAgo(startAgo),closed_at:dAgo(startAgo),created_at:dAgo(startAgo+1),
      ...(assets[(ti+k)%assets.length]?{asset_id:assets[(ti+k)%assets.length].id}:{})},
      "case_number","next_case_number",T,"id")
    const wo=await insWithNum("work_orders",{tenant_id:T,case_id:caseRow.id,company_id:c.id,subject,
      description:"Intervención de campo.",priority:"medium",status:"completed",
      scheduled_start:H2(startAgo*24+durH),scheduled_end:dAgo(startAgo),
      actual_start:H2(startAgo*24+durH),actual_end:dAgo(startAgo),labor_hours:durH,billable:true,
      created_at:dAgo(startAgo+1)},"work_order_number","next_work_order_number",T,"id")
    await update("cases",{tenant_id:T,id:caseRow.id},{work_order_id:wo.id})
    await insert("work_order_assignments",{tenant_id:T,work_order_id:wo.id,technician_id:techs[ti].id,
      scheduled_start:H2(startAgo*24+durH),scheduled_end:dAgo(startAgo),estimated_duration_minutes:durH*60,status:"completed"},"id")
    nWO++
  }
}
// Algunas abiertas/programadas (pendientes) sobre 2 técnicos, para hoy/mañana
let nOpen=0
for(let k=0;k<3;k++){
  const subject=`Orden programada — pendiente #${k+1}`
  if(await selectOne("work_orders",{tenant_id:T,subject},"id")) continue
  const c=co(k+2)
  const caseRow=await insWithNum("cases",{tenant_id:T,subject:`(WO) ${subject}`,description:"Pendiente.",status:"new",
    priority:k===0?"high":"medium",origin:"web",company_id:c.id,contact_id:await contactOf(c.id),reporter_email:"demo@cliente.demo",
    created_at:dAgo(1)},"case_number","next_case_number",T,"id")
  const wo=await insWithNum("work_orders",{tenant_id:T,case_id:caseRow.id,company_id:c.id,subject,
    description:"Programada.",priority:k===0?"high":"medium",status:"scheduled",
    scheduled_start:fromNowH(6+k*24),scheduled_end:fromNowH(9+k*24),created_at:dAgo(1)},
    "work_order_number","next_work_order_number",T,"id")
  await update("cases",{tenant_id:T,id:caseRow.id},{work_order_id:wo.id})
  await insert("work_order_assignments",{tenant_id:T,work_order_id:wo.id,technician_id:techs[k%2].id,
    scheduled_start:fromNowH(6+k*24),scheduled_end:fromNowH(9+k*24),estimated_duration_minutes:180,status:"scheduled"},"id")
  nOpen++
}
console.log(`✓ Field: ${nWO} órdenes completadas (carga desigual ${LOAD.join("/")}) + ${nOpen} programadas`)

console.log("\n✓ ESCENARIO DE CIERRE DE MES LISTO. Recarga los dashboards.")
