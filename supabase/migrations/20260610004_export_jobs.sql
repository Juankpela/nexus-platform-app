-- INT-1 Sprint C1 — Async export jobs (ADR-024).
--
-- A queue table drained by a Vercel Cron worker. Worker exception (ADR-024): the
-- worker runs with the service role and filters by the job's tenant_id; enqueue-time
-- authorization (per-object read permission) is enforced in the app layer. Additive +
-- idempotent. NOT YET APPLIED.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'export_job_status') then
    create type public.export_job_status as enum (
      'queued', 'processing', 'completed', 'failed', 'expired'
    );
  end if;
end
$$;

create table if not exists public.export_jobs (
  id            uuid                      primary key default gen_random_uuid(),
  tenant_id     uuid                      not null references public.tenants(id) on delete cascade,
  requested_by  uuid                      not null,
  object        text                      not null,
  format        text                      not null check (format in ('csv','xlsx')),
  filters       jsonb                     not null default '{}'::jsonb,
  status        public.export_job_status  not null default 'queued',
  row_count     integer,
  storage_path  text,
  last_error    text,
  attempt_count integer                   not null default 0,
  lease_until   timestamptz,
  created_at    timestamptz               not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  expires_at    timestamptz,
  unique (id, tenant_id)
);

-- Worker claim path: find the next claimable job quickly.
create index if not exists export_jobs_claim_idx
  on public.export_jobs (status, created_at)
  where status in ('queued', 'processing');
-- Monitoring: a requester's jobs newest-first.
create index if not exists export_jobs_owner_idx
  on public.export_jobs (tenant_id, requested_by, created_at desc);

-- ── Atomic claim (SECURITY DEFINER): pick ONE claimable job under SKIP LOCKED ──
-- Claimable = queued, OR processing whose lease expired (crash recovery), with
-- attempts left. Marks it processing, stamps the lease, bumps attempt_count.
create or replace function public.claim_export_job(
  p_lease_seconds integer,
  p_max_attempts  integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.export_jobs;
begin
  select * into v_job
    from public.export_jobs
   where (status = 'queued'
          or (status = 'processing' and lease_until is not null and lease_until < now()))
     and attempt_count < p_max_attempts
   order by created_at
   for update skip locked
   limit 1;

  if not found then
    return null;
  end if;

  update public.export_jobs
     set status        = 'processing',
         started_at    = coalesce(started_at, now()),
         lease_until   = now() + make_interval(secs => p_lease_seconds),
         attempt_count = attempt_count + 1
   where id = v_job.id
  returning * into v_job;

  return to_jsonb(v_job);
end;
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.export_jobs enable row level security;

-- Requesters see only their own jobs within the tenant (monitoring). Oversight
-- roles can be added later; per-object read permission is enforced at enqueue.
drop policy if exists "export_jobs_select_own" on public.export_jobs;
create policy "export_jobs_select_own" on public.export_jobs
  for select to authenticated
  using (
    public.is_active_tenant_member(tenant_id)
    and requested_by = auth.uid()
  );

-- Enqueue: a member may create a job for themselves in their tenant. The object's
-- read permission is validated in the Server Action (app layer).
drop policy if exists "export_jobs_insert_own" on public.export_jobs;
create policy "export_jobs_insert_own" on public.export_jobs
  for insert to authenticated
  with check (
    public.is_active_tenant_member(tenant_id)
    and requested_by = auth.uid()
  );
-- No UPDATE/DELETE for authenticated: only the worker (service role / SECURITY
-- DEFINER claim) transitions job state.

-- ── Private Storage bucket for generated files (signed-URL download only) ─────
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;
-- No storage.objects policies for authenticated: downloads are served exclusively
-- through short-TTL signed URLs minted server-side (service role).
