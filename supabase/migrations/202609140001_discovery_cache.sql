-- Shared cache keeps third-party requests low across Edge Function cold starts.
create table if not exists public.discovery_cache (
 key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null
);
alter table public.discovery_cache enable row level security;
revoke all on public.discovery_cache from anon, authenticated;
grant all on public.discovery_cache to service_role;
