-- E3 — Payments · Revenue Operations
--
-- Closes the money loop: a Payment records cash received against one or more issued
-- invoices (multi-invoice allocation), driving invoice balance and status
-- (partially_paid / paid). Manual registration first; method is an open text
-- attribute + external reference, so payment gateways (Wompi/PSE/Mercado Pago) plug
-- in later without redesign (REVENUE-OPERATIONS-SPEC §4).
--
-- Decisions (2026-06-11): application-layer logic (consistent with E1/E2; the
-- record/reverse flow is sequenced in the repository, not an atomic RPC — the
-- non-atomicity of multi-invoice writes is documented as accepted risk). Permissions
-- are read/write (reverse is gated by write).
--
-- Model: payments (header) + payment_allocations (amount applied per invoice).
-- payment_number is a per-tenant consecutive for traceability (not a fiscal number).

-- ── Payment status enum ───────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('recorded', 'reversed');
  end if;
end
$$;

-- ── Consecutive numbering ─────────────────────────────────────────────────────
create table if not exists public.payment_sequences (
  tenant_id uuid    not null references public.tenants(id) on delete cascade,
  year      integer not null,
  last_seq  integer not null default 0,
  primary key (tenant_id, year)
);

create or replace function public.next_payment_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_seq  integer;
begin
  v_year := extract(year from now())::integer;
  insert into public.payment_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = payment_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('PAY-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

-- ── Payments ──────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id             uuid                  primary key default gen_random_uuid(),
  tenant_id      uuid                  not null references public.tenants(id) on delete cascade,
  payment_number text                  not null,
  company_id     uuid                  not null,
  payment_date   date                  not null,
  -- Open attribute (extensible), not an enum: transfer/cash/check/card/other/gateway.
  method         text                  not null,
  reference      text,
  note           text,
  amount         numeric(14, 2)        not null check (amount > 0),
  status         public.payment_status not null default 'recorded',
  reversed_at    timestamptz,
  reversed_by    uuid                  references auth.users(id) on delete set null,
  reverse_reason text,
  created_at     timestamptz           not null default now(),
  updated_at     timestamptz           not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, payment_number),
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete restrict
);

create index if not exists payments_tenant_company_idx
  on public.payments (tenant_id, company_id);
create index if not exists payments_tenant_status_idx
  on public.payments (tenant_id, status);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ── Payment allocations (amount applied to each invoice) ──────────────────────
create table if not exists public.payment_allocations (
  id          uuid           primary key default gen_random_uuid(),
  tenant_id   uuid           not null references public.tenants(id) on delete cascade,
  payment_id  uuid           not null,
  invoice_id  uuid           not null,
  amount      numeric(14, 2) not null check (amount > 0),
  created_at  timestamptz    not null default now(),
  unique (id, tenant_id),
  foreign key (payment_id, tenant_id)
    references public.payments (id, tenant_id) on delete cascade,
  foreign key (invoice_id, tenant_id)
    references public.invoices (id, tenant_id) on delete restrict
);

create index if not exists payment_allocations_payment_idx
  on public.payment_allocations (payment_id);
create index if not exists payment_allocations_invoice_idx
  on public.payment_allocations (tenant_id, invoice_id);

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('billing.payments.read',  'View payments and allocations'),
  ('billing.payments.write', 'Record and reverse payments')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('billing.payments.read', 'billing.payments.write')
where r.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'billing.payments.read'
where r.key = 'supervisor'
on conflict do nothing;

-- ── Allow payment writers to update invoice balance/status ────────────────────
-- Recording/reversing a payment updates invoices.amount_paid and status from the
-- application layer; widen the invoices UPDATE policy to admit billing.payments.write
-- (coarse RLS; the precise gate stays in presentation).
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices
  for update to authenticated
  using  (
    public.has_tenant_permission(tenant_id, 'billing.invoices.write') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.issue') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.void')  or
    public.has_tenant_permission(tenant_id, 'billing.payments.write')
  )
  with check (
    public.has_tenant_permission(tenant_id, 'billing.invoices.write') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.issue') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.void')  or
    public.has_tenant_permission(tenant_id, 'billing.payments.write')
  );

-- ── RLS — payments ───────────────────────────────────────────────────────────
alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.payments.read'));

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'billing.payments.write'));

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'billing.payments.write'))
  with check (public.has_tenant_permission(tenant_id, 'billing.payments.write'));

-- ── RLS — payment_allocations ────────────────────────────────────────────────
alter table public.payment_allocations enable row level security;

drop policy if exists "payment_allocations_select" on public.payment_allocations;
create policy "payment_allocations_select" on public.payment_allocations
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.payments.read'));

drop policy if exists "payment_allocations_insert" on public.payment_allocations;
create policy "payment_allocations_insert" on public.payment_allocations
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'billing.payments.write'));

drop policy if exists "payment_allocations_delete" on public.payment_allocations;
create policy "payment_allocations_delete" on public.payment_allocations
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.payments.write'));

-- ── RLS — payment_sequences ──────────────────────────────────────────────────
alter table public.payment_sequences enable row level security;

drop policy if exists "payment_sequences_all" on public.payment_sequences;
create policy "payment_sequences_all" on public.payment_sequences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.payments.write'));
