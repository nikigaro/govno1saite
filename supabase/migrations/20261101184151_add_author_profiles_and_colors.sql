/*
# Add author nicknames and name colors

1. New Tables
- `author_profiles`: one row per anonymous visitor (keyed by their random author id). Stores the chosen nickname and name color.

2. Modified Tables
- `posts`: new column `author_color` stores the color the author had when they posted (null for older posts).

3. Functions
- `is_author_color(text)`: checks that a color is one of the seven allowed palette colors.
- `save_author_profile(...)`: creates or updates the visitor's nickname and color. Validates both.
- `create_thread` and `create_reply` no longer take a typed name. They copy the nickname and color from the author's profile, falling back to "Аноним".

4. Security
- RLS enabled on `author_profiles`. Visitors can read profiles; writes happen only through `save_author_profile`.
- Function permissions are granted only to visitors that need them.

5. Notes
- Changing a nickname affects only new posts; old posts keep the name they were written with.
*/

CREATE OR REPLACE FUNCTION is_author_color(p_color text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_color IN ('#f50000', '#ffec38', '#8fff38', '#38ffe1', '#383aff', '#9e38ff', '#ff38d2');
$$;

CREATE TABLE IF NOT EXISTS author_profiles (
  author_id text PRIMARY KEY CHECK (char_length(author_id) BETWEEN 1 AND 16),
  nick text NOT NULL CHECK (char_length(nick) BETWEEN 1 AND 20),
  color text NOT NULL CHECK (is_author_color(color)),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE author_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON author_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_author_profiles" ON author_profiles;
CREATE POLICY "anon_select_author_profiles" ON author_profiles FOR SELECT
  TO anon, authenticated USING (true);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_color text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_author_color_allowed'
  ) THEN
    ALTER TABLE posts ADD CONSTRAINT posts_author_color_allowed
      CHECK (author_color IS NULL OR is_author_color(author_color));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION save_author_profile(p_author_id text, p_nick text, p_color text)
RETURNS author_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile author_profiles;
BEGIN
  IF char_length(coalesce(p_author_id, '')) NOT BETWEEN 1 AND 16 THEN
    RAISE EXCEPTION 'Не удалось определить профиль';
  END IF;
  IF char_length(trim(coalesce(p_nick, ''))) = 0 THEN
    RAISE EXCEPTION 'Введите ник';
  END IF;
  IF NOT is_author_color(coalesce(p_color, '')) THEN
    RAISE EXCEPTION 'Выберите цвет из списка';
  END IF;

  INSERT INTO author_profiles (author_id, nick, color, updated_at)
  VALUES (p_author_id, left(trim(p_nick), 20), p_color, now())
  ON CONFLICT (author_id) DO UPDATE
    SET nick = EXCLUDED.nick,
        color = EXCLUDED.color,
        updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_author_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION save_author_profile(text, text, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS create_thread(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS create_reply(bigint, text, text, text, text);

CREATE OR REPLACE FUNCTION create_thread(
  p_board_slug text,
  p_subject text,
  p_body text,
  p_author_id text,
  p_image_path text
)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
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

  INSERT INTO posts (board_id, subject, body, author_name, author_id, author_color, image_path)
  VALUES (
    v_board_id,
    left(trim(coalesce(p_subject, '')), 120),
    left(trim(p_body), 4000),
    coalesce(v_author.nick, 'Аноним'),
    left(coalesce(p_author_id, ''), 16),
    v_author.color,
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
$$;

CREATE OR REPLACE FUNCTION create_reply(
  p_thread_id bigint,
  p_body text,
  p_author_id text,
  p_image_path text
)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
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

  INSERT INTO posts (board_id, thread_id, body, author_name, author_id, author_color, image_path)
  VALUES (
    v_thread.board_id,
    v_thread.id,
    left(trim(coalesce(p_body, '')), 4000),
    coalesce(v_author.nick, 'Аноним'),
    left(coalesce(p_author_id, ''), 16),
    v_author.color,
    p_image_path
  )
  RETURNING * INTO v_post;

  UPDATE posts
  SET reply_count = reply_count + 1,
      bumped_at = CASE WHEN reply_count < 300 THEN now() ELSE bumped_at END
  WHERE id = v_thread.id;

  RETURN v_post;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_thread(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_reply(bigint, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_thread(text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_reply(bigint, text, text, text) TO anon, authenticated;
