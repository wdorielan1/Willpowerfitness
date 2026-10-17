-- =====================================================================
-- Likes on comments (re-runnable). Anyone signed in can like any comment they
-- can see. Needs the comments block (supabase/comments.sql) in place first.
-- =====================================================================

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
