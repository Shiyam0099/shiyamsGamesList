-- Public palette preferences contain no credentials or account data.
create table public.site_theme_settings (
 id boolean primary key default true check (id),
 dark_theme text not null default 'original' check (dark_theme in ('original','crimson','neon-blue')),
 light_theme text not null default 'sage' check (light_theme in ('sage','gold','purple')),
 updated_at timestamptz not null default now()
);
insert into public.site_theme_settings(id) values(true);
alter table public.site_theme_settings enable row level security;
revoke all on public.site_theme_settings from public,anon,authenticated;
grant select on public.site_theme_settings to anon,authenticated;
grant all on public.site_theme_settings to service_role;
create policy theme_public_read on public.site_theme_settings for select to anon,authenticated using(true);

create function public.set_site_themes(new_dark text,new_light text)
returns public.site_theme_settings language plpgsql security definer set search_path='' as $$
declare saved public.site_theme_settings;
begin
 if not private.is_admin() then raise exception 'Access denied' using errcode='42501'; end if;
 if new_dark is null or new_dark not in ('original','crimson','neon-blue')
 or new_light is null or new_light not in ('sage','gold','purple') then
  raise exception 'Invalid color theme' using errcode='22023';
 end if;
 update public.site_theme_settings set dark_theme=new_dark,light_theme=new_light,updated_at=now() where id=true returning * into saved;
 if not found then raise exception 'Theme settings unavailable'; end if;
 insert into public.activity_log(actor_id,entity,entity_id,action,label)
 values(auth.uid(),'site_themes','site','updated','Site themes: '||new_dark||' / '||new_light);
 return saved;
end;
$$;
revoke all on function public.set_site_themes(text,text) from public,anon;
grant execute on function public.set_site_themes(text,text) to authenticated;
