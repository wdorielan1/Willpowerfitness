-- Will Power Fitness: paste the contents of this file into Supabase -> SQL Editor and Run.
-- Safe to run more than once.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  data jsonb not null default '{}'::jsonb,   -- private per-user app data (profile, logs, cardio, weights, ...)
  updated_at timestamptz not null default now()
);

create table if not exists public.crews (            -- user-created crews (built-in crews live in the app)
  id text primary key,
  name text not null,
  time text not null,
  vibe text not null default 'Time-based crew',
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.crews add column if not exists cat text not null default 'time';
-- local crews: the general area only (rounded to about a mile), never a home address
alter table public.crews add column if not exists place text;
alter table public.crews add column if not exists lat double precision;
alter table public.crews add column if not exists lng double precision;   -- time | goal | life | work | age | fan | interest

create table if not exists public.crew_members (
  crew_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  streak int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

alter table public.crew_members add column if not exists avatar_url text;   -- their picture, shown next to their name in the crew

create table if not exists public.crew_checkins (
  crew_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  name text not null,
  going boolean not null default false,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (crew_id, user_id, day)
);

create table if not exists public.crew_messages (
  id bigint generated always as identity primary key,
  crew_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  text text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists crew_messages_crew_idx on public.crew_messages (crew_id, created_at desc);

alter table public.profiles       enable row level security;
alter table public.crews          enable row level security;
alter table public.crew_members   enable row level security;
alter table public.crew_checkins  enable row level security;
alter table public.crew_messages  enable row level security;

-- profiles: strictly private
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- crews: everyone signed in can see; you create your own
drop policy if exists "read crews" on public.crews;
create policy "read crews" on public.crews for select to authenticated using (true);
drop policy if exists "create crew" on public.crews;
create policy "create crew" on public.crews for insert to authenticated with check (auth.uid() = created_by);

-- members / check-ins / messages: visible to signed-in users, writable only as yourself
drop policy if exists "read members" on public.crew_members;
create policy "read members" on public.crew_members for select to authenticated using (true);
drop policy if exists "join" on public.crew_members;
create policy "join" on public.crew_members for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own membership" on public.crew_members;
create policy "update own membership" on public.crew_members for update to authenticated using (auth.uid() = user_id);
drop policy if exists "leave" on public.crew_members;
create policy "leave" on public.crew_members for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "read checkins" on public.crew_checkins;
create policy "read checkins" on public.crew_checkins for select to authenticated using (true);
drop policy if exists "write own checkin" on public.crew_checkins;
create policy "write own checkin" on public.crew_checkins for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own checkin" on public.crew_checkins;
create policy "update own checkin" on public.crew_checkins for update to authenticated using (auth.uid() = user_id);

drop policy if exists "read messages" on public.crew_messages;
create policy "read messages" on public.crew_messages for select to authenticated using (true);
drop policy if exists "post message" on public.crew_messages;
create policy "post message" on public.crew_messages for insert to authenticated with check (auth.uid() = user_id);

-- ---------- progress photo storage (private, one folder per user) ----------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "photos read own" on storage.objects;
create policy "photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos upload own" on storage.objects;
create policy "photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos update own" on storage.objects;
create policy "photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos delete own" on storage.objects;
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Crew feed, challenges, and find friends (re-runnable)
-- =====================================================================

-- ---------- crew feed: posts + likes (only members of a crew can read or post in it) ----------
create table if not exists public.crew_posts (
  id bigint generated always as identity primary key,
  crew_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  kind text not null default 'post',                 -- post | qotd | workout | photo
  text text not null default '' check (char_length(text) <= 1000),
  image_path text,
  image_paths text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.crew_posts add column if not exists image_paths text[] not null default '{}';
-- posts made while the profile is public also show on the public profile (photos stay crew-only)
alter table public.crew_posts add column if not exists is_public boolean not null default false;
create index if not exists crew_posts_crew_idx on public.crew_posts (crew_id, created_at desc);

create table if not exists public.crew_post_likes (
  post_id bigint not null references public.crew_posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (post_id, user_id)
);

alter table public.crew_posts enable row level security;
alter table public.crew_post_likes enable row level security;

drop policy if exists "members read posts" on public.crew_posts;
create policy "members read posts" on public.crew_posts for select to authenticated
  using (exists (select 1 from public.crew_members m where m.crew_id = crew_posts.crew_id and m.user_id = auth.uid()));
drop policy if exists "members post" on public.crew_posts;
create policy "members post" on public.crew_posts for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.crew_members m where m.crew_id = crew_posts.crew_id and m.user_id = auth.uid()));
drop policy if exists "delete own post" on public.crew_posts;
create policy "delete own post" on public.crew_posts for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "members read likes" on public.crew_post_likes;
create policy "members read likes" on public.crew_post_likes for select to authenticated
  using (exists (select 1 from public.crew_posts p join public.crew_members m on m.crew_id = p.crew_id where p.id = post_id and m.user_id = auth.uid()));
drop policy if exists "like" on public.crew_post_likes;
create policy "like" on public.crew_post_likes for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.crew_posts p join public.crew_members m on m.crew_id = p.crew_id where p.id = post_id and m.user_id = auth.uid()));
drop policy if exists "unlike" on public.crew_post_likes;
create policy "unlike" on public.crew_post_likes for delete to authenticated using (auth.uid() = user_id);

