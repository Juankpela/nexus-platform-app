-- Tenant business profile (issuer data for quotes/invoices)
--
-- Adds the legal/contact fields shown on PDF documents (quotes, invoices) plus
-- the tenant.settings.write permission, granted to tenant_admin. Reads/writes
-- of these fields are done server-side with the service-role client and gated
-- in application code by tenant.settings.write.
-- State: Additive + idempotent.

alter table public.tenants
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists email text;

insert into public.permissions (key, description) values
  ('tenant.settings.write', 'Edit tenant settings and business profile')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'tenant.settings.write'
where role.key = 'tenant_admin'
on conflict do nothing;
