-- INV-1 — Inventory & Materials Core, Sprint A: SCHEMA (ADR-023)
--
-- Bounded context `inventory`. Ledger-backed stock: inventory_transactions is the
-- immutable source of truth; inventory_items is a derived snapshot kept atomically
-- by SECURITY DEFINER RPCs (added in Sprint D — this migration is schema-only).
--
-- Design (ADR-023 + approved revision):
--   * materials ≠ products (optional link via materials.product_id).
--   * Single implicit location in INV-1 (inventory_locations → INV-3).
--   * Reservation is OPTIONAL and modeled as an aggregate counter (quantity_reserved);
--     consumption may draw from it via the RPC's fulfill_reservation flag (Sprint D).
--   * reference_type / reference_id are TRACE-ONLY: stock math depends ONLY on `type`,
--     never on the reference. No hard FK to work_orders/executions (polymorphic).
--
-- Tenant isolation, RLS (has_tenant_permission), composite FKs, no-DELETE: identical
-- to the rest of NEXUS. Additive + idempotent (safe to re-run). NOT YET APPLIED.

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_transaction_type') then
    create type public.inventory_transaction_type as enum (
      'receipt', 'consumption', 'adjustment', 'reservation', 'release'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'inventory_reference_type') then
    create type public.inventory_reference_type as enum (
      'work_order', 'work_order_execution', 'manual', 'reconciliation'
    );
  end if;
end
$$;

-- ── Materials (consumable/material catalog) ──────────────────────────────────
create table if not exists public.materials (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  product_id      uuid,
  sku             text,
  name            text        not null check (char_length(name) between 1 and 200),
  description     text,
  unit_of_measure text        not null check (char_length(unit_of_measure) between 1 and 20),
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, tenant_id),
  -- Optional link to the sellable catalog; null = internal-only material.
  -- on delete set null: removing a product must not delete the physical material.
  foreign key (product_id, tenant_id)
    references public.products (id, tenant_id) on delete set null
);

-- SKU unique per tenant only when present (SKU is optional).
create unique index if not exists materials_tenant_sku_uidx
  on public.materials (tenant_id, sku) where sku is not null;
-- Dominant UI query: active materials by name.
create index if not exists materials_tenant_active_name_idx
  on public.materials (tenant_id, active, name);
-- Reverse lookup material ← product (partial: most materials have no product).
create index if not exists materials_tenant_product_idx
  on public.materials (tenant_id, product_id) where product_id is not null;

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ── Inventory Items (per-material stock snapshot, derived from the ledger) ────
create table if not exists public.inventory_items (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null references public.tenants(id) on delete cascade,
  material_id        uuid          not null,
  quantity_on_hand   numeric(14,4) not null default 0,
  quantity_reserved  numeric(14,4) not null default 0,
  -- available is ALWAYS on_hand - reserved; generated STORED so it cannot drift
  -- and is indexable. Nobody writes it.
  quantity_available numeric(14,4) generated always as
                       (quantity_on_hand - quantity_reserved) stored,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now(),
  unique (id, tenant_id),
  -- One snapshot per material per tenant (single implicit location, INV-1).
  -- This is the row RPCs lock (FOR UPDATE) and the first receipt upserts onto.
  unique (tenant_id, material_id),
  foreign key (material_id, tenant_id)
    references public.materials (id, tenant_id) on delete restrict,
  -- DB-level anti-oversell: negatives are impossible. reserved <= on_hand keeps
  -- available >= 0 without a CHECK on the generated column.
  constraint inv_item_on_hand_nonneg     check (quantity_on_hand  >= 0),
  constraint inv_item_reserved_nonneg    check (quantity_reserved >= 0),
  constraint inv_item_reserved_le_onhand check (quantity_reserved <= quantity_on_hand)
);

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ── Inventory Transactions (immutable ledger — source of truth) ──────────────
-- APPEND-ONLY: no updated_at, no trigger, no UPDATE/DELETE policies. Mistakes are
-- corrected with a compensating `adjustment`, never by editing history.
create table if not exists public.inventory_transactions (
  id             uuid          primary key default gen_random_uuid(),
  tenant_id      uuid          not null references public.tenants(id) on delete cascade,
  material_id    uuid          not null,
  type           public.inventory_transaction_type not null,
  quantity       numeric(14,4) not null,
  reference_type public.inventory_reference_type   not null default 'manual',
  reference_id   uuid,
  -- Actor at the time of the event. No FK on purpose (immutable-ledger pattern,
  -- mirrors audit_events.actor_id): attribution must survive user deletion. The
  -- value is captured from auth.uid() by the RPC, so it is always valid at write.
  created_by     uuid          not null,
  created_at     timestamptz   not null default now(),
  unique (id, tenant_id),
  foreign key (material_id, tenant_id)
    references public.materials (id, tenant_id) on delete restrict,
  -- `adjustment` is the only signed correction: quantity < 0 lowers on_hand
  -- (shrinkage/loss/count-down), quantity > 0 raises it (found stock). Every other
  -- type carries a positive magnitude; the `type` implies the direction.
  constraint inv_tx_qty_sign check (
    (type =  'adjustment' and quantity <> 0) or
    (type <> 'adjustment' and quantity >  0)
  ),
  -- Reference shape: manual/reconciliation have no ref; work_order(_execution) require one.
  constraint inv_tx_reference_shape check (
    (reference_type in ('manual','reconciliation')        and reference_id is null) or
    (reference_type in ('work_order','work_order_execution') and reference_id is not null)
  )
);

