import { useState } from 'react';
import { ChevronRight, Reply } from 'lucide-react';
import { createReply, fetchThreadPage } from '@/api/imageboard';
import PostCard from '@/components/PostCard';
import PostForm, { type PostDraft } from '@/components/PostForm';
import { ErrorBlock, LoadingBlock, NotFoundBlock } from '@/components/StatusBlocks';
import { useLoader } from '@/hooks/useLoader';
import { formatReplyCount } from '@/lib/format';

interface ThreadPageProps {
  threadId: number;
}

export default function ThreadPage({ threadId }: ThreadPageProps) {
  const { data, error, loading, reload } = useLoader(() => fetchThreadPage(threadId), [threadId]);
  const [replyOpen, setReplyOpen] = useState(false);

  if (!data) {
    if (loading) return <LoadingBlock />;
    if (error) return <ErrorBlock message={error} onRetry={reload} />;
    return <NotFoundBlock />;
  }

  const { op, replies, reactedPostIds } = data;
  const reactedIds = new Set(reactedPostIds);
  const boardSlug = op.board?.slug ?? null;

  const handleReply = async (draft: PostDraft) => {
    await createReply({
      threadId,
      body: draft.body,
      image: draft.image,
    });
    setReplyOpen(false);
    reload();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-stone-300" aria-label="Навигация">
        <a href="#/" className="hover:text-emerald-700 dark:hover:text-emerald-400">Главная</a>
        {boardSlug && (
          <>
            <ChevronRight size={14} aria-hidden="true" />
            <a href={`#/b/${boardSlug}`} className="hover:text-emerald-700 dark:hover:text-emerald-400">
              {op.board?.title}
            </a>
          </>
        )}
        <ChevronRight size={14} aria-hidden="true" />
        <span className="font-medium text-stone-100">Тред №{op.id}</span>
      </nav>

      <PostCard post={op} isOp garlicReacted={reactedIds.has(op.id)} />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{formatReplyCount(replies.length)}</h2>
          {!replyOpen && (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <Reply size={16} aria-hidden="true" />
              Ответить
            </button>
          )}
        </div>

        {replyOpen && (
          <PostForm
            mode="reply"
            submitLabel="Отправить ответ"
            onSubmit={handleReply}
            onCancel={() => setReplyOpen(false)}
          />
        )}

        {replies.map((reply) => (
          <PostCard key={reply.id} post={reply} garlicReacted={reactedIds.has(reply.id)} />
        ))}
      </section>
    </div>
  );
}
