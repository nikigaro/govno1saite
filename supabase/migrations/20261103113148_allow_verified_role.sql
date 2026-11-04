/*
# Allow the verified account role

1. Plain-English summary
- Accounts can now also receive a "verified" role, shown as a green check badge next to the nickname.
- No account is given this role by this migration. It is assigned manually on request.

2. Modified tables
- `author_profiles.role`: the allowed values are now 'admin' and 'verified'.
*/

ALTER TABLE public.author_profiles DROP CONSTRAINT IF EXISTS author_profiles_role_allowed;
ALTER TABLE public.author_profiles
ADD CONSTRAINT author_profiles_role_allowed CHECK (role IS NULL OR role IN ('admin', 'verified'));
