-- OPTIONAL. The easiest way to schedule the daily clean-up is the dashboard: Integrations > Cron > Create job, run once a
-- day, type "Supabase Edge Function", pick expire-videos. Use this SQL only if you would rather schedule it from the SQL Editor.
--
-- Before running: deploy the expire-videos function first, then replace the two placeholders below with your project's
-- address (Project Settings > API) and its public "anon" or "publishable" key. Do not commit the real values anywhere.
-- If a run reports 401, open the function's settings and turn off "Verify JWT": the function only deletes clips that are
-- already past 60 days, so running it extra times does nothing.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'expire-crew-videos',
  '17 3 * * *',  -- every day at 03:17 UTC
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/expire-videos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer YOUR-PUBLIC-KEY'),
    body := '{}'::jsonb
  );
  $$
);

-- To stop it later:  select cron.unschedule('expire-crew-videos');
