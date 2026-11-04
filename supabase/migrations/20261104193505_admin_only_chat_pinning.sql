/*
# Admin-only chat pinning and locked-down chat messages

1. Plain-English summary
- Only administrators can pin a chat message, and only one message can be pinned at a time.
- Pinning previously worked through a rule that let anyone edit any chat message, including its author name, color and badges. That rule is removed.

2. New functions
- set_chat_message_pinned(p_message_id, p_pinned): pins or unpins a chat message. Admin only.

3. Security changes
- Removed the "Allow update pins" policy on chat messages.
- Revoked INSERT, UPDATE and DELETE on chat messages from anon and authenticated. Reading stays allowed; messages are written only through send_chat_message.
- Fixed the search path on is_author_color so it cannot be hijacked.
*/

DROP POLICY IF EXISTS "Allow update pins" ON public.chat_messages;
REVOKE INSERT, UPDATE, DELETE ON public.chat_messages FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_chat_message_pinned(p_message_id bigint, p_pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.author_profiles AS ap
    WHERE ap.author_id = public.current_author_id() AND ap.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Закреплять сообщения может только администратор' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chat_messages WHERE id = p_message_id) THEN
    RAISE EXCEPTION 'Сообщение не найдено' USING ERRCODE = 'P0001';
  END IF;

  IF p_pinned THEN
    UPDATE public.chat_messages SET is_pinned = false WHERE is_pinned AND id <> p_message_id;
  END IF;
  UPDATE public.chat_messages SET is_pinned = p_pinned WHERE id = p_message_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_chat_message_pinned(bigint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_chat_message_pinned(bigint, boolean) TO authenticated;

ALTER FUNCTION public.is_author_color(text) SET search_path TO '';
