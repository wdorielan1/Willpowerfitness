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
