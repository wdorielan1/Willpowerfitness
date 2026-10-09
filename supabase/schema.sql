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

create table if not exists public.crew_members (
  crew_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  streak int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

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
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
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
insert into storage.buckets (id, name, public) values ('crew-photos', 'crew-photos', false) on conflict (id) do nothing;

drop policy if exists "crew photos read" on storage.objects;
create policy "crew photos read" on storage.objects for select to authenticated
  using (bucket_id = 'crew-photos' and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = (storage.foldername(name))[1]));
drop policy if exists "crew photos upload" on storage.objects;
create policy "crew photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'crew-photos' and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = (storage.foldername(name))[1]));
drop policy if exists "crew photos delete own" on storage.objects;
create policy "crew photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'crew-photos' and (storage.foldername(name))[2] = auth.uid()::text);

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
alter table public.public_profiles enable row level security;
drop policy if exists "read discoverable" on public.public_profiles;
create policy "read discoverable" on public.public_profiles for select to authenticated
  using (discoverable_handle or discoverable_email or auth.uid() = user_id);
drop policy if exists "manage own profile card" on public.public_profiles;
create policy "manage own profile card" on public.public_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.follows (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
alter table public.follows enable row level security;
drop policy if exists "manage own follows" on public.follows;
create policy "manage own follows" on public.follows for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
