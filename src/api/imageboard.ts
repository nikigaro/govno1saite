import { withAuthorAvatars } from '@/api/avatar';
import { getAuthorId, markPosted } from '@/lib/anonymous';
import { supabase } from '@/lib/supabase';
import type { Board, BoardPageData, Post, ThreadPageData, ThreadWithBoard } from '@/types';

const IMAGE_BUCKET = 'post-images';
const THREAD_LIMIT = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

interface DbError {
  code?: string;
  message: string;
}

const RAISE_EXCEPTION_CODE = 'P0001';

function toError(error: DbError, fallback: string): Error {
  return new Error(error.code === RAISE_EXCEPTION_CODE ? error.message : fallback);
}

export function validateImageFile(file: File): string | null {
  if (!IMAGE_EXTENSIONS[file.type]) return 'Допустимы только картинки JPEG, PNG, GIF и WebP';
  if (file.size > MAX_IMAGE_BYTES) return 'Картинка должна быть не больше 5 МБ';
  return null;
}

export function getImageUrl(path: string): string {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw new Error('Не удалось загрузить картинку');
  return path;
}

export async function fetchBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, slug, title, description')
    .order('title');
  if (error) throw toError(error, 'Не удалось загрузить разделы');
  return data ?? [];
}

export async function fetchBoardPage(slug: string): Promise<BoardPageData | null> {
  const { data: board, error } = await supabase
    .from('boards')
    .select('id, slug, title, description')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw toError(error, 'Не удалось загрузить раздел');
  if (!board) return null;

  const { data: threads, error: threadsError } = await supabase
    .from('posts')
    .select('*')
    .eq('board_id', board.id)
    .is('thread_id', null)
    .order('bumped_at', { ascending: false })
    .limit(THREAD_LIMIT);
  if (threadsError) throw toError(threadsError, 'Не удалось загрузить треды');

  const boardThreads = await withAuthorAvatars((threads ?? []) as Post[]);
  const reactedPostIds = await fetchReactedPostIds(boardThreads.map((thread) => thread.id));
  return { board, threads: boardThreads, reactedPostIds };
}

export async function fetchThreadPage(threadId: number): Promise<ThreadPageData | null> {
  const [opResult, repliesResult] = await Promise.all([
    supabase
      .from('posts')
      .select('*, board:boards(slug, title)')
      .eq('id', threadId)
      .is('thread_id', null)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  if (opResult.error) throw toError(opResult.error, 'Не удалось загрузить тред');
  if (!opResult.data) return null;
  if (repliesResult.error) throw toError(repliesResult.error, 'Не удалось загрузить ответы');

  const [op] = await withAuthorAvatars([opResult.data as ThreadWithBoard]);
  const replies = await withAuthorAvatars((repliesResult.data ?? []) as Post[]);
  const reactedPostIds = await fetchReactedPostIds([op.id, ...replies.map((reply) => reply.id)]);
  return { op, replies, reactedPostIds };
}

export async function fetchReactedPostIds(postIds: number[]): Promise<number[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase.rpc('my_garlic_post_ids', {
    p_author_id: getAuthorId(),
    p_post_ids: postIds,
  });
  if (error) throw toError(error, 'Не удалось загрузить реакции');
  return ((data ?? []) as number[]).map(Number);
}

export async function toggleGarlicReaction(postId: number): Promise<{ total: number; reacted: boolean }> {
  const { data, error } = await supabase.rpc('toggle_garlic_reaction', {
    p_post_id: postId,
    p_author_id: getAuthorId(),
  });
  if (error) throw toError(error, 'Не удалось поставить реакцию');
  const row = (data as { total: number; reacted: boolean }[] | null)?.[0];
  if (!row) throw new Error('Не удалось поставить реакцию');
  return row;
}

export interface NewThreadInput {
  boardSlug: string;
  subject: string;
  body: string;
  image: File | null;
}

export async function createThread(input: NewThreadInput): Promise<Post> {
  const imagePath = input.image ? await uploadImage(input.image) : null;
  const { data, error } = await supabase.rpc('create_thread', {
    p_board_slug: input.boardSlug,
    p_subject: input.subject,
    p_body: input.body,
    p_author_id: getAuthorId(),
    p_image_path: imagePath,
  });
  if (error) throw toError(error, 'Не удалось создать тред');
  markPosted();
  return data as Post;
}

export interface NewReplyInput {
  threadId: number;
  body: string;
  image: File | null;
}

export async function createReply(input: NewReplyInput): Promise<Post> {
  const imagePath = input.image ? await uploadImage(input.image) : null;
  const { data, error } = await supabase.rpc('create_reply', {
    p_thread_id: input.threadId,
    p_body: input.body,
    p_author_id: getAuthorId(),
    p_image_path: imagePath,
  });
  if (error) throw toError(error, 'Не удалось отправить ответ');
  markPosted();
  return data as Post;
}

export async function reportPost(postId: number): Promise<void> {
  const { error } = await supabase.rpc('report_post', { p_post_id: postId });
  if (error) throw toError(error, 'Не удалось отправить жалобу');
}
