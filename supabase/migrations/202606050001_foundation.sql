create extension if not exists pgcrypto;

create type public.tenant_status as enum ('active', 'suspended', 'archived');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.audit_actor_type as enum ('user', 'system', 'service');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  status public.tenant_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenants is
  'Canonical tenant boundary. A future organization_id may group multiple tenants.';

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (id, tenant_id)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.platform_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.platform_roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.membership_roles (
  membership_id uuid not null,
  tenant_id uuid not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id),
  foreign key (membership_id, tenant_id)
    references public.tenant_memberships(id, tenant_id) on delete cascade
);

create table public.permission_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, key),
  unique (id, tenant_id)
);

create table public.permission_set_permissions (
  permission_set_id uuid not null,
  tenant_id uuid not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (permission_set_id, permission_id),
  foreign key (permission_set_id, tenant_id)
    references public.permission_sets(id, tenant_id) on delete cascade
);

create table public.membership_permission_sets (
  membership_id uuid not null,
  permission_set_id uuid not null,
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, permission_set_id),
  foreign key (membership_id, tenant_id)
    references public.tenant_memberships(id, tenant_id) on delete cascade,
  foreign key (permission_set_id, tenant_id)
    references public.permission_sets(id, tenant_id) on delete cascade
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  default_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tenant_features (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  enabled boolean not null,
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, feature_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  occurred_at timestamptz not null default now(),
  actor_type public.audit_actor_type not null,
  actor_id uuid,
  tenant_id uuid references public.tenants(id) on delete set null,
  subject_type text,
  subject_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  request_id uuid,
  source text not null default 'web',
  ip_address inet,
  user_agent text
);

create index tenant_memberships_user_active_idx
  on public.tenant_memberships (user_id, tenant_id)
  where status = 'active';
create index membership_roles_tenant_idx on public.membership_roles (tenant_id, membership_id);
create index permission_sets_tenant_idx on public.permission_sets (tenant_id);
create index tenant_features_tenant_idx on public.tenant_features (tenant_id);
create index audit_events_tenant_time_idx on public.audit_events (tenant_id, occurred_at desc);
create index audit_events_actor_time_idx on public.audit_events (actor_id, occurred_at desc);
create index audit_events_subject_idx on public.audit_events (subject_type, subject_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.tenant_memberships
for each row execute function public.set_updated_at();
create trigger permission_sets_set_updated_at before update on public.permission_sets
for each row execute function public.set_updated_at();
create trigger tenant_features_set_updated_at before update on public.tenant_features
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_user_roles user_role
    join public.platform_roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.key = 'super_admin'
  );
$$;

create or replace function public.is_active_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    join public.tenants tenant on tenant.id = membership.tenant_id
    where membership.user_id = auth.uid()
      and membership.tenant_id = target_tenant_id
      and membership.status = 'active'
      and tenant.status = 'active'
  );
$$;

