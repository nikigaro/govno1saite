/*
# Add public chat

1. New Tables
- `chat_messages`: one shared chat room for all visitors.
  - `id` (identity, primary key)
  - `author_id` (anonymous visitor token, stored but never readable by visitors)
  - `author_name` (nick copied from the author's profile at send time, "Аноним" if none)
  - `author_color` (nick colour from the allowed palette, or null)
  - `body` (message text, 1 to 500 characters)
  - `created_at` (timestamp)

2. New Functions
- `send_chat_message(p_author_id, p_body)`: trims and validates the text, copies the nick and colour from the author's profile, inserts the message and returns only the public fields.

3. Security
- Row level security enabled on `chat_messages`.
- SELECT policy for `anon` and `authenticated` (the chat is intentionally public).
- Visitors are granted SELECT only on public columns, so `author_id` is never exposed.
- Messages can only be written through `send_chat_message`; no direct INSERT grant exists.
- `send_chat_message` is callable by `anon` and `authenticated`, matching the other anonymous write functions.

4. Notes
- Statements are idempotent (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS).
- The function uses an empty search_path and fully qualified names.
*/

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id text NOT NULL,
  author_name text NOT NULL DEFAULT 'Аноним',
  author_color text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_body_length CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT chat_messages_author_color_allowed CHECK (author_color IS NULL OR public.is_author_color(author_color))
);

CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON public.chat_messages (created_at DESC, id DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, author_name, author_color, body, created_at) ON public.chat_messages TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON public.chat_messages;
CREATE POLICY "anon_select_chat_messages" ON public.chat_messages FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.send_chat_message(p_author_id text, p_body text)
RETURNS TABLE (
  id bigint,
  author_name text,
  author_color text,
  body text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_body text := btrim(coalesce(p_body, ''));
  v_nick text;
  v_color text;
BEGIN
  IF coalesce(char_length(p_author_id), 0) = 0 THEN
    RAISE EXCEPTION 'Не удалось определить автора сообщения' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(v_body) = 0 THEN
    RAISE EXCEPTION 'Сообщение не может быть пустым' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(v_body) > 500 THEN
    RAISE EXCEPTION 'Сообщение длиннее 500 символов' USING ERRCODE = 'P0001';
  END IF;

  SELECT ap.nick, ap.color
    INTO v_nick, v_color
    FROM public.author_profiles AS ap
    WHERE ap.author_id = p_author_id;

  RETURN QUERY
  INSERT INTO public.chat_messages (author_id, author_name, author_color, body)
  VALUES (p_author_id, coalesce(v_nick, 'Аноним'), v_color, v_body)
  RETURNING chat_messages.id, chat_messages.author_name, chat_messages.author_color, chat_messages.body, chat_messages.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_chat_message(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text) TO anon, authenticated;
