-- ─────────────────────────────────────────────────────────────────────────────
-- N-LABS Operational Intelligence Engine — read permission (PR0, precondition P2)
-- Read-only: the engine observes audit_events + operational KPIs; it never
-- mutates tenant data. No tables, no schema change — permission + role grants
-- only. Mirrors the forecasting permission pattern (20260608001).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.permissions (key, description) values
  ('nlabs.read', 'View N-LABS operational intelligence (read-only)')
on conflict (key) do nothing;

-- tenant_admin → N-LABS read
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'nlabs.read'
where r.key = 'tenant_admin'
on conflict do nothing;

-- supervisor → N-LABS read
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'nlabs.read'
where r.key = 'supervisor'
on conflict do nothing;
