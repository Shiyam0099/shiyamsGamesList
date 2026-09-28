-- Keep the retired download_link column for backwards-compatible deployments;
-- new clients neither read into their model nor write it.
alter table public.games add column rawg_id bigint check(rawg_id > 0);
alter table public.games add column release_date date;
alter table public.games add column metadata_checked_at timestamptz;
create index games_rawg_id_idx on public.games(rawg_id) where rawg_id is not null;
