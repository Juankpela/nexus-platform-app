-- P0-3 — Pagos atómicos (record/reverse) en una sola transacción
--
-- Problema: el repo hacía record/reverse como 3+ escrituras secuenciales con el
-- cliente normal (insert payment → insert allocations → loop de UPDATE invoices),
-- SIN transacción y calculando el nuevo saldo sobre el valor LEÍDO en memoria.
-- Bajo concurrencia o fallo parcial: (a) un fallo a mitad deja el pago registrado
-- pero la factura con saldo viejo; (b) dos pagos simultáneos leen el mismo
-- amount_paid, ambos pasan la validación, y el segundo UPDATE pisa al primero →
-- un pago desaparece o la factura queda sobre-pagada. Pérdida silenciosa de dinero.
--
-- Fix: dos funciones plpgsql `security definer` (una función ES una transacción).
--   * SELECT ... FOR UPDATE sobre cada factura → serializa pagos concurrentes.
--   * Incremento RELATIVO en SQL (amount_paid + delta) → nunca sobre valor viejo.
--   * numeric(14,2) exacto → sin ruido de floats.
--   * Validación + escritura atómicas: cualquier RAISE revierte TODO.
--
-- Seguridad: el guard de permiso exige billing.payments.write al usuario llamante
-- (cierra un hueco cross-tenant: sin él, un usuario autenticado podría pasar el
-- tenant_id de OTRO tenant). service_role se exime para QA/scripts.
--
-- Reversible: `drop function record_payment, reverse_payment;` — el repo viejo
-- (secuencial) seguiría funcionando si se revirtiera el código. Sin pérdida de datos.

-- ── record_payment ─────────────────────────────────────────────────────────────
create or replace function public.record_payment(
  p_tenant_id    uuid,
  p_company_id   uuid,
  p_payment_date date,
  p_method       text,
  p_reference    text,
  p_note         text,
  p_allocations  jsonb   -- [{ "invoice_id": "<uuid>", "amount": <numeric> }, ...]
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id     uuid;
  v_amount         numeric(14,2);
  v_total          numeric(14,2);
  v_paid           numeric(14,2);
  v_status         public.invoice_status;
  v_sum            numeric(14,2) := 0;
  v_payment_number text;
  v_payment        public.payments;
  r                record;
begin
  if auth.role() <> 'service_role'
     and not public.has_tenant_permission(p_tenant_id, 'billing.payments.write') then
    raise exception 'PAYMENT_FORBIDDEN' using errcode = '42501';
  end if;

  if p_allocations is null or jsonb_array_length(p_allocations) = 0 then
    raise exception 'PAYMENT_NO_ALLOCATIONS';
  end if;

  -- Validar + bloquear cada factura objetivo (agregando por factura para tolerar
  -- asignaciones repetidas a la misma factura dentro de un mismo pago).
  for r in
    select (e->>'invoice_id')::uuid as invoice_id,
           sum((e->>'amount')::numeric) as amount
    from jsonb_array_elements(p_allocations) e
    group by (e->>'invoice_id')::uuid
  loop
    if r.amount is null or r.amount <= 0 then
      raise exception 'PAYMENT_INVALID_AMOUNT';
    end if;

    select total_amount, amount_paid, status
      into v_total, v_paid, v_status
      from public.invoices
     where tenant_id = p_tenant_id and id = r.invoice_id
     for update;          -- serializa contra pagos concurrentes a esta factura

    if not found then
      raise exception 'INVOICE_NOT_FOUND';
    end if;
    if v_status not in ('issued', 'partially_paid') then
      raise exception 'INVOICE_NOT_PAYABLE';
    end if;
    if r.amount > (v_total - v_paid) then
      raise exception 'PAYMENT_OVER_ALLOCATION';
    end if;

    v_sum := v_sum + r.amount;
  end loop;

  v_payment_number := public.next_payment_number(p_tenant_id);

  insert into public.payments
    (tenant_id, payment_number, company_id, payment_date, method, reference, note, amount, status)
  values
    (p_tenant_id, v_payment_number, p_company_id, p_payment_date, p_method, p_reference, p_note, v_sum, 'recorded')
  returning * into v_payment;

  -- Insertar las asignaciones tal cual vinieron (granularidad original).
  insert into public.payment_allocations (tenant_id, payment_id, invoice_id, amount)
  select p_tenant_id, v_payment.id, (e->>'invoice_id')::uuid, (e->>'amount')::numeric
  from jsonb_array_elements(p_allocations) e;

  -- Aplicar el incremento RELATIVO por factura (agregado), recalculando estado.
  for r in
    select (e->>'invoice_id')::uuid as invoice_id,
           sum((e->>'amount')::numeric) as amount
    from jsonb_array_elements(p_allocations) e
    group by (e->>'invoice_id')::uuid
  loop
    update public.invoices
       set amount_paid = amount_paid + r.amount,
           status = case
                      when amount_paid + r.amount >= total_amount then 'paid'::public.invoice_status
                      else 'partially_paid'::public.invoice_status
                    end
     where tenant_id = p_tenant_id and id = r.invoice_id;
  end loop;

  return v_payment;
end;
$$;

-- ── reverse_payment ──────────────────────────────────────────────────────────
create or replace function public.reverse_payment(
  p_tenant_id   uuid,
  p_payment_id  uuid,
  p_reversed_by uuid,
  p_reversed_at timestamptz,
  p_reason      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.payment_status;
  r        record;
begin
  if auth.role() <> 'service_role'
     and not public.has_tenant_permission(p_tenant_id, 'billing.payments.write') then
    raise exception 'PAYMENT_FORBIDDEN' using errcode = '42501';
  end if;

  -- Bloquear el pago e impedir doble reversa (idempotencia).
  select status into v_status
    from public.payments
   where tenant_id = p_tenant_id and id = p_payment_id
   for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;
  if v_status <> 'recorded' then
    raise exception 'PAYMENT_NOT_REVERSIBLE';
  end if;

  -- Revertir el saldo en cada factura afectada (bloqueada), agregando por factura.
  for r in
    select invoice_id, sum(amount) as amount
      from public.payment_allocations
     where tenant_id = p_tenant_id and payment_id = p_payment_id
     group by invoice_id
  loop
    perform 1 from public.invoices
      where tenant_id = p_tenant_id and id = r.invoice_id for update;

    update public.invoices
       set amount_paid = greatest(0, amount_paid - r.amount),
           status = case
                      when greatest(0, amount_paid - r.amount) <= 0 then 'issued'::public.invoice_status
                      when greatest(0, amount_paid - r.amount) >= total_amount then 'paid'::public.invoice_status
                      else 'partially_paid'::public.invoice_status
                    end
     where tenant_id = p_tenant_id and id = r.invoice_id;
  end loop;

  update public.payments
     set status = 'reversed',
         reversed_at = p_reversed_at,
         reversed_by = p_reversed_by,
         reverse_reason = p_reason
   where tenant_id = p_tenant_id and id = p_payment_id;
end;
$$;
