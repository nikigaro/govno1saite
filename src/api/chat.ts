import { withAuthorAvatars } from '@/api/avatar';
import { getAuthorId } from '@/lib/anonymous';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';

const CHAT_LIMIT = 50;
const RAISE_EXCEPTION_CODE = 'P0001';

interface DbError {
  code?: string;
  message: string;
}

function toError(error: DbError, fallback: string): Error {
  return new Error(error.code === RAISE_EXCEPTION_CODE ? error.message : fallback);
}

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, author_id, author_name, author_color, author_role, author_verified, body, created_at, is_pinned')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(CHAT_LIMIT);
  if (error) throw toError(error, 'Не удалось загрузить чат');
  const messages = await withAuthorAvatars((data ?? []) as Omit<ChatMessage, 'author_avatar_path'>[]);
  return messages.reverse();
}

export async function fetchChatMessageCount(): Promise<number> {
  const { count, error } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error('Не удалось узнать количество сообщений');
  return count ?? 0;
}

export async function sendChatMessage(body: string): Promise<void> {
  const { error } = await supabase.rpc('send_chat_message', {
    p_author_id: getAuthorId(),
    p_body: body,
  });
  if (error) throw toError(error, 'Не удалось отправить сообщение');
}

export async function setChatMessagePinned(messageId: number, pinned: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_chat_message_pinned', {
    p_message_id: messageId,
    p_pinned: pinned,
  });
  if (error) throw toError(error, 'Не удалось закрепить сообщение');
}
