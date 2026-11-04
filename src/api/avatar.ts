import { supabase } from '@/lib/supabase';
import { getAuthorId } from '@/lib/anonymous';
import { cropAvatarToWebp } from '@/lib/avatarImage';

const AVATAR_BUCKET = 'avatars';
const RAISE_EXCEPTION_CODE = 'P0001';

export async function withAuthorAvatars<T extends { author_id: string }>(
  items: T[],
): Promise<(T & { author_avatar_path: string | null })[]> {
  const authorIds = [...new Set(items.map((item) => item.author_id))];
  const paths = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data, error } = await supabase
      .from('author_profiles')
      .select('author_id, avatar_path')
      .in('author_id', authorIds)
      .not('avatar_path', 'is', null);
    if (error) throw new Error('Не удалось загрузить аватарки');
    for (const row of (data ?? []) as { author_id: string; avatar_path: string }[]) {
      paths.set(row.author_id, row.avatar_path);
    }
  }
  return items.map((item) => ({ ...item, author_avatar_path: paths.get(item.author_id) ?? null }));
}

export function getAvatarUrl(path: string): string {
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadAvatar(file: File): Promise<string> {
  let image: Blob;
  try {
    image = await cropAvatarToWebp(file);
  } catch {
    throw new Error('Не удалось прочитать картинку, выберите другой файл');
  }

  const path = `${getAuthorId()}/avatar.webp`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, image, { upsert: true, contentType: 'image/webp' });
  if (uploadError) throw new Error('Не удалось загрузить аватар');

  const { error: saveError } = await supabase.rpc('set_author_avatar', { p_path: path });
  if (saveError) {
    throw new Error(saveError.code === RAISE_EXCEPTION_CODE ? saveError.message : 'Не удалось сохранить аватар');
  }
  return path;
}
