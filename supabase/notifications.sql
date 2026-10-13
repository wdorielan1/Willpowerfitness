-- =====================================================================
-- In-app notifications (re-runnable): someone commented on your post, liked
-- your post, or followed you. Rows are written by database triggers only, so
-- the app can't forge or miss one. You only ever see and change your own.
-- Needs the comments block (supabase/comments.sql) to be in place first.
-- =====================================================================

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
