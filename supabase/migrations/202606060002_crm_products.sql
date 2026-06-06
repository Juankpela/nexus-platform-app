-- Group 8 — Products & Price Books (v2, replaces previous draft)
--
-- Products: physical goods, services, machinery, spare parts sold by Huella Global.
-- Price Books: named price lists per customer segment (Standard, Wholesale, Corporate…).
-- Price Book Entries: the only place unit prices are stored; products belong to many
--   price books; each entry carries its own UUID so Quote line items can reference it
--   directly without denormalising the price.
--
-- No DELETE on any table — use the active flag.
-- Tenant-isolated, RBAC-gated (has_tenant_permission), audited at application layer.
-- Additive + idempotent (safe to re-run).

-- ── Drop previous draft ─────────────────────────────────────────────────────
-- (from 202606060002 first run — drop in FK order)
drop table if exists public.price_book_entries;
drop table if exists public.price_books;
drop table if exists public.products;
drop type  if exists public.product_category;   -- old name

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_type') then
    create type public.product_type as enum (
      'physical_product', 'service', 'machinery', 'spare_part'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'product_family') then
    create type public.product_family as enum (
      'flexography', 'inks', 'consumables', 'machinery',
      'technical_services', 'consulting'
    );
  end if;
end
$$;

-- ── Products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              uuid          primary key default gen_random_uuid(),
  tenant_id       uuid          not null references public.tenants(id) on delete cascade,
  sku             text,
  name            text          not null check (char_length(name) between 1 and 200),
  description     text,
  product_type    public.product_type   not null,
  product_family  public.product_family not null,
  unit_of_measure text,
  active          boolean       not null default true,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  unique (id, tenant_id)
);

create index if not exists products_tenant_active_name_idx
  on public.products (tenant_id, active, name);
create index if not exists products_tenant_type_idx
  on public.products (tenant_id, product_type);
create index if not exists products_tenant_family_idx
  on public.products (tenant_id, product_family);
create index if not exists products_sku_idx
  on public.products (tenant_id, sku) where sku is not null;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ── Price Books ─────────────────────────────────────────────────────────────
create table if not exists public.price_books (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  name        text        not null check (char_length(name) between 1 and 200),
  description text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id)
);

create index if not exists price_books_tenant_active_name_idx
  on public.price_books (tenant_id, active, name);

drop trigger if exists price_books_set_updated_at on public.price_books;
create trigger price_books_set_updated_at
  before update on public.price_books
  for each row execute function public.set_updated_at();

-- ── Price Book Entries ───────────────────────────────────────────────────────
-- Each entry has its own UUID so Quote line items can reference it directly.
-- The business key is (price_book_id, product_id) — kept unique.
create table if not exists public.price_book_entries (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  price_book_id uuid        not null,
  product_id    uuid        not null,
  unit_price    numeric(14, 2) not null check (unit_price >= 0),
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (price_book_id, product_id),
  foreign key (price_book_id, tenant_id)
    references public.price_books (id, tenant_id) on delete cascade,
  foreign key (product_id, tenant_id)
    references public.products (id, tenant_id) on delete cascade
);

create index if not exists price_book_entries_book_active_idx
  on public.price_book_entries (price_book_id, active);
create index if not exists price_book_entries_product_idx
  on public.price_book_entries (tenant_id, product_id, active);

drop trigger if exists price_book_entries_set_updated_at on public.price_book_entries;
create trigger price_book_entries_set_updated_at
  before update on public.price_book_entries
  for each row execute function public.set_updated_at();

-- ── Permissions ─────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('crm.products.read',    'View the product catalog'),
  ('crm.products.write',   'Create, edit, and import products'),
  ('crm.pricebooks.read',  'View price books and their entries'),
  ('crm.pricebooks.write', 'Create and edit price books and entries')
on conflict (key) do nothing;

-- Grant read + write to tenant_admin and sales_representative
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in (
    'crm.products.read',  'crm.products.write',
    'crm.pricebooks.read','crm.pricebooks.write'
  )
where r.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

-- Grant read-only to supervisor
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in ('crm.products.read', 'crm.pricebooks.read')
where r.key = 'supervisor'
on conflict do nothing;

-- ── RLS — products ──────────────────────────────────────────────────────────
alter table public.products enable row level security;

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.products.read'));

drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'crm.products.write'));

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'crm.products.write'))
  with check (public.has_tenant_permission(tenant_id, 'crm.products.write'));

-- ── RLS — price_books ───────────────────────────────────────────────────────
alter table public.price_books enable row level security;

drop policy if exists "price_books_select" on public.price_books;
create policy "price_books_select" on public.price_books
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.pricebooks.read'));

drop policy if exists "price_books_insert" on public.price_books;
create policy "price_books_insert" on public.price_books
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'crm.pricebooks.write'));

drop policy if exists "price_books_update" on public.price_books;
create policy "price_books_update" on public.price_books
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'crm.pricebooks.write'))
  with check (public.has_tenant_permission(tenant_id, 'crm.pricebooks.write'));

-- ── RLS — price_book_entries ─────────────────────────────────────────────────
alter table public.price_book_entries enable row level security;

drop policy if exists "price_book_entries_select" on public.price_book_entries;
create policy "price_book_entries_select" on public.price_book_entries
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'crm.pricebooks.read'));

drop policy if exists "price_book_entries_insert" on public.price_book_entries;
create policy "price_book_entries_insert" on public.price_book_entries
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'crm.pricebooks.write'));

drop policy if exists "price_book_entries_update" on public.price_book_entries;
create policy "price_book_entries_update" on public.price_book_entries
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'crm.pricebooks.write'))
  with check (public.has_tenant_permission(tenant_id, 'crm.pricebooks.write'));
