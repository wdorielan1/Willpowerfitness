-- Explore: the public feed. Run this once in the Supabase SQL editor, then "Reload schema" (Settings > API).
--
-- Posts from people whose profile is public are already readable by any signed-in person (see "read public posts" in schema.sql).
-- What was missing is the pictures and videos: they live in the private "crew-photos" bucket, which only crew mates can open.
-- This adds one rule so any signed-in person can open the pictures and videos that belong to a PUBLIC post of a PUBLIC profile.
-- Nothing else becomes readable: crew-only posts, private profiles and everyone's other files stay as they were.
drop policy if exists "public post media read" on storage.objects;
create policy "public post media read" on storage.objects for select to authenticated
  using (
    bucket_id = 'crew-photos'
    and exists (
      select 1
      from public.crew_posts p
      join public.public_profiles pp on pp.user_id = p.user_id and pp.is_public
      where p.is_public
        and (storage.objects.name = p.image_path
          or storage.objects.name = any (p.image_paths)
          or storage.objects.name = (p.meta -> 'video' ->> 'path'))
    )
  );

-- Report a post (you can only file reports; nobody reads them in the app, you review them here in the table editor).
create table if not exists public.post_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.crew_posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
alter table public.post_reports enable row level security;
drop policy if exists "report a post" on public.post_reports;
create policy "report a post" on public.post_reports for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.crew_posts p where p.id = post_id));
