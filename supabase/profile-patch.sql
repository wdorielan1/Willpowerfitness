-- Quick patch for the public-profile features. Safe to run more than once.
-- (The full supabase/schema.sql does the same and more; use this if you only need profiles working now.)

-- 1. columns
alter table public.public_profiles add column if not exists avatar_url text;
alter table public.public_profiles add column if not exists bio text check (bio is null or char_length(bio) <= 160);
alter table public.public_profiles add column if not exists is_public boolean not null default false;
alter table public.public_profiles add column if not exists stats jsonb not null default '{}'::jsonb;
alter table public.public_profiles add column if not exists followers_count int not null default 0;
alter table public.public_profiles add column if not exists following_count int not null default 0;
alter table public.crew_members add column if not exists avatar_url text;
alter table public.crew_posts add column if not exists is_public boolean not null default false;

-- 2. who can read what
drop policy if exists "read discoverable" on public.public_profiles;
create policy "read discoverable" on public.public_profiles for select to authenticated
  using (
    discoverable_handle or discoverable_email or auth.uid() = user_id
    or exists (select 1 from public.follows f where f.user_id = auth.uid() and f.friend_id = public_profiles.user_id)
    or exists (select 1 from public.follows f where f.friend_id = auth.uid() and f.user_id = public_profiles.user_id)
  );
drop policy if exists "read public profiles" on public.public_profiles;
create policy "read public profiles" on public.public_profiles for select to anon, authenticated using (is_public);
drop policy if exists "see my followers" on public.follows;
create policy "see my followers" on public.follows for select to authenticated using (auth.uid() = friend_id);
drop policy if exists "read public posts" on public.crew_posts;
create policy "read public posts" on public.crew_posts for select to anon, authenticated
  using (is_public and exists (select 1 from public.public_profiles pp where pp.user_id = crew_posts.user_id and pp.is_public));

-- 3. follower / following counts kept up to date automatically
create or replace function public.refresh_follow_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  a := coalesce(new.user_id, old.user_id);
  b := coalesce(new.friend_id, old.friend_id);
  update public.public_profiles set following_count = (select count(*) from public.follows where user_id = a) where user_id = a;
  update public.public_profiles set followers_count = (select count(*) from public.follows where friend_id = b) where user_id = b;
  return null;
end $$;
drop trigger if exists follows_counts on public.follows;
create trigger follows_counts after insert or delete on public.follows for each row execute function public.refresh_follow_counts();
update public.public_profiles pp set
  following_count = (select count(*) from public.follows f where f.user_id = pp.user_id),
  followers_count = (select count(*) from public.follows f where f.friend_id = pp.user_id);

notify pgrst, 'reload schema';
