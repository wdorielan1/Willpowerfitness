-- OPTIONAL. Buzzes your phone whenever someone creates an account (email or Google), through the free ntfy app.
-- Run it in the Supabase SQL Editor. Do it in order: step 1 proves the phone side works, step 2 installs the trigger.
--
-- Before running: install the ntfy app, subscribe to a topic with a long random name (for example 25+ random letters and digits)
-- and replace every YOUR-RANDOM-TOPIC below with that exact name. ntfy topics are public by name, so the random part is the
-- only thing keeping your alerts private: treat it like a password and do not commit the real one anywhere. If you used the
-- example topic from an earlier chat message, pick a new one now.
--
-- The alert says only "New signup #12 (google)": the count and how they signed up, never a name or email, because ntfy is a
-- public service and people's addresses should not be sent to it.

-- ---------------------------------------------------------------------------------------------------------------------
-- Step 1. Test the phone side on its own. Run this, wait about 10 seconds: your phone should buzz with "Test alert".
-- ---------------------------------------------------------------------------------------------------------------------
create extension if not exists pg_net;

select net.http_post(
  url := 'https://ntfy.sh',
  body := jsonb_build_object('topic', 'YOUR-RANDOM-TOPIC', 'title', 'Will Power', 'message', 'Test alert'),
  headers := '{"Content-Type":"application/json"}'::jsonb
);

-- Then read the reply (run this on its own, a few seconds later). status_code 200 means ntfy accepted it. If the phone still
-- did not buzz, the topic in the ntfy app is not spelled exactly like the one above. Anything else, or an error_msg, says why.
select id, status_code, error_msg, left(content, 160) as reply, created
from net._http_response order by created desc limit 5;

-- ---------------------------------------------------------------------------------------------------------------------
-- Step 2. Install the trigger. A failed alert never blocks a sign-up: the problem is written to the database log instead
-- (Supabase > Logs > Postgres Logs, search "signup alert failed").
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.notify_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  select count(*) into n from auth.users;
  perform net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_build_object(
      'topic', 'YOUR-RANDOM-TOPIC',
      'title', 'Will Power',
      'message', 'New signup #' || n || ' (' || coalesce(new.raw_app_meta_data->>'provider', 'email') || ')'
    ),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  return new;
exception when others then
  raise warning 'signup alert failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_signup_notify on auth.users;
create trigger on_signup_notify after insert on auth.users
  for each row execute function public.notify_signup();

-- Nobody should be able to call it from the app: it is only for the trigger.
revoke all on function public.notify_signup() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Step 3. Test the trigger. Either create an account on the app, or in the dashboard use Authentication > Users > Add user >
-- Create new user (then delete that test user). Your phone should buzz with "New signup #N (email)".
--
-- To check the trigger is installed and on ("O" means enabled):
--   select tgname, tgenabled from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--
-- To stop the alerts later:
--   drop trigger if exists on_signup_notify on auth.users;
-- ---------------------------------------------------------------------------------------------------------------------