-- ---------- crew photos (private bucket; path = crewId/userId/photoId.jpg) ----------
-- Qualify the object path: crew_members also has a name column, which would
-- shadow an unqualified name inside the membership subqueries.
insert into storage.buckets (id, name, public) values ('crew-photos', 'crew-photos', false) on conflict (id) do nothing;

drop policy if exists "crew photos read" on storage.objects;
create policy "crew photos read" on storage.objects for select to authenticated
  using (bucket_id = 'crew-photos' and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = (storage.foldername(storage.objects.name))[1]));
drop policy if exists "crew photos upload" on storage.objects;
create policy "crew photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'crew-photos' and (storage.foldername(storage.objects.name))[2] = auth.uid()::text
    and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = (storage.foldername(storage.objects.name))[1]));
drop policy if exists "crew photos delete own" on storage.objects;
create policy "crew photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'crew-photos' and (storage.foldername(storage.objects.name))[2] = auth.uid()::text);
-- crew posts can carry a short video (up to 30 seconds) in the same bucket; cap one file at 45 MB (see crew-videos.sql)
update storage.buckets set file_size_limit = 47185920, allowed_mime_types = null where id = 'crew-photos';

-- ---------- challenges: one row per person per challenge cohort ----------
create table if not exists public.challenge_scores (
  cohort text not null,                              -- e.g. gymrat:2026-10-01
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  score numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (cohort, user_id)
);
alter table public.challenge_scores enable row level security;
drop policy if exists "read scores" on public.challenge_scores;
create policy "read scores" on public.challenge_scores for select to authenticated using (true);
drop policy if exists "write own score" on public.challenge_scores;
create policy "write own score" on public.challenge_scores for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own score" on public.challenge_scores;
create policy "update own score" on public.challenge_scores for update to authenticated using (auth.uid() = user_id);
drop policy if exists "delete own score" on public.challenge_scores;
create policy "delete own score" on public.challenge_scores for delete to authenticated using (auth.uid() = user_id);

-- ---------- user-created challenges ----------
create table if not exists public.custom_challenges (
  id text primary key,
  creator uuid not null references auth.users on delete cascade,
  name text not null,
  emoji text not null default '🏆',
  metric text not null,
  unit text not null,
  start_date date not null,
  end_date date not null,
  is_public boolean not null default false,            -- false = only people with the link
  created_at timestamptz not null default now()
);
alter table public.custom_challenges enable row level security;
drop policy if exists "read challenges" on public.custom_challenges;
create policy "read challenges" on public.custom_challenges for select to authenticated using (true);
drop policy if exists "create own challenge" on public.custom_challenges;
create policy "create own challenge" on public.custom_challenges for insert to authenticated with check (auth.uid() = creator);
drop policy if exists "delete own challenge" on public.custom_challenges;
create policy "delete own challenge" on public.custom_challenges for delete to authenticated using (auth.uid() = creator);

-- ---------- follows (defined before the profile policies that read it) ----------
create table if not exists public.follows (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- ---------- find friends (opt-in only) ----------
create table if not exists public.public_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  handle text not null unique,
  name text not null,
  discoverable_handle boolean not null default false,   -- people can find me by @handle
  discoverable_email boolean not null default false,    -- people who already have my email can find me
  email_hash text,                                      -- sha-256 of my email, only stored when I opt in
  updated_at timestamptz not null default now()
);
alter table public.public_profiles add column if not exists avatar_url text;   -- Google profile photo, when they signed in with Google
alter table public.public_profiles add column if not exists bio text check (bio is null or char_length(bio) <= 160);
-- existing members stay private until they choose; new members get a public profile (they can switch it off in Settings)
alter table public.public_profiles add column if not exists is_public boolean not null default false;
alter table public.public_profiles add column if not exists stats jsonb not null default '{}'::jsonb;   -- streak, workouts, calendar days, badges, crews
alter table public.public_profiles add column if not exists followers_count int not null default 0;
alter table public.public_profiles add column if not exists following_count int not null default 0;
alter table public.public_profiles enable row level security;
drop policy if exists "read discoverable" on public.public_profiles;
create policy "read discoverable" on public.public_profiles for select to authenticated
  using (
    discoverable_handle or discoverable_email or auth.uid() = user_id
    or exists (select 1 from public.follows f where f.user_id = auth.uid() and f.friend_id = public_profiles.user_id)  -- people I follow
    or exists (select 1 from public.follows f where f.friend_id = auth.uid() and f.user_id = public_profiles.user_id)  -- people who follow me
  );
