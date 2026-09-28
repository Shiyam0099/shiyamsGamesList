-- Shared catalog, private personal collections, and server-enforced quotas.
alter table public.games add column is_featured boolean not null default false;
update public.games set is_featured=true;
create unique index games_rawg_unique on public.games(rawg_id) where rawg_id is not null;

create table public.member_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Player One' check(length(btrim(display_name)) between 2 and 40),
 bio text not null default 'New worlds. Late nights. One more quest. This is my save file, and every game has a story.' check(length(bio)<=1000),
 avatar_id integer not null default 0 check(avatar_id between 0 and 49),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.collection_entries (
 user_id uuid not null references public.member_profiles(id) on delete cascade,
 game_id bigint not null references public.games(id) on delete cascade,
 status text not null default 'unplayed' check(status in ('unplayed','loved','dropped','playing')),
 created_at timestamptz not null default now(),
 primary key(user_id,game_id)
);
create index collection_game_idx on public.collection_entries(game_id);
create table private.member_limits (
 subject text not null, bucket text not null, window_start timestamptz not null, hits integer not null,
 primary key(subject,bucket,window_start)
);

create function private.member_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.member_profiles p where p.id=target and p.is_active)
 and exists(select 1 from auth.users u where u.id=target and u.email_confirmed_at is not null)
 and not exists(select 1 from public.admin_profiles a where a.id=target and not a.is_active);
$$;
create function private.new_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.member_profiles(id) values(new.id) on conflict do nothing;
 return new;
end; $$;
create trigger create_member after insert on auth.users for each row execute function private.new_member();
insert into public.member_profiles(id,display_name) select u.id,coalesce(a.username,'Player One') from auth.users u left join public.admin_profiles a on a.id=u.id;
insert into public.collection_entries(user_id,game_id,status) select a.id,g.id,g.status from public.admin_profiles a cross join public.games g where a.role='super_admin';
create trigger member_updated before update on public.member_profiles for each row execute function private.touch_updated_at();

alter table public.member_profiles enable row level security;
alter table public.collection_entries enable row level security;
revoke all on public.member_profiles,public.collection_entries from anon,authenticated;
grant select on public.member_profiles,public.collection_entries to authenticated;
grant all on public.member_profiles,public.collection_entries to service_role;
create policy member_read on public.member_profiles for select to authenticated using(id=auth.uid() or private.is_admin());
create policy collection_read on public.collection_entries for select to authenticated using((user_id=auth.uid() and private.member_active(auth.uid())) or private.is_admin());
drop policy games_public_read on public.games;
create policy games_public_read on public.games for select to anon,authenticated using(is_featured or private.member_active(auth.uid()) or private.is_admin());

create function private.consume_limit(target text, category text, maximum integer, period text) returns void language plpgsql security definer set search_path='' as $$
declare n integer; slot timestamptz;
begin
 slot=date_trunc(period,now());
 insert into private.member_limits(subject,bucket,window_start,hits) values(target,category,slot,1)
 on conflict(subject,bucket,window_start) do update set hits=private.member_limits.hits+1 returning hits into n;
 if n>maximum then raise exception 'Usage limit reached. Please try again later.' using errcode='P0001'; end if;
 delete from private.member_limits where window_start<now()-interval '2 days';
end; $$;

