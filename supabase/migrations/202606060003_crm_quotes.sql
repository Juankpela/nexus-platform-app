-- Group 9 — Quote Management
--
-- Quotes: formal price proposals linked to opportunities/companies/contacts.
-- Quote Lines: individual line items with quantities, prices, and discounts.
-- Versioning: quote_number stays constant; version increments on revision.
-- Numbering: atomic DB function prevents duplicate quote numbers under concurrency.
-- Tenant-isolated, RBAC-gated (has_tenant_permission), audited at application layer.

-- ── Quote status enum ────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type public.quote_status as enum (
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'sent',
      'accepted',
      'expired'
    );
  end if;
end
$$;

-- ── Atomic quote numbering ───────────────────────────────────────────────────
create table if not exists public.quote_sequences (
  tenant_id  uuid    not null references public.tenants(id) on delete cascade,
  year       integer not null,
  last_seq   integer not null default 0,
  primary key (tenant_id, year)
);

create or replace function public.next_quote_number(p_tenant_id uuid)
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
  insert into public.quote_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = quote_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('Q-%s-%s', v_year, lpad(v_seq::text, 3, '0'));
end;
$$;

-- ── Quotes ───────────────────────────────────────────────────────────────────
create table if not exists public.quotes (
  id              uuid                 primary key default gen_random_uuid(),
  tenant_id       uuid                 not null references public.tenants(id) on delete cascade,
  quote_number    text                 not null,
  version         integer              not null default 1 check (version >= 1),
  opportunity_id  uuid,
  company_id      uuid,
  contact_id      uuid,
  price_book_id   uuid,
  status          public.quote_status  not null default 'draft',
  subtotal        numeric(14, 2)       not null default 0,
  discount_amount numeric(14, 2)       not null default 0 check (discount_amount >= 0),
  tax_amount      numeric(14, 2)       not null default 0 check (tax_amount >= 0),
  total_amount    numeric(14, 2)       not null default 0,
  expiration_date date,
  notes           text,
  created_at      timestamptz          not null default now(),
  updated_at      timestamptz          not null default now(),
  unique (tenant_id, quote_number, version),
  unique (id, tenant_id),
  foreign key (opportunity_id, tenant_id)
    references public.opportunities (id, tenant_id) on delete set null,
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null,
  foreign key (price_book_id, tenant_id)
    references public.price_books (id, tenant_id) on delete set null
);

create index if not exists quotes_tenant_status_idx
  on public.quotes (tenant_id, status);
create index if not exists quotes_tenant_number_idx
  on public.quotes (tenant_id, quote_number, version desc);
create index if not exists quotes_company_idx
  on public.quotes (tenant_id, company_id);

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- ── Quote Lines ──────────────────────────────────────────────────────────────
create table if not exists public.quote_lines (
  id              uuid           primary key default gen_random_uuid(),
  tenant_id       uuid           not null references public.tenants(id) on delete cascade,
  quote_id        uuid           not null,
  product_id      uuid           not null,
  quantity        numeric(14, 4) not null check (quantity > 0),
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  discount_amount numeric(14, 2) not null default 0 check (discount_amount >= 0),
  line_total      numeric(14, 2) not null default 0,
  notes           text,
  sort_order      integer        not null default 0,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now(),
  unique (id, tenant_id),
  foreign key (quote_id, tenant_id)
    references public.quotes (id, tenant_id) on delete cascade,
  foreign key (product_id, tenant_id)
    references public.products (id, tenant_id) on delete restrict
);

create index if not exists quote_lines_quote_idx
  on public.quote_lines (quote_id, sort_order);

drop trigger if exists quote_lines_set_updated_at on public.quote_lines;
create trigger quote_lines_set_updated_at
  before update on public.quote_lines
  for each row execute function public.set_updated_at();

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('crm.quotes.read',  'View quotes and their line items'),
  ('crm.quotes.write', 'Create, edit, and manage quote status')
on conflict (key) do nothing;

-- tenant_admin and sales_representative get full access
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('crm.quotes.read', 'crm.quotes.write')
where r.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

-- supervisor gets read-only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'crm.quotes.read'
where r.key = 'supervisor'
on conflict do nothing;

-- ── RLS — quotes ─────────────────────────────────────────────────────────────
alter table public.quotes enable row level security;

drop policy if exists "quotes_select" on public.quotes;
create policy "quotes_select" on public.quotes
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.quotes.read'));

drop policy if exists "quotes_insert" on public.quotes;
create policy "quotes_insert" on public.quotes
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'crm.quotes.write'));

drop policy if exists "quotes_update" on public.quotes;
create policy "quotes_update" on public.quotes
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'crm.quotes.write'))
  with check (public.has_tenant_permission(tenant_id, 'crm.quotes.write'));

-- ── RLS — quote_lines ────────────────────────────────────────────────────────
alter table public.quote_lines enable row level security;

drop policy if exists "quote_lines_select" on public.quote_lines;
create policy "quote_lines_select" on public.quote_lines
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.quotes.read'));

drop policy if exists "quote_lines_insert" on public.quote_lines;
create policy "quote_lines_insert" on public.quote_lines
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'crm.quotes.write'));

drop policy if exists "quote_lines_update" on public.quote_lines;
create policy "quote_lines_update" on public.quote_lines
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'crm.quotes.write'))
  with check (public.has_tenant_permission(tenant_id, 'crm.quotes.write'));

drop policy if exists "quote_lines_delete" on public.quote_lines;
create policy "quote_lines_delete" on public.quote_lines
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.quotes.write'));

-- ── RLS — quote_sequences ────────────────────────────────────────────────────
alter table public.quote_sequences enable row level security;

drop policy if exists "quote_sequences_all" on public.quote_sequences;
create policy "quote_sequences_all" on public.quote_sequences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.quotes.write'));