drop policy if exists "read public profiles" on public.public_profiles;
create policy "read public profiles" on public.public_profiles for select to anon, authenticated using (is_public);
drop policy if exists "manage own profile card" on public.public_profiles;
create policy "manage own profile card" on public.public_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.follows enable row level security;
drop policy if exists "manage own follows" on public.follows;
create policy "manage own follows" on public.follows for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- people can see who follows them (so they can follow back)
drop policy if exists "see my followers" on public.follows;
create policy "see my followers" on public.follows for select to authenticated using (auth.uid() = friend_id);

-- keep follower / following counts on the profile card up to date
create or replace function public.refresh_follow_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  a := coalesce(new.user_id, old.user_id);    -- the person who follows
  b := coalesce(new.friend_id, old.friend_id); -- the person being followed
  update public.public_profiles set following_count = (select count(*) from public.follows where user_id = a) where user_id = a;
  update public.public_profiles set followers_count = (select count(*) from public.follows where friend_id = b) where user_id = b;
  return null;
end $$;
drop trigger if exists follows_counts on public.follows;
create trigger follows_counts after insert or delete on public.follows for each row execute function public.refresh_follow_counts();
-- one-time catch-up for follows that already exist
update public.public_profiles pp set
  following_count = (select count(*) from public.follows f where f.user_id = pp.user_id),
  followers_count = (select count(*) from public.follows f where f.friend_id = pp.user_id);

-- ---------- map: "I'd join a crew here" wait list and crew reports ----------
create table if not exists public.crew_interest (
  user_id uuid primary key references auth.users on delete cascade,
  lat double precision not null,
  lng double precision not null,
  place text,
  created_at timestamptz not null default now()
);
alter table public.crew_interest enable row level security;
drop policy if exists "own interest" on public.crew_interest;
create policy "own interest" on public.crew_interest for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- only a count leaves the database, never who or where exactly
create or replace function public.interest_near(p_lat double precision, p_lng double precision, p_km double precision default 40)
returns integer language sql security definer set search_path = public stable as $$
  select count(*)::int from public.crew_interest
  where lat between p_lat - p_km / 111.0 and p_lat + p_km / 111.0
    and lng between p_lng - p_km / (111.0 * greatest(cos(radians(p_lat)), 0.2)) and p_lng + p_km / (111.0 * greatest(cos(radians(p_lat)), 0.2));
$$;
grant execute on function public.interest_near(double precision, double precision, double precision) to authenticated;

create table if not exists public.crew_reports (
  id bigint generated always as identity primary key,
  crew_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
alter table public.crew_reports enable row level security;
drop policy if exists "report a crew" on public.crew_reports;
create policy "report a crew" on public.crew_reports for insert to authenticated with check (auth.uid() = user_id);

-- ---------- public posts (needs public_profiles.is_public, so it comes last) ----------
drop policy if exists "read public posts" on public.crew_posts;
create policy "read public posts" on public.crew_posts for select to anon, authenticated
  using (is_public and exists (select 1 from public.public_profiles pp where pp.user_id = crew_posts.user_id and pp.is_public));

-- ---------- post comments (see also supabase/comments.sql, the same block for an existing database) ----------
create table if not exists public.crew_post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.crew_posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null default 'Member',
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists crew_post_comments_post_idx on public.crew_post_comments (post_id, created_at);
alter table public.crew_post_comments enable row level security;

-- Set the display name from the commenter's own profile (so nobody can sign a comment with
-- someone else's name), trim the text, and slow down spam: 30 comments per hour each.
create or replace function public.prepare_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select nullif(btrim(p.name), '') into who from public.profiles p where p.id = new.user_id;
  new.name := coalesce(who, 'Member');
  new.text := btrim(new.text);
  if (select count(*) from public.crew_post_comments c where c.user_id = new.user_id and c.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'You are commenting very fast. Try again in a little while.';
  end if;
  return new;
end $$;
drop trigger if exists crew_post_comments_prepare on public.crew_post_comments;
create trigger crew_post_comments_prepare before insert on public.crew_post_comments
  for each row execute function public.prepare_comment();

-- Reading follows the post: if you can see the post (row-level security on crew_posts applies
-- inside this check), you can see its comments. Signed-out visitors see comments on public posts.
drop policy if exists "read comments" on public.crew_post_comments;
create policy "read comments" on public.crew_post_comments for select to anon, authenticated
  using (exists (select 1 from public.crew_posts p where p.id = post_id));
drop policy if exists "add comment" on public.crew_post_comments;
create policy "add comment" on public.crew_post_comments for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.crew_posts p where p.id = post_id));
-- delete your own comment, or any comment on your own post
drop policy if exists "delete comment" on public.crew_post_comments;
create policy "delete comment" on public.crew_post_comments for delete to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.crew_posts p where p.id = post_id and p.user_id = auth.uid()));

