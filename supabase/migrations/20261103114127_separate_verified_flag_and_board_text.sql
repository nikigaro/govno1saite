/*
# Separate verified flag and update the Движуха board description

1. Plain-English summary
- Verification is now its own flag instead of a role, so one account can be both admin and verified.
- The account with the nickname "Мурс" is verified. Verified badges are shown on the right of the nickname.
- The "Движуха" board description is changed to "политика, срачи, сво".

2. Modified tables
- `author_profiles`: new `is_verified` flag (default false). The `role` column is back to allowing only 'admin'.
- `chat_messages` and `posts`: new `author_verified` flag, copied from the author's profile when the message or post is created.

3. Modified functions
- `send_chat_message`, `create_thread`, `create_reply`: also store `author_verified`.

4. Security
- Users cannot set their own verified flag. No function sets it from user input, and the profile save function does not touch it.
*/

ALTER TABLE public.author_profiles DROP CONSTRAINT IF EXISTS author_profiles_role_allowed;
UPDATE public.author_profiles SET role = NULL WHERE role = 'verified';
ALTER TABLE public.author_profiles
ADD CONSTRAINT author_profiles_role_allowed CHECK (role IS NULL OR role IN ('admin'));

ALTER TABLE public.author_profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS author_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_verified boolean NOT NULL DEFAULT false;

GRANT SELECT (author_verified) ON public.chat_messages TO anon, authenticated;
GRANT SELECT (author_role, author_verified) ON public.posts TO anon, authenticated;

UPDATE public.author_profiles
SET is_verified = true
WHERE nick_key = public.author_nick_key('Мурс');

UPDATE public.chat_messages
SET author_verified = true
WHERE author_id IN (SELECT author_id FROM public.author_profiles WHERE is_verified);

UPDATE public.posts
SET author_verified = true
WHERE author_id IN (SELECT author_id FROM public.author_profiles WHERE is_verified);

UPDATE public.boards
SET description = 'политика, срачи, сво'
WHERE slug = 'dvizh';

DROP FUNCTION IF EXISTS public.send_chat_message(text, text);

CREATE FUNCTION public.send_chat_message(p_author_id text, p_body text)
RETURNS TABLE(id bigint, author_name text, author_color text, author_role text, author_verified boolean, body text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_body text := btrim(coalesce(p_body, ''));
v_nick text;
v_color text;
v_role text;
v_verified boolean;
BEGIN
IF NOT EXISTS (
SELECT 1 FROM public.author_accounts AS aa
WHERE aa.user_id = auth.uid() AND aa.author_id = p_author_id
) THEN
RAISE EXCEPTION 'Чтобы писать в чат, зарегистрируйтесь' USING ERRCODE = 'P0001';
END IF;
IF char_length(v_body) = 0 THEN
RAISE EXCEPTION 'Сообщение не может быть пустым' USING ERRCODE = 'P0001';
END IF;
IF char_length(v_body) > 500 THEN
RAISE EXCEPTION 'Сообщение длиннее 500 символов' USING ERRCODE = 'P0001';
END IF;

SELECT ap.nick, ap.color, ap.role, ap.is_verified
INTO v_nick, v_color, v_role, v_verified
FROM public.author_profiles AS ap
WHERE ap.author_id = p_author_id;

RETURN QUERY
INSERT INTO public.chat_messages (author_id, author_name, author_color, author_role, author_verified, body)
VALUES (p_author_id, coalesce(v_nick, public.guest_nick(p_author_id)), v_color, v_role, coalesce(v_verified, false), v_body)
RETURNING chat_messages.id, chat_messages.author_name, chat_messages.author_color, chat_messages.author_role, chat_messages.author_verified, chat_messages.body, chat_messages.created_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_chat_message(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_thread(p_board_slug text, p_subject text, p_body text, p_author_id text, p_image_path text)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
v_board_id uuid;
v_author author_profiles;
v_post posts;
BEGIN
SELECT id INTO v_board_id FROM boards WHERE slug = p_board_slug;
IF v_board_id IS NULL THEN
RAISE EXCEPTION 'Раздел не найден';
END IF;

IF p_image_path IS NULL OR NOT EXISTS (
SELECT 1 FROM storage.objects WHERE bucket_id = 'post-images' AND name = p_image_path
) THEN
RAISE EXCEPTION 'Для нового треда нужна картинка';
END IF;

IF char_length(trim(coalesce(p_body, ''))) = 0 THEN
RAISE EXCEPTION 'Напишите текст сообщения';
END IF;

SELECT * INTO v_author FROM author_profiles WHERE author_id = p_author_id;

INSERT INTO posts (board_id, subject, body, author_name, author_id, author_color, author_role, author_verified, image_path)
VALUES (
v_board_id,
left(trim(coalesce(p_subject, '')), 120),
left(trim(p_body), 4000),
coalesce(v_author.nick, 'Аноним'),
left(coalesce(p_author_id, ''), 16),
v_author.color,
v_author.role,
coalesce(v_author.is_verified, false),
p_image_path
)
RETURNING * INTO v_post;

UPDATE posts SET is_hidden = true
WHERE id IN (
SELECT id FROM posts
WHERE board_id = v_board_id AND thread_id IS NULL AND is_hidden = false
ORDER BY bumped_at DESC
OFFSET 100
);

RETURN v_post;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_reply(p_thread_id bigint, p_body text, p_author_id text, p_image_path text)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
v_thread posts;
v_author author_profiles;
v_post posts;
BEGIN
SELECT * INTO v_thread FROM posts
WHERE id = p_thread_id AND thread_id IS NULL AND is_hidden = false;
IF v_thread.id IS NULL THEN
RAISE EXCEPTION 'Тред не найден или закрыт';
END IF;

IF char_length(trim(coalesce(p_body, ''))) = 0 AND p_image_path IS NULL THEN
RAISE EXCEPTION 'Напишите текст или прикрепите картинку';
END IF;

IF p_image_path IS NOT NULL AND NOT EXISTS (
SELECT 1 FROM storage.objects WHERE bucket_id = 'post-images' AND name = p_image_path
) THEN
RAISE EXCEPTION 'Картинка не загружена';
END IF;

SELECT * INTO v_author FROM author_profiles WHERE author_id = p_author_id;

INSERT INTO posts (board_id, thread_id, body, author_name, author_id, author_color, author_role, author_verified, image_path)
VALUES (
v_thread.board_id,
v_thread.id,
left(trim(coalesce(p_body, '')), 4000),
coalesce(v_author.nick, 'Аноним'),
left(coalesce(p_author_id, ''), 16),
v_author.color,
v_author.role,
coalesce(v_author.is_verified, false),
p_image_path
)
RETURNING * INTO v_post;

UPDATE posts
SET reply_count = reply_count + 1,
bumped_at = CASE WHEN reply_count < 300 THEN now() ELSE bumped_at END
WHERE id = v_thread.id;

RETURN v_post;
END;
$function$;
