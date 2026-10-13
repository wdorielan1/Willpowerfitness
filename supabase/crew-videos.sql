-- Run in the SQL Editor of the Supabase project used by the app.
-- Crew posts can carry a short video (up to 30 seconds). Clips are stored in the same private
-- "crew-photos" bucket as crew photos (path = crewId/userId/id.mp4), so the existing read, upload
-- and delete rules already cover them and no new policy is needed. The clip's details live in the
-- post's meta column, so no table change is needed either.
--
-- This caps one file at 45 MB on the server too, in case someone bypasses the app's own check.
-- Supabase's project-wide upload limit (Storage > Settings, 50 MB on the free plan) must be at
-- least this large for videos to upload.
update storage.buckets set file_size_limit = 47185920 where id = 'crew-photos';
