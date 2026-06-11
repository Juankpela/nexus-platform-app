-- E1 — Invoice (Polimórfica) · Revenue Operations
--
-- Invoice: single point of cash convergence for the three official flows.
-- Polymorphic origin: an invoice is born from a Work Order (Flow B/C) or a
-- Sales Order (Flow A). Exactly one origin; never orphan.
-- Numbering: fiscal consecutive assigned ONLY at issuance (drafts have no number).
-- Immutability: once 'issued', the invoice is frozen (enforced at application layer
--   and guarded here by status). Corrections happen via void / future credit notes.
-- Lines denormalize their description/price so an issued invoice never changes even
--   if the source product/work order is later edited.
-- Tenant-isolated, RBAC-gated (has_tenant_permission), audited at application layer.
--
-- NOTE: sales_order_id is reserved here (no FK yet) because Sales Order (E6) does not
--   exist. Its composite FK is added in the E6 migration. The active origin in E1 is
--   work_order. This is the "designed seam" from PRODUCT-VISION-FREEZE §4–§5.

-- ── Invoice status enum ───────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum (
      'draft',
      'issued',
      'partially_paid',
      'paid',
      'void'
    );
  end if;
end
$$;

-- ── Invoice origin type enum ──────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_origin_type') then
    create type public.invoice_origin_type as enum (
      'work_order',
      'sales_order'
    );
  end if;
end
$$;

-- ── Atomic invoice numbering ──────────────────────────────────────────────────
create table if not exists public.invoice_sequences (
  tenant_id  uuid    not null references public.tenants(id) on delete cascade,
  year       integer not null,
  last_seq   integer not null default 0,
  primary key (tenant_id, year)
);

create or replace function public.next_invoice_number(p_tenant_id uuid)
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
  insert into public.invoice_sequences (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id, year) do update
    set last_seq = invoice_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('INV-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

-- ── Invoices ──────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id              uuid                       primary key default gen_random_uuid(),
  tenant_id       uuid                       not null references public.tenants(id) on delete cascade,
  -- Fiscal number is NULL while draft; assigned at issuance (consecutive, gap-free).
  invoice_number  text,
  origin_type     public.invoice_origin_type not null,
  work_order_id   uuid,
  sales_order_id  uuid,  -- reserved; FK added in E6 (Sales Order) migration
  company_id      uuid                       not null,
  contact_id      uuid,
  status          public.invoice_status      not null default 'draft',
  currency        text                       not null default 'COP',
  subtotal        numeric(14, 2)             not null default 0,
  discount_amount numeric(14, 2)             not null default 0 check (discount_amount >= 0),
  tax_amount      numeric(14, 2)             not null default 0 check (tax_amount >= 0),
  total_amount    numeric(14, 2)             not null default 0,
  amount_paid     numeric(14, 2)             not null default 0 check (amount_paid >= 0),
  issue_date      date,
  due_date        date,
  payment_terms   text,
  notes           text,
  void_reason     text,
  created_at      timestamptz                not null default now(),
  updated_at      timestamptz                not null default now(),
  unique (id, tenant_id),
  -- Consecutive fiscal number unique per tenant; multiple NULLs (drafts) allowed.
  unique (tenant_id, invoice_number),
  -- Exactly one origin id present, matching the declared origin_type.
  constraint invoices_origin_chk check (
    (origin_type = 'work_order'  and work_order_id  is not null and sales_order_id is null) or
    (origin_type = 'sales_order' and sales_order_id is not null and work_order_id  is null)
  ),
  foreign key (work_order_id, tenant_id)
    references public.work_orders (id, tenant_id) on delete set null,
  foreign key (company_id, tenant_id)
    references public.companies (id, tenant_id) on delete restrict,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

create index if not exists invoices_tenant_status_idx
  on public.invoices (tenant_id, status);
create index if not exists invoices_tenant_company_idx
  on public.invoices (tenant_id, company_id);
create index if not exists invoices_tenant_number_idx
  on public.invoices (tenant_id, invoice_number);
create index if not exists invoices_work_order_idx
  on public.invoices (tenant_id, work_order_id);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ── Invoice Lines ─────────────────────────────────────────────────────────────
-- Lines denormalize description/sku so an issued invoice is a permanent record,
-- independent of later edits to the source product or work order.
create table if not exists public.invoice_lines (
  id              uuid           primary key default gen_random_uuid(),
  tenant_id       uuid           not null references public.tenants(id) on delete cascade,
  invoice_id      uuid           not null,
  product_id      uuid,
  description     text           not null check (char_length(description) between 1 and 300),
  quantity        numeric(14, 4) not null check (quantity > 0),
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  discount_amount numeric(14, 2) not null default 0 check (discount_amount >= 0),
  tax_rate        numeric(6, 4)  not null default 0 check (tax_rate >= 0),
  tax_amount      numeric(14, 2) not null default 0 check (tax_amount >= 0),
  line_total      numeric(14, 2) not null default 0,
  sort_order      integer        not null default 0,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now(),
  unique (id, tenant_id),
  foreign key (invoice_id, tenant_id)
    references public.invoices (id, tenant_id) on delete cascade,
  foreign key (product_id, tenant_id)
    references public.products (id, tenant_id) on delete set null
);

create index if not exists invoice_lines_invoice_idx
  on public.invoice_lines (invoice_id, sort_order);

drop trigger if exists invoice_lines_set_updated_at on public.invoice_lines;
create trigger invoice_lines_set_updated_at
  before update on public.invoice_lines
  for each row execute function public.set_updated_at();

-- ── Permissions ──────────────────────────────────────────────────────────────
-- Granular by design: issuing and voiding are distinct from creating/editing a
-- draft. Initially the same roles hold all four, but the seam exists from day 1 so
-- future back-office / accounting roles need no refactor (frozen 2026-06-10).
insert into public.permissions (key, description) values
  ('billing.invoices.read',  'View invoices and their line items'),
  ('billing.invoices.write', 'Create and edit invoice drafts'),
  ('billing.invoices.issue', 'Issue invoices (assign fiscal number, make immutable)'),
  ('billing.invoices.void',  'Void issued invoices')
on conflict (key) do nothing;

-- tenant_admin and sales_representative get full billing access initially
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'billing.invoices.read',
  'billing.invoices.write',
  'billing.invoices.issue',
  'billing.invoices.void'
)
where r.key in ('tenant_admin', 'sales_representative')
on conflict do nothing;

