import { useState } from 'react';
import { ChevronRight, MessageSquarePlus } from 'lucide-react';
import { createThread, fetchBoardPage } from '@/api/imageboard';
import PostCard from '@/components/PostCard';
import PostForm, { type PostDraft } from '@/components/PostForm';
import { ErrorBlock, LoadingBlock, NotFoundBlock } from '@/components/StatusBlocks';
import { useLoader } from '@/hooks/useLoader';
import { formatReplyCount } from '@/lib/format';
import { navigate } from '@/hooks/useRoute';

interface BoardPageProps {
  slug: string;
}

export default function BoardPage({ slug }: BoardPageProps) {
  const { data, error, loading, reload } = useLoader(() => fetchBoardPage(slug), [slug]);
  const [composerOpen, setComposerOpen] = useState(false);

  if (!data) {
    if (loading) return <LoadingBlock />;
    if (error) return <ErrorBlock message={error} onRetry={reload} />;
    return <NotFoundBlock />;
  }

  const { board, threads, reactedPostIds } = data;
  const reactedIds = new Set(reactedPostIds);

  const handleCreateThread = async (draft: PostDraft) => {
    const thread = await createThread({
      boardSlug: slug,
      subject: draft.subject,
      body: draft.body,
      image: draft.image,
    });
    navigate(`/t/${thread.id}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <nav className="flex items-center gap-1.5 text-sm text-stone-300" aria-label="Навигация">
        <a href="#/" className="hover:text-emerald-700 dark:hover:text-emerald-400">Главная</a>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="font-medium text-stone-100">{board.title}</span>
      </nav>

      <header className="space-y-2">
        <p className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">/{board.slug}/</p>
        <h1 className="text-3xl font-bold tracking-tight">{board.title}</h1>
        <p className="text-base leading-normal text-stone-300">{board.description}</p>
      </header>

      <section className="space-y-4">
        {composerOpen ? (
          <PostForm
            mode="thread"
            submitLabel="Создать тред"
            onSubmit={handleCreateThread}
            onCancel={() => setComposerOpen(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <MessageSquarePlus size={18} aria-hidden="true" />
            Создать тред
          </button>
        )}
      </section>

      <section className="space-y-4">
        {threads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-400 p-10 text-center text-sm text-stone-300">
            В этом разделе пока нет тредов. Станьте первым.
          </div>
        ) : (
          threads.map((thread) => (
            <PostCard
              key={thread.id}
              post={thread}
              isOp
              clamp
              garlicReacted={reactedIds.has(thread.id)}
              footer={
                <a
                  href={`#/t/${thread.id}`}
                  className="font-medium text-emerald-700 transition-colors hover:underline dark:text-emerald-400"
                >
                  Открыть тред · {formatReplyCount(thread.reply_count)}
                </a>
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
