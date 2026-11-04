/*
# Reserve nicknames so each one belongs to a single visitor

1. Modified Tables
- `author_profiles`: new column `nick_key` holds a normalized form of the nickname. It is lowercase, ignores spaces, punctuation and invisible characters, and maps Latin letters that look like Cyrillic ones to their Cyrillic twins, so "МУРС", "мурс" and "Mypc" all share the same key.
- Existing profiles are backfilled with their key.

2. New Functions
- `author_nick_key(text)`: builds the normalized key described above.
- `save_author_profile(...)`: now rejects a nickname whose key is already held by another visitor, rejects keys that are empty, and rejects the reserved default name "Аноним". Changing your nickname releases the old one because your profile row is updated.

3. Indexes
- A plain index on `nick_key` keeps the lookup fast. It is not unique yet because some older profiles already share a nickname. The uniqueness check lives in `save_author_profile`.

4. Security
- `author_nick_key` is not callable by visitors directly.
- Visitors still have no direct write access; profiles change only through `save_author_profile`.

5. Notes
- Idempotent: safe to run again.
- Old posts keep the name they were written with.
*/

ALTER TABLE author_profiles ADD COLUMN IF NOT EXISTS nick_key text;

CREATE OR REPLACE FUNCTION author_nick_key(p_nick text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(
    translate(
      translate(lower(normalize(coalesce(p_nick, ''), NFKC)), 'aeopcxyikmthbё', 'аеорсхуікмтнвеe'),
      chr(173) || chr(8203) || chr(8204) || chr(8205) || chr(8288) || chr(65279),
      ''
    ),
    '[[:space:]_.-]',
    '',
    'g'
  );
$$;

REVOKE EXECUTE ON FUNCTION author_nick_key(text) FROM PUBLIC, anon, authenticated;

UPDATE author_profiles SET nick_key = author_nick_key(nick) WHERE nick_key IS NULL;

CREATE INDEX IF NOT EXISTS author_profiles_nick_key_idx ON author_profiles (nick_key);

CREATE OR REPLACE FUNCTION save_author_profile(p_author_id text, p_nick text, p_color text)
RETURNS author_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nick text := left(btrim(coalesce(p_nick, '')), 20);
  v_key text := author_nick_key(v_nick);
  v_profile author_profiles;
BEGIN
  IF char_length(coalesce(p_author_id, '')) NOT BETWEEN 1 AND 16 THEN
    RAISE EXCEPTION 'Не удалось определить профиль';
  END IF;
  IF char_length(v_nick) = 0 THEN
    RAISE EXCEPTION 'Введите ник';
  END IF;
  IF v_key = '' THEN
    RAISE EXCEPTION 'Ник должен содержать буквы или цифры';
  END IF;
  IF v_key = author_nick_key('Аноним') THEN
    RAISE EXCEPTION 'Этот ник нельзя использовать';
  END IF;
  IF NOT is_author_color(coalesce(p_color, '')) THEN
    RAISE EXCEPTION 'Выберите цвет из списка';
  END IF;

  IF EXISTS (
    SELECT 1 FROM author_profiles
    WHERE nick_key = v_key AND author_id <> p_author_id
  ) THEN
    RAISE EXCEPTION 'Этот ник уже занят';
  END IF;

  INSERT INTO author_profiles (author_id, nick, nick_key, color, updated_at)
  VALUES (p_author_id, v_nick, v_key, p_color, now())
  ON CONFLICT (author_id) DO UPDATE
    SET nick = EXCLUDED.nick,
        nick_key = EXCLUDED.nick_key,
        color = EXCLUDED.color,
        updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_author_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION save_author_profile(text, text, text) TO anon, authenticated;