create function public.update_member_profile(new_name text,new_bio text,new_avatar integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.member_active(auth.uid()) then raise exception 'Account unavailable' using errcode='42501'; end if;
 perform private.consume_limit(auth.uid()::text,'profile',30,'hour');
 update public.member_profiles set display_name=btrim(new_name),bio=btrim(new_bio),avatar_id=new_avatar where id=auth.uid();
end; $$;

create function private.add_collection(target uuid, selected_game bigint) returns bigint language plpgsql security definer set search_path='' as $$
begin
 -- Serialize mutations per member so concurrent requests cannot exceed limits.
 perform 1 from public.member_profiles where id=target for update;
 if not private.member_active(target) then raise exception 'Account unavailable' using errcode='42501'; end if;
 if not exists(select 1 from public.games where id=selected_game) then raise exception 'Game unavailable'; end if;
 if exists(select 1 from public.collection_entries where user_id=target and game_id=selected_game) then return selected_game; end if;
 if (select count(*) from public.collection_entries where user_id=target)>=1000 then raise exception 'Collection limit reached (1,000 games).'; end if;
 perform private.consume_limit(target::text,'collection-add',100,'day');
 insert into public.collection_entries(user_id,game_id) values(target,selected_game) on conflict do nothing;
 return selected_game;
end; $$;
create function public.add_collection_game(selected_game bigint) returns bigint language sql security definer set search_path='' as $$
 select private.add_collection(auth.uid(),selected_game);
$$;
create function public.set_collection_status(selected_game bigint,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.member_active(auth.uid()) then raise exception 'Account unavailable' using errcode='42501'; end if;
 perform private.consume_limit(auth.uid()::text,'collection-edit',120,'hour');
 update public.collection_entries set status=new_status where user_id=auth.uid() and game_id=selected_game;
 if not found then raise exception 'Game is not in your collection'; end if;
end; $$;
create function public.remove_collection_game(selected_game bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.member_active(auth.uid()) then raise exception 'Account unavailable' using errcode='42501'; end if;
 delete from public.collection_entries where user_id=auth.uid() and game_id=selected_game;
end; $$;

-- The owner's collection remains the public landing collection. Keep legacy
-- admin game/status editing and collection controls consistent in both directions.
create function private.sync_owner_collection() returns trigger language plpgsql security definer set search_path='' as $$
declare who uuid; gid bigint;
begin
 if pg_trigger_depth()>1 then return null; end if;
 who=case when tg_op='DELETE' then old.user_id else new.user_id end;
 gid=case when tg_op='DELETE' then old.game_id else new.game_id end;
 if exists(select 1 from public.admin_profiles where id=who and role='super_admin') then
  if tg_op='DELETE' then update public.games set is_featured=false where id=gid;
  else update public.games set is_featured=true,status=new.status where id=gid; end if;
 end if;
 return null;
end; $$;
create trigger owner_collection after insert or update or delete on public.collection_entries for each row execute function private.sync_owner_collection();
create function private.sync_featured_game() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if pg_trigger_depth()>1 then return null; end if;
 select id into owner_id from public.admin_profiles where role='super_admin';
 if owner_id is not null then
  if new.is_featured then insert into public.collection_entries(user_id,game_id,status) values(owner_id,new.id,new.status) on conflict(user_id,game_id) do update set status=excluded.status;
  else delete from public.collection_entries where user_id=owner_id and game_id=new.id; end if;
 end if;
 return null;
end; $$;
create trigger featured_game after insert or update of status,is_featured on public.games for each row execute function private.sync_featured_game();

-- Called only by the authenticated Edge Function after fetching RAWG itself.
-- Never expose a client-supplied game-details write path to members.
create function public.import_member_game(target uuid,details jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare gid bigint; rid bigint; name text; yr integer;
begin
 if not private.member_active(target) then raise exception 'Account unavailable' using errcode='42501'; end if;
 rid=(details->>'rawgId')::bigint; name=btrim(details->>'title'); yr=nullif(details->>'year','')::integer;
 if rid is null or rid<1 or name is null or length(name) not between 1 and 300 then raise exception 'Invalid metadata'; end if;
 -- A global import lock also covers two different RAWG IDs naming the same game.
 perform pg_advisory_xact_lock(209200002);
 select id into gid from public.games where rawg_id=rid;
 if gid is null then
  select id into gid from public.games where regexp_replace(lower(title),'[^a-z0-9]','','g')=regexp_replace(lower(name),'[^a-z0-9]','','g') and coalesce(release_year,0)=coalesce(yr,0) order by id limit 1;
  if gid is not null then update public.games set rawg_id=rid where id=gid and rawg_id is null; end if;
 end if;
 if gid is null then
  perform private.consume_limit(target::text,'catalog-import',20,'day');
  perform private.consume_limit('global','catalog-import',300,'day');
  insert into public.games(title,release_year,genres,rawg_id,release_date,future,poster,poster_source,description,description_source,metacritic,metacritic_source,metacritic_checked,metacritic_platform,rating_url,is_featured)
  values(name,yr,case when jsonb_array_length(details->'genres')>0 then array(select jsonb_array_elements_text(details->'genres')) else array['Uncategorized'] end,rid,nullif(details->>'releaseDate','')::date,coalesce((details->>'future')::boolean,true),coalesce(details->>'poster',''),details->>'source',coalesce(details->>'description',''),details->>'source',(details->>'metacritic')::integer,details->>'source',current_date,'RAWG aggregate',details->>'ratingUrl',false) returning id into gid;
 end if;
 return private.add_collection(target,gid);
end; $$;
create function public.member_api_limit(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.member_active(target) then raise exception 'Account unavailable' using errcode='42501'; end if;
 perform private.consume_limit(target::text,'catalog-api',60,'minute');
end; $$;

revoke all on all functions in schema private from public;
grant execute on function private.member_active(uuid) to anon,authenticated;
revoke all on function public.update_member_profile(text,text,integer),public.add_collection_game(bigint),public.set_collection_status(bigint,text),public.remove_collection_game(bigint),public.import_member_game(uuid,jsonb),public.member_api_limit(uuid) from public,anon,authenticated;
grant execute on function public.update_member_profile(text,text,integer),public.add_collection_game(bigint),public.set_collection_status(bigint,text),public.remove_collection_game(bigint) to authenticated;
grant execute on function public.import_member_game(uuid,jsonb),public.member_api_limit(uuid) to service_role;
