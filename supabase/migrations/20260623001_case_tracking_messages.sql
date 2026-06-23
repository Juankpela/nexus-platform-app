-- Interacciones del cliente desde la página pública de seguimiento.
--
-- Desde /seguimiento/[token] el cliente puede dejar un COMENTARIO para su técnico
-- o SOLICITAR reagendar / cancelar. Estas acciones NO mutan la operación: quedan
-- como una bandera append-only que el coordinador resuelve (superficie de
-- decisión, no auto-reagenda ni auto-cancela). Multi-tenant; RLS por miembro del
-- tenant para lectura/resolución. El insert público lo hace el service role tras
-- validar el tracking_token (mismo patrón que el intake público y getPublicTracking).
-- Additive + idempotente.

create table if not exists public.case_tracking_messages (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  case_id       uuid        not null references public.cases(id) on delete cascade,
  work_order_id uuid        references public.work_orders(id) on delete set null,
  kind          text        not null check (kind in ('comment', 'reschedule_request', 'cancel_request')),
  body          text        check (body is null or char_length(body) between 1 and 2000),
  -- Fecha/hora preferida por el cliente al pedir reagendar (opcional).
  preferred_at  timestamptz,
  status        text        not null default 'open' check (status in ('open', 'resolved')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid        references auth.users(id) on delete set null
);

-- Bandeja por tenant, lo más reciente primero.
create index if not exists case_tracking_messages_tenant_idx
  on public.case_tracking_messages (tenant_id, created_at desc);
-- Hilo por orden de trabajo (lo que ve el técnico / el detalle de WO).
create index if not exists case_tracking_messages_wo_idx
  on public.case_tracking_messages (tenant_id, work_order_id, created_at desc);
-- Solicitudes pendientes de atender (badge del coordinador).
create index if not exists case_tracking_messages_open_idx
  on public.case_tracking_messages (tenant_id)
  where status = 'open';

-- ── RLS — el equipo del tenant lee y resuelve; el insert público va por service role ──
alter table public.case_tracking_messages enable row level security;

drop policy if exists "ctm_select_member" on public.case_tracking_messages;
create policy "ctm_select_member" on public.case_tracking_messages
  for select to authenticated
  using (public.is_active_tenant_member(tenant_id));

-- El equipo marca una solicitud como resuelta (update status). El insert desde la
-- página pública lo hace el service role (omite RLS) tras validar el token; no se
-- concede INSERT/DELETE a authenticated.
drop policy if exists "ctm_update_member" on public.case_tracking_messages;
create policy "ctm_update_member" on public.case_tracking_messages
  for update to authenticated
  using (public.is_active_tenant_member(tenant_id))
  with check (public.is_active_tenant_member(tenant_id));

comment on table public.case_tracking_messages is
  'Interacciones del cliente desde /seguimiento/[token]: comentarios y solicitudes de reagendar/cancelar. Append-only; el coordinador las resuelve.';
