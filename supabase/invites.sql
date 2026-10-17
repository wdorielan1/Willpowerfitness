-- =====================================================================
-- Invite links that make the inviter follow the new person back (re-runnable).
--
-- The Friends page makes a one-time code each time someone shares their invite. The link carries it (`?inv=CODE`). When the
-- new person finishes setting up, the app redeems the code and the two follow each other.
--
-- Why a code and not just the inviter's name in the link: a follow is normally written by the person doing the following,
-- and anyone can type any name into a link. A random code that only the inviter could have made proves the invite was real,
-- so nobody can use a made-up link to make a stranger follow them. Each code works once and for 30 days.
--
-- Needs the follows table from supabase/schema.sql. Safe to run again. Until it has run, the app still shares a normal link
-- (the new person follows the inviter, as before), so nothing breaks.
-- =====================================================================

create table if not exists public.invites (
  code text primary key check (code ~ '^[A-Za-z0-9]{16,64}$'),
  inviter_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  used_by uuid references auth.users on delete set null,
  used_at timestamptz   -- the one thing that decides "used", because used_by empties if that person later deletes their account
);
alter table public.invites enable row level security;
revoke all on public.invites from anon;
revoke update, delete on public.invites from authenticated;

-- you can make and see your own codes; nobody can change them (redeeming goes through accept_invite below)
drop policy if exists "see my invites" on public.invites;
create policy "see my invites" on public.invites for select to authenticated using (auth.uid() = inviter_id);
drop policy if exists "make my invites" on public.invites;
create policy "make my invites" on public.invites for insert to authenticated
  with check (auth.uid() = inviter_id and used_by is null and used_at is null);

-- at most 30 new codes a day each, so nobody can fill the table
create or replace function public.limit_invites() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.invites where inviter_id = new.inviter_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many invites today. Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists invites_limit on public.invites;
create trigger invites_limit before insert on public.invites for each row execute function public.limit_invites();
revoke all on function public.limit_invites() from public, anon, authenticated;

-- Redeem a code as the signed-in person. Returns the inviter's id, or null when the code is unknown, already used, older than
-- 30 days, or their own. Claiming the code and adding both follows happen together, so two people can never share one code.
create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); inviter uuid;
begin
  if me is null then return null; end if;
  update public.invites set used_by = me, used_at = now()
   where code = p_code and used_at is null and inviter_id <> me and created_at > now() - interval '30 days'
  returning inviter_id into inviter;
  if inviter is null then return null; end if;
  insert into public.follows (user_id, friend_id) values (me, inviter), (inviter, me) on conflict do nothing;
  return inviter;
end $$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
