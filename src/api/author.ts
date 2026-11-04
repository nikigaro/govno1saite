import { getAuthorId } from '@/lib/anonymous';
import { supabase } from '@/lib/supabase';
import type { AuthorProfile } from '@/types';

export const AUTHOR_PROFILE_CHANGED_EVENT = 'author-profile-changed';

export async function fetchAuthorProfile(): Promise<AuthorProfile | null> {
  const { data, error } = await supabase
    .from('author_profiles')
    .select('nick, color, avatar_path, role, is_verified')
    .eq('author_id', getAuthorId())
    .maybeSingle();
  if (error) throw new Error('Не удалось загрузить ник');
  return (data as AuthorProfile | null) ?? null;
}

export function announceAuthorProfile(profile: AuthorProfile | null): void {
  window.dispatchEvent(new CustomEvent<AuthorProfile | null>(AUTHOR_PROFILE_CHANGED_EVENT, { detail: profile }));
}
