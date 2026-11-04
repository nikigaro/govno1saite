/*
# Create imageboard schema

1. New Tables
- `boards`: discussion sections (slug, title, description).
- `posts`: every message. A post with no `thread_id` is a thread opener; otherwise it is a reply inside that thread. Holds text, optional picture, anonymous author name and id, bump time, reply count, report count and a hidden flag.

2. Storage
- Public bucket `post-images` for pictures, limited to 5 MB and common image types.

3. Security
- RLS enabled on `boards` and `posts`. Anonymous visitors can read boards and visible posts only.
- No direct insert, update or delete for visitors on `posts`. All writes go through functions that validate input.
- Picture upload is allowed only into `post-images`, enforced by policy and bucket limits.
- Functions `create_thread`, `create_reply`, `report_post` run with owner rights, have a fixed search path and are callable by visitors only.

4. Notes
- Threads beyond 100 per board are hidden automatically (oldest first).
- Threads stop being bumped after 300 replies.
- A post is hidden automatically after 5 reports.
*/

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]{1,16}$'),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  thread_id bigint REFERENCES posts(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT 'Аноним',
  author_id text NOT NULL DEFAULT '',
  image_path text,
  reply_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  bumped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_subject_len CHECK (char_length(subject) <= 120),
  CONSTRAINT posts_body_len CHECK (char_length(body) <= 4000),
  CONSTRAINT posts_author_name_len CHECK (char_length(author_name) BETWEEN 1 AND 40),
  CONSTRAINT posts_author_id_len CHECK (char_length(author_id) <= 16)
);

CREATE INDEX IF NOT EXISTS posts_board_threads_idx ON posts (board_id, bumped_at DESC) WHERE thread_id IS NULL;
CREATE INDEX IF NOT EXISTS posts_thread_idx ON posts (thread_id, created_at);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON boards TO anon, authenticated;
GRANT SELECT ON posts TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_boards" ON boards;
CREATE POLICY "anon_select_boards" ON boards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_visible_posts" ON posts;
CREATE POLICY "anon_select_visible_posts" ON posts FOR SELECT
  TO anon, authenticated USING (is_hidden = false);

INSERT INTO boards (slug, title, description) VALUES
  ('b', 'Бред', 'Всё, что не влезает в другие разделы'),
  ('gamer', 'Игры', 'Обсуждение игр, консолей и всего, что с ними связано'),
  ('tech', 'Технологии', 'Гаджеты, софт, железо и программирование'),
  ('art', 'Творчество', 'Рисунки, фото, музыка и мемы'),
  ('news', 'Новости', 'Что происходит в мире')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION create_thread(
  p_board_slug text,
  p_subject text,
  p_body text,
  p_author_name text,
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
  v_post posts;
  v_name text;
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

  v_name := coalesce(nullif(trim(p_author_name), ''), 'Аноним');

  INSERT INTO posts (board_id, subject, body, author_name, author_id, image_path)
  VALUES (
    v_board_id,
    left(trim(coalesce(p_subject, '')), 120),
    left(trim(p_body), 4000),
    left(v_name, 40),
    left(coalesce(p_author_id, ''), 16),
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
  p_author_name text,
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

  INSERT INTO posts (board_id, thread_id, body, author_name, author_id, image_path)
  VALUES (
    v_thread.board_id,
    v_thread.id,
    left(trim(coalesce(p_body, '')), 4000),
    left(coalesce(nullif(trim(p_author_name), ''), 'Аноним'), 40),
    left(coalesce(p_author_id, ''), 16),
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

CREATE OR REPLACE FUNCTION report_post(p_post_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts
  SET report_count = report_count + 1,
      is_hidden = (report_count + 1 >= 5)
  WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Сообщение не найдено';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_thread(text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_reply(bigint, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION report_post(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_thread(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_reply(bigint, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION report_post(bigint) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "anon_upload_post_images" ON storage.objects;
CREATE POLICY "anon_upload_post_images" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'post-images');

DROP POLICY IF EXISTS "anon_read_post_images" ON storage.objects;
CREATE POLICY "anon_read_post_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'post-images');
