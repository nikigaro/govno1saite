/*
# Give guests a playful nickname in the chat

1. New Functions
- `guest_nick(p_author_id)`: builds the display name for a visitor who has no registered nickname, in the form "НеЧелик <прилагательное>". The adjective is picked from a fixed list based on the visitor's identifier, so the same device always gets the same name.

2. Modified Functions
- `send_chat_message(p_author_id, p_body)`: a visitor without a profile is now named with `guest_nick` instead of "Аноним". Everything else about sending is unchanged.

3. Security
- `guest_nick` is internal: it is not callable by visitors directly.
- `send_chat_message` keeps its existing grants.

4. Notes
- Idempotent: safe to run again.
- Messages already in the chat keep the name they were sent with.
*/

CREATE OR REPLACE FUNCTION public.guest_nick(p_author_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_words text[] := ARRAY[
    'сметанный', 'бодрый', 'сонный', 'хитрый', 'дерзкий', 'ленивый', 'гордый', 'таинственный',
    'мохнатый', 'румяный', 'усатый', 'важный', 'быстрый', 'тихий', 'веселый', 'грустный',
    'суровый', 'добрый', 'лихой', 'пушистый', 'соленый', 'картофельный', 'рыжий', 'зеленый',
    'мудрый', 'задорный', 'сладкий', 'стальной', 'ночной', 'утренний', 'облачный', 'ржавый'
  ];
BEGIN
  RETURN 'НеЧелик ' || v_words[(pg_catalog.hashtext(p_author_id) & 2147483647) % cardinality(v_words) + 1];
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guest_nick(text) FROM PUBLIC, anon, authenticated;

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
  VALUES (p_author_id, coalesce(v_nick, public.guest_nick(p_author_id)), v_color, v_body)
  RETURNING chat_messages.id, chat_messages.author_name, chat_messages.author_color, chat_messages.body, chat_messages.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_chat_message(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text) TO anon, authenticated;
