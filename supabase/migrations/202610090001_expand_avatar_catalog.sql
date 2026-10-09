-- Preserve game portraits 0–49; append anime 50–57 and superheroes 58–65.
alter table public.member_profiles drop constraint member_profiles_avatar_id_check;
alter table public.member_profiles add constraint member_profiles_avatar_id_check
 check (avatar_id between 0 and 65);
