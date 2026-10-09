-- Append four portraits without changing existing saved IDs.
alter table public.member_profiles drop constraint member_profiles_avatar_id_check;
alter table public.member_profiles add constraint member_profiles_avatar_id_check
  check (avatar_id between 0 and 109);