-- Per-material history (chronological) + feeds reconciliation Σ.
create index if not exists inv_tx_tenant_material_time_idx
  on public.inventory_transactions (tenant_id, material_id, created_at desc);
-- Reporting "consumption by Work Order" (partial: manual has no ref).
create index if not exists inv_tx_tenant_reference_idx
  on public.inventory_transactions (tenant_id, reference_type, reference_id)
  where reference_id is not null;
-- Global recent-movements feed for the tenant.
create index if not exists inv_tx_tenant_time_idx
  on public.inventory_transactions (tenant_id, created_at desc);

-- ── Permissions ──────────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('inventory.materials.read',  'View material catalog'),
  ('inventory.materials.write', 'Create/update materials'),
  ('inventory.stock.read',      'View stock levels and movements'),
  ('inventory.stock.manage',    'Receive, adjust, reserve and release stock'),
  ('inventory.consume',         'Consume materials against field work')
on conflict (key) do nothing;

-- tenant_admin + supervisor: full inventory control.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.materials.read', 'inventory.materials.write',
  'inventory.stock.read', 'inventory.stock.manage', 'inventory.consume'
)
where r.key in ('tenant_admin', 'supervisor')
on conflict do nothing;

-- technician: least privilege — read catalog/stock + consume in the field only.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.materials.read', 'inventory.stock.read', 'inventory.consume'
)
where r.key = 'technician'
on conflict do nothing;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.materials              enable row level security;
alter table public.inventory_items        enable row level security;
alter table public.inventory_transactions enable row level security;

-- materials: read for viewers, write for managers (plain catalog, no concurrency invariants).
drop policy if exists materials_select on public.materials;
create policy materials_select on public.materials for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'inventory.materials.read'));
drop policy if exists materials_insert on public.materials;
create policy materials_insert on public.materials for insert to authenticated
  with check (public.has_tenant_permission(tenant_id, 'inventory.materials.write'));
drop policy if exists materials_update on public.materials;
create policy materials_update on public.materials for update to authenticated
  using      (public.has_tenant_permission(tenant_id, 'inventory.materials.write'))
  with check (public.has_tenant_permission(tenant_id, 'inventory.materials.write'));

-- inventory_items: READ-ONLY. No write policies → only SECURITY DEFINER RPCs
-- (Sprint D, which bypass RLS as owner) may mutate the snapshot.
drop policy if exists inventory_items_select on public.inventory_items;
create policy inventory_items_select on public.inventory_items for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'inventory.stock.read'));

-- inventory_transactions: READ-ONLY (append-only ledger). No write policies → only
-- RPCs may append; nobody may update/delete, ever.
drop policy if exists inventory_transactions_select on public.inventory_transactions;
create policy inventory_transactions_select on public.inventory_transactions for select to authenticated
  using (public.has_tenant_permission(tenant_id, 'inventory.stock.read'));
