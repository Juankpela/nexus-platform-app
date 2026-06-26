// PREP DEMO (STAGING) — un solo comando para dejar la demo lista.
// Hace dos cosas que el agente no puede ejecutar (escrituras a la BD compartida):
//   1) Otorga el permiso nlabs.read a tenant_admin/supervisor (replica idempotente
//      de la migración 20260625001) → N-LABS deja de dar 404.
//   2) Cierra los casos basura viejos "Refrigeracion" sin orden, que llenan el
//      dashboard de 9 alertas rojas. Deja el caso "abierto" intencional de la demo.
// Solo STAGING. Idempotente. Uso:  node scripts/prep-demo-staging.mjs
import { readFileSync } from "node:fs"
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}))
const URL=env.NEXT_PUBLIC_SUPABASE_URL, KEY=env.SUPABASE_SERVICE_ROLE_KEY
if(!URL.includes("oyjvnzjdgbzwojmjjlyn")) throw new Error("ABORT: no es staging")
const H={apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"}
const q=async(p,o={})=>{const r=await fetch(`${URL}/rest/v1/${p}`,{...o,headers:{...H,...o.headers}});const t=await r.text();if(!r.ok)throw new Error(`${p} ${r.status} ${t}`);return t?JSON.parse(t):null}

// 1) Permiso nlabs.read + grants
let [perm]=await q(`permissions?key=eq.nlabs.read&select=id`)
if(!perm){[perm]=await q(`permissions`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({key:"nlabs.read",description:"View N-LABS operational intelligence (read-only)"})});console.log("✓ permiso nlabs.read creado")}
else console.log("= permiso nlabs.read ya existe")
const roles=await q(`roles?key=in.(tenant_admin,supervisor)&select=id,key`)
for(const r of roles){
  const ex=await q(`role_permissions?role_id=eq.${r.id}&permission_id=eq.${perm.id}&select=role_id`)
  if(ex.length===0){await q(`role_permissions`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({role_id:r.id,permission_id:perm.id})});console.log(`✓ grant ${r.key}`)}
  else console.log(`= ${r.key} ya tenía el grant`)
}

// 2) Cerrar casos basura viejos (Refrigeracion sin orden) — limpia el dashboard
const [t]=await q(`tenants?slug=eq.staging-test&select=id`); const T=t.id
const junk=await q(`cases?tenant_id=eq.${T}&work_order_id=is.null&subject=ilike.*Refrigeracion*&status=neq.closed&select=id,case_number`)
for(const c of junk){
  await q(`cases?tenant_id=eq.${T}&id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"closed"})})
}
console.log(`✓ ${junk.length} casos basura cerrados (dashboard limpio; queda 1 caso abierto intencional)`)
console.log("\nLISTO. N-LABS accesible + dashboard bajo control. Reinicia/abre la app.")
