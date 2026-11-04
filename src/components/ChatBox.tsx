import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Pin, PinOff, SendHorizonal, Volume2, VolumeX } from 'lucide-react';
import { getAvatarUrl } from '@/api/avatar';
import { fetchChatMessageCount, fetchChatMessages, sendChatMessage, setChatMessagePinned } from '@/api/chat';
import AuthorName from '@/components/AuthorName';
import Avatar from '@/components/Avatar';
import EmojiPicker from '@/components/EmojiPicker';
import { useChatSound } from '@/hooks/useChatSound';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useLoader } from '@/hooks/useLoader';
import { formatPostTime } from '@/lib/format';
import { inputClass } from '@/lib/formStyles';

const POLL_INTERVAL_MS = 5000;
const COUNT_INTERVAL_MS = 1000;
const MAX_LENGTH = 500;

export default function ChatBox() {
  const { data: messages, error, loading, reload } = useLoader(fetchChatMessages, []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const { profile, ready } = useCurrentProfile();
  const isAdmin = profile?.role === 'admin';
  const { muted, toggleMuted, playNotification } = useChatSound();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenIdRef = useRef<number | null>(null);
  const ownSendRef = useRef(false);
  const lastMessageId = messages && messages.length > 0 ? messages[messages.length - 1].id : null;
  const pinnedMessage = messages?.find((message) => message.is_pinned);

  useEffect(() => {
    const id = window.setInterval(reload, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    let active = true;
    const refreshCount = () => {
      fetchChatMessageCount()
        .then((count) => {
          if (active) setTotalCount(count);
        })
        .catch(() => {
          if (active) setTotalCount(null);
        });
    };
    refreshCount();
    const id = window.setInterval(refreshCount, COUNT_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lastMessageId]);

  useEffect(() => {
    const previousId = lastSeenIdRef.current;
    lastSeenIdRef.current = lastMessageId;
    if (previousId === null || lastMessageId === null || lastMessageId === previousId) return;
    if (ownSendRef.current) {
      ownSendRef.current = false;
      return;
    }
    playNotification();
  }, [lastMessageId, playNotification]);

  const handleTogglePin = async (id: number, currentlyPinned: boolean) => {
    setPinError(null);
    try {
      await setChatMessagePinned(id, !currentlyPinned);
      reload();
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Не удалось закрепить сообщение');
    }
  };

  const canSend = draft.trim().length > 0 && !sending;

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? start;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    if (next.length > MAX_LENGTH) return;
    setDraft(next);
    requestAnimationFrame(() => {
      input?.focus();
      const caret = start + emoji.length;
      input?.setSelectionRange(caret, caret);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setSendError(null);
    ownSendRef.current = true;
    try {
      await sendChatMessage(draft.trim());
      setDraft('');
      reload();
    } catch (err: unknown) {
      ownSendRef.current = false;
      setSendError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Общий чат</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-stone-300">
            Сообщений: {totalCount ?? '...'}
          </span>
          <button
            type="button"
            onClick={toggleMuted}
            aria-pressed={!muted}
            aria-label={muted ? 'Включить звук уведомлений' : 'Выключить звук уведомлений'}
            title={muted ? 'Включить звук уведомлений' : 'Выключить звук уведомлений'}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
        {pinnedMessage && (
          <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Pin size={14} className="shrink-0 rotate-45" aria-hidden="true" />
            <span className="shrink-0 font-semibold">Закреплено:</span>
            <span className="truncate">{pinnedMessage.author_name}: {pinnedMessage.body}</span>
          </div>
        )}

        <div ref={listRef} className="h-[500px] space-y-4 overflow-y-auto p-4 sm:p-5 md:h-[600px]">
          {!messages ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {loading ? 'Загружаем сообщения...' : error}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Сообщений пока нет. Напишите первым.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="animate-fade-in flex items-start gap-3 text-sm leading-normal">
                <Avatar
                  url={message.author_avatar_path ? getAvatarUrl(message.author_avatar_path) : null}
                  name={message.author_name}
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <AuthorName
                      name={message.author_name}
                      color={message.author_color}
                      role={message.author_role}
                      verified={message.author_verified}
                    />
                    <time className="text-xs text-stone-500 dark:text-stone-400">
                      {formatPostTime(message.created_at)}
                    </time>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleTogglePin(message.id, message.is_pinned)}
                        className={`ml-auto rounded p-1 transition-opacity ${
                          message.is_pinned
                            ? 'text-emerald-500 opacity-100'
                            : 'text-stone-500 opacity-30 hover:opacity-100'
                        }`}
                        title={message.is_pinned ? 'Открепить' : 'Закрепить'}
                        aria-label={message.is_pinned ? 'Открепить сообщение' : 'Закрепить сообщение'}
                      >
                        {message.is_pinned ? <PinOff size={14} aria-hidden="true" /> : <Pin size={14} aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-stone-800 dark:text-stone-200">
                    {message.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {pinError && (
          <p role="alert" className="border-t border-stone-200 px-4 py-2 text-xs text-red-600 dark:border-stone-800 dark:text-red-400">
            {pinError}
          </p>
        )}

        {ready && !profile && (
          <p className="border-t border-stone-200 p-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300">
            Писать в чат могут только зарегистрированные пользователи. Создайте ник и пароль в блоке «Ваш ник» выше.
          </p>
        )}

        {profile && (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-stone-200 p-3 dark:border-stone-800"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Напишите сообщение..."
              aria-label="Сообщение в чат"
              className={inputClass}
            />
            <EmojiPicker onPick={insertEmoji} />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Отправить сообщение"
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition-all duration-200 hover:bg-emerald-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:disabled:bg-stone-700 dark:disabled:text-stone-400"
            >
              <SendHorizonal size={18} aria-hidden="true" />
            </button>
          </form>
        )}

        {sendError && (
          <p role="alert" className="px-4 pb-3 text-xs text-red-600 dark:text-red-400">
            {sendError}
          </p>
        )}
      </div>
    </section>
  );
}
