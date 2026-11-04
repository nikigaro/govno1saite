/*
# Allow reading own avatar file for upserts

1. Plain-English summary
- Replacing an existing profile picture is an "upsert" (overwrite if the file exists). The storage system needs permission to see the existing file before overwriting it, and that permission was missing, so uploads failed.

2. Security
- Adds a read policy on storage objects that only lets a signed-in account see its own avatar file `<author id>/avatar.webp`.
- Avatars stay publicly viewable through the public bucket URL; this policy only affects the API.
*/

DROP POLICY IF EXISTS "avatar_select_own" ON storage.objects;
CREATE POLICY "avatar_select_own" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND name = public.current_author_id() || '/avatar.webp');
