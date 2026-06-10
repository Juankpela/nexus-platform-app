-- INV-1 — Sprint D: Inventory RPCs (ADR-023 + Infrastructure Design Review)
--
-- Database-authoritative stock mutations. The stock math lives in ONE core
-- function (`inventory__apply_movement`): lock the snapshot row, append the
-- immutable ledger entry, update the snapshot. Five thin wrappers enforce the
-- per-operation permission and fix the transaction `type`. This is the faithful
-- runtime mirror of the domain (effectOf/evaluateTransaction); parity is verified
-- in Sprint F (QA#2). Additive + idempotent. NOT YET APPLIED.

-- ── Core (private): the single place the stock math + concurrency control lives ──
create or replace function public.inventory__apply_movement(
  p_tenant_id           uuid,
  p_material_id         uuid,
  p_type                public.inventory_transaction_type,
  p_quantity            numeric,
  p_reference_type      public.inventory_reference_type,
  p_reference_id        uuid,
  p_fulfill_reservation boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material  public.materials;
  v_item      public.inventory_items;
  v_tx        public.inventory_transactions;
  v_on_delta  numeric := 0;
  v_res_delta numeric := 0;
  v_next_on   numeric;
  v_next_res  numeric;
begin
  -- Material must exist within the tenant and be active.
  select * into v_material
    from public.materials
   where id = p_material_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'MATERIAL_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not v_material.active then
    raise exception 'MATERIAL_INACTIVE' using errcode = 'P0001';
  end if;

  -- Ensure a snapshot row exists, then LOCK it (serializes concurrent movements
  -- on the same material → no oversell / no double reservation).
  insert into public.inventory_items (tenant_id, material_id)
  values (p_tenant_id, p_material_id)
  on conflict (tenant_id, material_id) do nothing;

  select * into v_item
    from public.inventory_items
   where tenant_id = p_tenant_id and material_id = p_material_id
   for update;

  -- Effect by type — authoritative mirror of domain effectOf().
  case p_type
    when 'receipt'     then v_on_delta := p_quantity;
    when 'consumption' then
      v_on_delta := -p_quantity;
      if p_fulfill_reservation then
        -- Partial fulfillment (QA#1 Fix 2): release up to what is reserved.
        v_res_delta := -least(p_quantity, greatest(v_item.quantity_reserved, 0));
      end if;
    when 'adjustment'  then v_on_delta := p_quantity;   -- signed
    when 'reservation' then v_res_delta := p_quantity;
    when 'release'     then v_res_delta := -p_quantity;
  end case;

  v_next_on  := v_item.quantity_on_hand  + v_on_delta;
  v_next_res := v_item.quantity_reserved + v_res_delta;

  -- Invariant pre-checks with STABLE error codes (defense-in-depth; the table
  -- CHECKs are the last-resort guarantee). Raised BEFORE writing → no doomed rows.
  if v_next_on < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;
  if v_next_res < 0 then
    raise exception 'INSUFFICIENT_RESERVED' using errcode = 'P0001';
  end if;
  if v_next_res > v_next_on then
    raise exception 'INSUFFICIENT_AVAILABLE' using errcode = 'P0001';
  end if;

  -- Append the immutable ledger entry (table CHECKs enforce qty sign + ref shape).
  insert into public.inventory_transactions
    (tenant_id, material_id, type, quantity, reference_type, reference_id, created_by)
  values
    (p_tenant_id, p_material_id, p_type, p_quantity, p_reference_type, p_reference_id, auth.uid())
  returning * into v_tx;

  -- Update the snapshot.
  update public.inventory_items
     set quantity_on_hand  = v_next_on,
         quantity_reserved = v_next_res
   where id = v_item.id
  returning * into v_item;

  return jsonb_build_object(
    'item', to_jsonb(v_item),
    'transaction', to_jsonb(v_tx)
  );
end;
$$;

-- ── Wrappers: per-operation permission + fixed type, delegate to core ─────────
create or replace function public.inventory_receive(
  p_tenant_id uuid, p_material_id uuid, p_quantity numeric,
  p_reference_type public.inventory_reference_type, p_reference_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_tenant_permission(p_tenant_id, 'inventory.stock.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return public.inventory__apply_movement(
    p_tenant_id, p_material_id, 'receipt', p_quantity, p_reference_type, p_reference_id, false);
end; $$;

create or replace function public.inventory_consume(
  p_tenant_id uuid, p_material_id uuid, p_quantity numeric,
  p_reference_type public.inventory_reference_type, p_reference_id uuid,
  p_fulfill_reservation boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_tenant_permission(p_tenant_id, 'inventory.consume') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return public.inventory__apply_movement(
    p_tenant_id, p_material_id, 'consumption', p_quantity, p_reference_type, p_reference_id,
    coalesce(p_fulfill_reservation, false));
end; $$;

create or replace function public.inventory_adjust(
  p_tenant_id uuid, p_material_id uuid, p_quantity numeric,
  p_reference_type public.inventory_reference_type, p_reference_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_tenant_permission(p_tenant_id, 'inventory.stock.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return public.inventory__apply_movement(
    p_tenant_id, p_material_id, 'adjustment', p_quantity, p_reference_type, p_reference_id, false);
end; $$;

create or replace function public.inventory_reserve(
  p_tenant_id uuid, p_material_id uuid, p_quantity numeric,
  p_reference_type public.inventory_reference_type, p_reference_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_tenant_permission(p_tenant_id, 'inventory.stock.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return public.inventory__apply_movement(
    p_tenant_id, p_material_id, 'reservation', p_quantity, p_reference_type, p_reference_id, false);
end; $$;

create or replace function public.inventory_release(
  p_tenant_id uuid, p_material_id uuid, p_quantity numeric,
  p_reference_type public.inventory_reference_type, p_reference_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_tenant_permission(p_tenant_id, 'inventory.stock.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return public.inventory__apply_movement(
    p_tenant_id, p_material_id, 'release', p_quantity, p_reference_type, p_reference_id, false);
end; $$;
