/*
# Protect nicknames with password-based accounts

1. New Tables
- `author_accounts`: links a sign-in account to the visitor identity that owns a nickname.
  - `user_id` (the sign-in account, references auth.users)
  - `author_id` (the visitor identity, unique)
  - `created_at`

2. New Functions
- `nick_account_email(p_nick)`: turns a nickname into the internal sign-in address of its account. Uses the same normalization as nicknames, so "Мурс" and "мурс" open the same account. Callable by visitors (used when signing in).
- `begin_nick_registration(p_nick)`: checks that a nickname is valid, not reserved and not held by any profile, then returns the internal sign-in address. Callable by visitors (used before sign-up).
- `claim_author_account(p_author_id, p_nick, p_color)`: called right after sign-up. Creates the nickname profile for a brand-new visitor identity and links it to the signed-in account.
- `update_author_profile(p_nick, p_color)`: signed-in users change their own nickname and color. The visitor identity is looked up from their account, so nobody can change someone else's profile.
- `save_author_profile`: now internal only. Visitors can no longer call it directly.

3. Security
- RLS enabled on `author_accounts`. Signed-in users can read only their own row. No direct writes.
- Nicknames can only be created or changed by a signed-in account owner.

4. Notes
- Nicknames held by profiles created before accounts existed stay reserved: they cannot be registered or changed by anyone.
- No email is collected. The sign-in address is generated from the nickname, and there is no password reset flow.
- Idempotent: safe to run again.
*/

CREATE TABLE IF NOT EXISTS author_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE author_accounts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON author_accounts TO authenticated;

DROP POLICY IF EXISTS "select_own_author_account" ON author_accounts;
CREATE POLICY "select_own_author_account" ON author_accounts FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION nick_account_email(p_nick text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nick text := left(btrim(coalesce(p_nick, '')), 20);
  v_key text;
BEGIN
  IF char_length(v_nick) = 0 THEN
    RAISE EXCEPTION 'Введите ник';
  END IF;
  v_key := public.author_nick_key(v_nick);
  IF v_key = '' THEN
    RAISE EXCEPTION 'Ник должен содержать буквы или цифры';
  END IF;
  RETURN encode(sha256(convert_to(v_key, 'UTF8')), 'hex') || '@accounts.tredach.app';
END;
$$;

CREATE OR REPLACE FUNCTION begin_nick_registration(p_nick text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := public.nick_account_email(p_nick);
  v_key text := public.author_nick_key(left(btrim(coalesce(p_nick, '')), 20));
BEGIN
  IF v_key = public.author_nick_key('Аноним') THEN
    RAISE EXCEPTION 'Этот ник нельзя использовать';
  END IF;
  IF EXISTS (SELECT 1 FROM public.author_profiles WHERE nick_key = v_key) THEN
    RAISE EXCEPTION 'Этот ник уже занят';
  END IF;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION claim_author_account(p_author_id text, p_nick text, p_color text)
RETURNS author_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.author_profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Войдите в аккаунт';
  END IF;
  IF EXISTS (SELECT 1 FROM public.author_accounts WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'У этого аккаунта уже есть ник';
  END IF;
  IF EXISTS (SELECT 1 FROM public.author_profiles WHERE author_id = p_author_id) THEN
    RAISE EXCEPTION 'Не удалось создать аккаунт, попробуйте еще раз';
  END IF;
  v_profile := public.save_author_profile(p_author_id, p_nick, p_color);
  INSERT INTO public.author_accounts (user_id, author_id) VALUES (auth.uid(), p_author_id);
  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION update_author_profile(p_nick text, p_color text)
RETURNS author_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_author_id text;
BEGIN
  SELECT author_id INTO v_author_id FROM public.author_accounts WHERE user_id = auth.uid();
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Войдите в аккаунт';
  END IF;
  RETURN public.save_author_profile(v_author_id, p_nick, p_color);
END;
$$;

REVOKE EXECUTE ON FUNCTION nick_account_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nick_account_email(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION begin_nick_registration(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION begin_nick_registration(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION claim_author_account(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_author_account(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION update_author_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_author_profile(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION save_author_profile(text, text, text) FROM PUBLIC, anon, authenticated;
