-- =====================================================================
-- Post comments (re-runnable). Any signed-in person can comment on any post
-- they are allowed to see: crew posts for crew members, public posts for
-- everyone. Posts keep their own privacy: you can't see or comment on a post
-- you can't read.
-- =====================================================================

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
