-- E7 — Leads (Sales Domain) · cierra el tope del embudo
--
-- Lead responde una sola pregunta: "¿vale la pena abrir una oportunidad?".
-- El pipeline vive en Opportunity (no se duplican etapas aquí). Al convertir, el
-- Lead NUNCA se elimina: se marca 'converted' y guarda referencia a la Opportunity
-- generada (trazabilidad). Tenant-isolated, RBAC, auditado en la capa de aplicación.
--
-- Fuera de alcance (no se construye): marketing automation, scoring IA, cadencias,
-- secuencias, campañas, territory, forecasting.

-- ── Lead status enum ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum (
      'new',
      'working',
      'qualified',
      'disqualified',
      'converted'
    );
  end if;
end
$$;

-- ── Leads ─────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                       uuid               primary key default gen_random_uuid(),
  tenant_id                uuid               not null references public.tenants(id) on delete cascade,
  name                     text               not null check (char_length(name) between 1 and 200),
  company                  text,
  email                    text,
  phone                    text,
  -- Open attribute (web/referral/event/cold_call/social/other) for the "leads por fuente" metric.
  source                   text,
  status                   public.lead_status not null default 'new',
  owner_id                 uuid               references auth.users(id) on delete set null,
  notes                    text,
  -- Conversion traceability: the lead is never deleted; it points to its Opportunity.
  converted_opportunity_id uuid,
  converted_at             timestamptz,
  created_at               timestamptz        not null default now(),
  updated_at               timestamptz        not null default now(),
  unique (id, tenant_id),
  foreign key (converted_opportunity_id, tenant_id)
    references public.opportunities (id, tenant_id) on delete set null
);

create index if not exists leads_tenant_status_idx
  on public.leads (tenant_id, status);
create index if not exists leads_tenant_source_idx
  on public.leads (tenant_id, source);
create index if not exists leads_tenant_owner_idx
  on public.leads (tenant_id, owner_id);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('crm.leads.read',  'View leads and funnel metrics'),
  ('crm.leads.write', 'Create, edit, qualify, and convert leads')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('crm.leads.read', 'crm.leads.write')
where r.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'crm.leads.read'
where r.key = 'supervisor'
on conflict do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.leads enable row level security;

drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.leads.read'));

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'crm.leads.write'));

drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'crm.leads.write'))
  with check (public.has_tenant_permission(tenant_id, 'crm.leads.write'));
