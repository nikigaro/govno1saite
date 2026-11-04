/*
# Profile avatars

1. Plain-English summary
- Registered users can upload a profile picture. It is cropped to a square and stored as a small WebP image, at most 5 MB.
- Each account can only write its own avatar file, and only through the profile functions.

2. New objects
- Storage bucket `avatars` (public read, 5 MB limit, WebP only).
- `author_profiles.avatar_path`: path of the account's avatar, null if none.
- `current_author_id()`: returns the author id of the signed-in user (null for guests).
- `set_author_avatar(p_path)`: saves the avatar path after upload, only for the signed-in user's own file.

3. Security
- Storage write policies allow only the file `<author id>/avatar.webp` of the signed-in account.
- The avatar path can only be set to that same file.
*/

CREATE OR REPLACE FUNCTION public.current_author_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
SELECT aa.author_id FROM public.author_accounts AS aa WHERE aa.user_id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.current_author_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_author_id() TO authenticated;

ALTER TABLE public.author_profiles ADD COLUMN IF NOT EXISTS avatar_path text;
GRANT SELECT (avatar_path) ON public.author_profiles TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/webp'];

DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name = public.current_author_id() || '/avatar.webp');

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND name = public.current_author_id() || '/avatar.webp')
WITH CHECK (bucket_id = 'avatars' AND name = public.current_author_id() || '/avatar.webp');

CREATE OR REPLACE FUNCTION public.set_author_avatar(p_path text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_author text := public.current_author_id();
BEGIN
IF v_author IS NULL THEN
RAISE EXCEPTION 'Войдите в аккаунт' USING ERRCODE = 'P0001';
END IF;
IF p_path IS DISTINCT FROM (v_author || '/avatar.webp') THEN
RAISE EXCEPTION 'Неверный файл аватара' USING ERRCODE = 'P0001';
END IF;

UPDATE public.author_profiles
SET avatar_path = p_path, updated_at = now()
WHERE author_id = v_author;

RETURN p_path;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_author_avatar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_author_avatar(text) TO authenticated;
