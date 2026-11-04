/*
# Add garlic reactions to posts

1. New Tables
- `post_garlic_reactions`: one row per (post, visitor) pair that marked a post with garlic. Visitors cannot read this table directly.

2. Modified Tables
- `posts`: new column `garlic_count` holds the total number of garlic reactions, so it can be shown without reading the reactions table.

3. Functions
- `toggle_garlic_reaction(post, author)`: adds the visitor's garlic if absent, removes it if present, and returns the new total and whether the visitor now has a garlic on the post.
- `my_garlic_post_ids(author, post ids)`: returns which of the given posts the visitor has already marked.

4. Security
- RLS enabled on `post_garlic_reactions` with no policies, so only the functions above can touch it.
- Both functions are callable by visitors and validate input. Reactions on hidden posts are rejected.

5. Notes
- Each visitor can react to a post once. A second click removes the reaction.
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS garlic_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS post_garlic_reactions (
  post_id bigint NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id text NOT NULL CHECK (char_length(author_id) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, author_id)
);

ALTER TABLE post_garlic_reactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION toggle_garlic_reaction(p_post_id bigint, p_author_id text)
RETURNS TABLE (total integer, reacted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_reacted boolean;
BEGIN
  IF char_length(coalesce(p_author_id, '')) NOT BETWEEN 1 AND 16 THEN
    RAISE EXCEPTION 'Не удалось определить профиль';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id AND is_hidden = false) THEN
    RAISE EXCEPTION 'Сообщение не найдено';
  END IF;

  IF EXISTS (
    SELECT 1 FROM post_garlic_reactions
    WHERE post_id = p_post_id AND author_id = p_author_id
  ) THEN
    DELETE FROM post_garlic_reactions WHERE post_id = p_post_id AND author_id = p_author_id;
    UPDATE posts SET garlic_count = greatest(garlic_count - 1, 0) WHERE id = p_post_id;
    v_reacted := false;
  ELSE
    INSERT INTO post_garlic_reactions (post_id, author_id) VALUES (p_post_id, p_author_id);
    UPDATE posts SET garlic_count = garlic_count + 1 WHERE id = p_post_id;
    v_reacted := true;
  END IF;

  SELECT posts.garlic_count INTO v_total FROM posts WHERE id = p_post_id;

  RETURN QUERY SELECT v_total, v_reacted;
END;
$$;

CREATE OR REPLACE FUNCTION my_garlic_post_ids(p_author_id text, p_post_ids bigint[])
RETURNS SETOF bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT post_id
  FROM post_garlic_reactions
  WHERE author_id = p_author_id AND post_id = ANY (p_post_ids);
$$;

REVOKE EXECUTE ON FUNCTION toggle_garlic_reaction(bigint, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION my_garlic_post_ids(text, bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION toggle_garlic_reaction(bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION my_garlic_post_ids(text, bigint[]) TO anon, authenticated;
