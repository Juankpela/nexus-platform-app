-- Group 13 — Notifications (ADR-030), shared infrastructure.
--
-- In-app notifications: one row per recipient (fan-out). The scanner (service
-- role) inserts; each user reads and marks-as-read only their own rows. No
-- email/preferences/realtime yet — those are additive behind the same model.
-- Multi-tenant, RLS-scoped to the recipient. Additive + idempotent.

create table if not exists public.notifications (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null references public.tenants(id) on delete cascade,
  recipient_user_id uuid        not null references auth.users(id) on delete cascade,
  type              text        not null check (char_length(type) between 1 and 60),
  title             text        not null check (char_length(title) between 1 and 200),
  body              text,
  link              text,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- Recipient inbox, newest first.
create index if not exists notifications_recipient_idx
  on public.notifications (tenant_id, recipient_user_id, created_at desc);
-- Unread badge count.
create index if not exists notifications_unread_idx
  on public.notifications (tenant_id, recipient_user_id)
  where read_at is null;

-- ── RLS — a user only ever sees/updates their OWN notifications ───────────────
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.is_active_tenant_member(tenant_id)
  );

-- Update is limited to marking-as-read (recipient's own rows). The scanner
-- (service role) bypasses RLS for the fan-out insert; no INSERT/DELETE policy
-- is granted to authenticated.
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.is_active_tenant_member(tenant_id)
  )
  with check (recipient_user_id = auth.uid());
