-- Run in the SQL Editor of the Supabase project used by the app.
-- Re-runnable repair for crew-photo uploads and reads; keeps RLS enabled.
-- Requires the existing crew_members table and crew-photos bucket.
-- Inside membership subqueries, unqualified name binds to crew_members.name.
-- Qualify storage.objects.name so the crew is checked against the file path.

begin;

drop policy if exists "crew photos read" on storage.objects;
create policy "crew photos read" on storage.objects for select to authenticated
  using (bucket_id = 'crew-photos' and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = (storage.foldername(storage.objects.name))[1]));
drop policy if exists "crew photos upload" on storage.objects;
create policy "crew photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'crew-photos' and (storage.foldername(storage.objects.name))[2] = auth.uid()::text
    and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = (storage.foldername(storage.objects.name))[1]));

commit;
