/*
# Require a registered account to write in the chat

1. Plain-English summary
- Only people with a registered account can send chat messages. Guests can still read the chat.
- A sender must be signed in, and the author id they send must belong to their own account. This stops anyone from posting under someone else's nickname.

2. Modified functions
- `send_chat_message`: checks that the signed-in user owns the author id before inserting the message. Execute permission is now granted to signed-in users only.

3. Security
- Anonymous visitors lose the right to call `send_chat_message`.
- The check uses the account link table, so it cannot be bypassed from the browser.
*/

CREATE OR REPLACE FUNCTION public.send_chat_message(p_author_id text, p_body text)
RETURNS TABLE(id bigint, author_name text, author_color text, author_role text, body text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_body text := btrim(coalesce(p_body, ''));
v_nick text;
v_color text;
v_role text;
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

SELECT ap.nick, ap.color, ap.role
INTO v_nick, v_color, v_role
FROM public.author_profiles AS ap
WHERE ap.author_id = p_author_id;

RETURN QUERY
INSERT INTO public.chat_messages (author_id, author_name, author_color, author_role, body)
VALUES (p_author_id, coalesce(v_nick, public.guest_nick(p_author_id)), v_color, v_role, v_body)
RETURNING chat_messages.id, chat_messages.author_name, chat_messages.author_color, chat_messages.author_role, chat_messages.body, chat_messages.created_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_chat_message(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text) TO authenticated;