-- Report a comment (you can only file reports; nobody reads them in the app, you review them here)
create table if not exists public.comment_reports (
  id bigint generated always as identity primary key,
  comment_id bigint not null references public.crew_post_comments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);
alter table public.comment_reports enable row level security;
drop policy if exists "report a comment" on public.comment_reports;
create policy "report a comment" on public.comment_reports for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.crew_post_comments c where c.id = comment_id));

-- ---------- in-app notifications (see also supabase/notifications.sql, the same block for an existing database) ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,      -- who gets it
  kind text not null check (kind in ('comment', 'like', 'follow')),
  actor_id uuid not null references auth.users on delete cascade,     -- who did it
  actor_name text not null default 'Someone',
  post_id bigint references public.crew_posts on delete cascade,
  snippet text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
-- one notification per person per post like, and per follower (unlike then like again stays quiet)
create unique index if not exists notifications_like_once on public.notifications (user_id, post_id, actor_id) where kind = 'like';
create unique index if not exists notifications_follow_once on public.notifications (user_id, actor_id) where kind = 'follow';
alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications" on public.notifications for delete to authenticated using (auth.uid() = user_id);
-- the only thing the app may change is the read flag
revoke insert, update on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;

create or replace function public.notify_first_name(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select split_part(coalesce((select nullif(btrim(p.name), '') from public.profiles p where p.id = uid), 'Someone'), ' ', 1)
$$;

create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select p.user_id into owner from public.crew_posts p where p.id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, kind, actor_id, actor_name, post_id, snippet)
    values (owner, 'comment', new.user_id, split_part(new.name, ' ', 1), new.post_id, left(new.text, 140));
  end if;
  return new;
end $$;
drop trigger if exists crew_post_comments_notify on public.crew_post_comments;
create trigger crew_post_comments_notify after insert on public.crew_post_comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select p.user_id into owner from public.crew_posts p where p.id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, kind, actor_id, actor_name, post_id)
    values (owner, 'like', new.user_id, public.notify_first_name(new.user_id), new.post_id)
    on conflict (user_id, post_id, actor_id) where kind = 'like' do nothing;
  end if;
  return new;
end $$;
drop trigger if exists crew_post_likes_notify on public.crew_post_likes;
create trigger crew_post_likes_notify after insert on public.crew_post_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.friend_id <> new.user_id then
    insert into public.notifications (user_id, kind, actor_id, actor_name)
    values (new.friend_id, 'follow', new.user_id, public.notify_first_name(new.user_id))
    on conflict (user_id, actor_id) where kind = 'follow' do nothing;
  end if;
  return new;
end $$;
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- ---------- likes on comments (see also supabase/comment-likes.sql, the same block for an existing database) ----------
create table if not exists public.crew_comment_likes (
  comment_id bigint not null references public.crew_post_comments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null default 'Member',
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.crew_comment_likes enable row level security;

-- show a name next to each like, always taken from the person's own profile
create or replace function public.prepare_comment_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select nullif(btrim(p.name), '') into who from public.profiles p where p.id = new.user_id;
  new.name := coalesce(who, 'Member');
  return new;
end $$;
drop trigger if exists crew_comment_likes_prepare on public.crew_comment_likes;
create trigger crew_comment_likes_prepare before insert on public.crew_comment_likes
  for each row execute function public.prepare_comment_like();

-- who can see a like follows who can see the comment (and so the post it is on)
drop policy if exists "read comment likes" on public.crew_comment_likes;
create policy "read comment likes" on public.crew_comment_likes for select to anon, authenticated
  using (exists (select 1 from public.crew_post_comments c where c.id = comment_id));
drop policy if exists "like a comment" on public.crew_comment_likes;
create policy "like a comment" on public.crew_comment_likes for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.crew_post_comments c where c.id = comment_id));
drop policy if exists "unlike a comment" on public.crew_comment_likes;
create policy "unlike a comment" on public.crew_comment_likes for delete to authenticated using (auth.uid() = user_id);
