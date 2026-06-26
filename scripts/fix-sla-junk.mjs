// Saca de SLA los casos basura viejos ("Refrigeracion") que arrastran el cumplimiento.
import { readFileSync } from "node:fs"
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}))
const URL=env.NEXT_PUBLIC_SUPABASE_URL, KEY=env.SUPABASE_SERVICE_ROLE_KEY
if(!URL.includes("oyjvnzjdgbzwojmjjlyn")) throw new Error("ABORT: no es staging")
const H={apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"}
const q=async(p,o={})=>{const r=await fetch(`${URL}/rest/v1/${p}`,{...o,headers:{...H,...o.headers}});const t=await r.text();if(!r.ok)throw new Error(`${p} ${r.status} ${t}`);return t?JSON.parse(t):null}
const [t]=await q(`tenants?slug=eq.staging-test&select=id`); const T=t.id
const junk=await q(`cases?tenant_id=eq.${T}&subject=ilike.*Refrigeracion*&sla_due_at=not.is.null&select=id`)
for(const c of junk) await q(`cases?tenant_id=eq.${T}&id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sla_due_at:null})})
console.log(`✓ ${junk.length} casos basura fuera de SLA`)