-- supervisor gets read-only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'billing.invoices.read'
where r.key = 'supervisor'
on conflict do nothing;

-- ── RLS — invoices ───────────────────────────────────────────────────────────
alter table public.invoices enable row level security;

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.invoices.read'));

drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'billing.invoices.write'));

-- Editing a draft, issuing, and voiding are all UPDATEs at the DB level. RLS is the
-- coarse tenancy/permission backstop (any billing mutation permission); the precise
-- per-action gate (write vs issue vs void) is enforced in the presentation layer.
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices
  for update to authenticated
  using  (
    public.has_tenant_permission(tenant_id, 'billing.invoices.write') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.issue') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.void')
  )
  with check (
    public.has_tenant_permission(tenant_id, 'billing.invoices.write') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.issue') or
    public.has_tenant_permission(tenant_id, 'billing.invoices.void')
  );

-- ── RLS — invoice_lines ──────────────────────────────────────────────────────
alter table public.invoice_lines enable row level security;

drop policy if exists "invoice_lines_select" on public.invoice_lines;
create policy "invoice_lines_select" on public.invoice_lines
  for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.invoices.read'));

drop policy if exists "invoice_lines_insert" on public.invoice_lines;
create policy "invoice_lines_insert" on public.invoice_lines
  for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'billing.invoices.write'));

drop policy if exists "invoice_lines_update" on public.invoice_lines;
create policy "invoice_lines_update" on public.invoice_lines
  for update to authenticated
  using  (public.has_tenant_permission(tenant_id, 'billing.invoices.write'))
  with check (public.has_tenant_permission(tenant_id, 'billing.invoices.write'));

drop policy if exists "invoice_lines_delete" on public.invoice_lines;
create policy "invoice_lines_delete" on public.invoice_lines
  for delete to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.invoices.write'));

-- ── RLS — invoice_sequences ──────────────────────────────────────────────────
alter table public.invoice_sequences enable row level security;

drop policy if exists "invoice_sequences_all" on public.invoice_sequences;
create policy "invoice_sequences_all" on public.invoice_sequences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'billing.invoices.write'));
