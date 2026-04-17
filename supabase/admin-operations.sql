create extension if not exists pgcrypto;

create table if not exists public.admin_operation_runs (
  id text primary key,
  operation text not null,
  category text not null check (category in ('routine', 'messaging', 'protection', 'access')),
  status text not null check (status in ('success', 'error')),
  summary text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms bigint not null default 0,
  target_date date null,
  variant text null,
  output_dir text null,
  admin_user_id uuid null,
  admin_participant_id uuid null references public.participants(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  error text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_operation_runs_finished_at_idx
  on public.admin_operation_runs (finished_at desc);

create index if not exists admin_operation_runs_operation_idx
  on public.admin_operation_runs (operation, finished_at desc);

create table if not exists public.admin_operation_artifacts (
  id text primary key,
  run_id text not null references public.admin_operation_runs(id) on delete cascade,
  artifact_key text not null,
  label text not null,
  local_path text not null,
  kind text not null check (kind in ('csv', 'json', 'md', 'txt')),
  size_bytes bigint not null default 0,
  checksum_sha256 text not null,
  storage_bucket text null,
  storage_path text null,
  storage_status text null check (storage_status in ('uploaded', 'skipped', 'failed')),
  storage_error text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_operation_artifacts_run_id_idx
  on public.admin_operation_artifacts (run_id);

create unique index if not exists admin_operation_artifacts_run_key_idx
  on public.admin_operation_artifacts (run_id, artifact_key);
