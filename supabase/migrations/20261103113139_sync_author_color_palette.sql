/*
# Sync allowed nickname colors with the app palette

1. Plain-English summary
- The database accepted only 7 nickname colors, so the 4 colors added recently (white, dark green, orange, grey-brown) were rejected when saving a nickname.
- The allowed list now matches the full palette the app shows.

2. Modified functions
- `is_author_color`: allows all 11 palette colors.

3. Notes
- Existing profiles and messages are not changed.
*/

CREATE OR REPLACE FUNCTION public.is_author_color(p_color text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
SELECT p_color IN (
'#f50000', '#ffec38', '#8fff38', '#38ffe1', '#383aff', '#9e38ff', '#ff38d2',
'#605252', '#FFFFFF', '#258408', '#FF7E00'
);
$function$;