create or replace function public.has_tenant_permission(
  target_tenant_id uuid,
  permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_platform_admin() or exists (
    select 1
    from public.tenant_memberships membership
    where membership.user_id = auth.uid()
      and membership.tenant_id = target_tenant_id
      and membership.status = 'active'
      and (
        exists (
          select 1
          from public.membership_roles membership_role
          join public.role_permissions role_permission
            on role_permission.role_id = membership_role.role_id
          join public.permissions permission
            on permission.id = role_permission.permission_id
          where membership_role.membership_id = membership.id
            and membership_role.tenant_id = target_tenant_id
            and permission.key = permission_key
        )
        or exists (
          select 1
          from public.membership_permission_sets membership_set
          join public.permission_set_permissions set_permission
            on set_permission.permission_set_id = membership_set.permission_set_id
            and set_permission.tenant_id = target_tenant_id
          join public.permissions permission
            on permission.id = set_permission.permission_id
          where membership_set.membership_id = membership.id
            and membership_set.tenant_id = target_tenant_id
            and permission.key = permission_key
        )
      )
  );
$$;

create or replace function public.resolve_request_context(tenant_slug text)
returns table (
  tenant_id uuid,
  resolved_tenant_slug text,
  tenant_name text,
  membership_id uuid,
  effective_permissions text[],
  enabled_features text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with membership as (
    select
      tenant.id as tenant_id,
      tenant.slug,
      tenant.name,
      member.id as membership_id
    from public.tenants tenant
    join public.tenant_memberships member on member.tenant_id = tenant.id
    where tenant.slug = lower(tenant_slug)
      and tenant.status = 'active'
      and member.user_id = auth.uid()
      and member.status = 'active'
  ),
  effective_permissions as (
    select distinct permission.key, membership.membership_id
    from membership
    join public.membership_roles membership_role
      on membership_role.membership_id = membership.membership_id
      and membership_role.tenant_id = membership.tenant_id
    join public.role_permissions role_permission
      on role_permission.role_id = membership_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    union
    select distinct permission.key, membership.membership_id
    from membership
    join public.membership_permission_sets membership_set
      on membership_set.membership_id = membership.membership_id
      and membership_set.tenant_id = membership.tenant_id
    join public.permission_set_permissions set_permission
      on set_permission.permission_set_id = membership_set.permission_set_id
      and set_permission.tenant_id = membership.tenant_id
    join public.permissions permission on permission.id = set_permission.permission_id
  ),
  enabled_features as (
    select feature.key, membership.tenant_id
    from membership
    cross join public.features feature
    left join public.tenant_features tenant_feature
      on tenant_feature.tenant_id = membership.tenant_id
      and tenant_feature.feature_id = feature.id
    where coalesce(tenant_feature.enabled, feature.default_enabled)
  )
  select
    membership.tenant_id,
    membership.slug,
    membership.name,
    membership.membership_id,
    coalesce(
      (select array_agg(permission.key order by permission.key)
       from effective_permissions permission
       where permission.membership_id = membership.membership_id),
      '{}'::text[]
    ),
    coalesce(
      (select array_agg(feature.key order by feature.key)
       from enabled_features feature
       where feature.tenant_id = membership.tenant_id),
      '{}'::text[]
    )
  from membership;
$$;

revoke all on function public.resolve_request_context(text) from public;
grant execute on function public.resolve_request_context(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.platform_roles enable row level security;
alter table public.platform_user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.permission_sets enable row level security;
alter table public.permission_set_permissions enable row level security;
alter table public.membership_permission_sets enable row level security;
alter table public.features enable row level security;
alter table public.tenant_features enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_select_self" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_platform_admin());
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create policy "tenants_select_members" on public.tenants
for select to authenticated using (public.is_active_tenant_member(id) or public.is_platform_admin());
create policy "memberships_select_self_or_admin" on public.tenant_memberships
for select to authenticated using (
  user_id = auth.uid()
  or public.has_tenant_permission(tenant_id, 'tenant.users.read')
);
create policy "roles_read_authenticated" on public.roles
for select to authenticated using (true);
create policy "permissions_read_authenticated" on public.permissions
for select to authenticated using (true);
create policy "platform_roles_read_admin" on public.platform_roles
for select to authenticated using (public.is_platform_admin());
create policy "platform_user_roles_read_admin" on public.platform_user_roles
for select to authenticated using (public.is_platform_admin());
create policy "role_permissions_read_authenticated" on public.role_permissions
for select to authenticated using (true);
create policy "membership_roles_read_tenant" on public.membership_roles
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "permission_sets_read_tenant" on public.permission_sets
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "permission_set_permissions_read_tenant" on public.permission_set_permissions
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "membership_permission_sets_read_tenant" on public.membership_permission_sets
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "features_read_authenticated" on public.features
for select to authenticated using (true);
create policy "tenant_features_read_tenant" on public.tenant_features
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "audit_events_read_authorized" on public.audit_events
for select to authenticated using (
  tenant_id is not null
  and public.has_tenant_permission(tenant_id, 'tenant.audit.read')
);
create policy "audit_events_insert_authenticated" on public.audit_events
for insert to authenticated with check (
  actor_id = auth.uid()
  and (tenant_id is null or public.is_active_tenant_member(tenant_id))
);

insert into public.permissions (key, description) values
  ('tenant.dashboard.read', 'View the tenant dashboard'),
  ('tenant.users.read', 'View tenant users'),
  ('tenant.settings.read', 'View tenant settings'),
  ('tenant.audit.read', 'View tenant audit events')
on conflict (key) do nothing;

insert into public.platform_roles (key, name, description) values
  ('super_admin', 'Super Admin', 'Platform-wide administrative access')
on conflict (key) do nothing;

insert into public.roles (key, name, description) values
  ('tenant_admin', 'Tenant Admin', 'Full tenant foundation administration'),
  ('supervisor', 'Supervisor', 'Supervisory access within a tenant'),
  ('sales_representative', 'Sales Representative', 'Sales workspace access'),
  ('technician', 'Technician', 'Service execution access'),
  ('customer', 'Customer', 'Customer portal access')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.key = 'tenant_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key = 'tenant.dashboard.read'
where role.key in ('supervisor', 'sales_representative', 'technician')
on conflict do nothing;

insert into public.features (key, name, description, default_enabled) values
  ('foundation', 'Foundation', 'Core workspace capabilities', true),
  ('crm', 'CRM', 'Customer relationship management', false),
  ('sales', 'Sales', 'Sales and quoting capabilities', false),
  ('service', 'Service', 'Customer service capabilities', false),
  ('customer_portal', 'Customer Portal', 'External customer experience', false),
  ('field_service', 'Field Service', 'Field operations capabilities', false),
  ('ai', 'AI', 'Artificial intelligence capabilities', false)
on conflict (key) do nothing;
