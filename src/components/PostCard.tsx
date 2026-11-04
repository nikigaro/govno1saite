import { useState, type ReactNode } from 'react';
import { Check, Flag } from 'lucide-react';
import { getAvatarUrl } from '@/api/avatar';
import { getImageUrl, reportPost } from '@/api/imageboard';
import AuthorName from '@/components/AuthorName';
import Avatar from '@/components/Avatar';
import ImageLightbox from '@/components/ImageLightbox';
import GarlicReactionButton from '@/components/GarlicReactionButton';
import PostBody from '@/components/PostBody';
import { formatPostTime } from '@/lib/format';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
  isOp?: boolean;
  clamp?: boolean;
  footer?: ReactNode;
  garlicReacted?: boolean;
}

export default function PostCard({ post, isOp = false, clamp = false, footer, garlicReacted = false }: PostCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const imageUrl = post.image_path ? getImageUrl(post.image_path) : null;
  const avatarUrl = post.author_avatar_path ? getAvatarUrl(post.author_avatar_path) : null;

  const handleReport = async () => {
    setReporting(true);
    setReportError(null);
    try {
      await reportPost(post.id);
      setReported(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Не удалось отправить жалобу');
    } finally {
      setReporting(false);
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className={`rounded-xl border p-4 transition-shadow duration-200 hover:shadow-md sm:p-5 ${
        isOp
          ? 'border-stone-200 bg-white text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'
          : 'border-stone-200/70 bg-white/80 text-stone-900 dark:border-stone-800/70 dark:bg-stone-900/70 dark:text-stone-100'
      }`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Avatar url={avatarUrl} name={post.author_name} size="sm" />
        {post.subject && (
          <span className="font-semibold text-stone-900 dark:text-stone-100">{post.subject}</span>
        )}
        <AuthorName name={post.author_name} color={post.author_color} role={post.author_role} verified={post.author_verified} />
        {post.author_id && (
          <span className="font-mono text-xs text-stone-500 dark:text-stone-400">ID: {post.author_id}</span>
        )}
        <time className="text-stone-500 dark:text-stone-400" dateTime={post.created_at}>
          {formatPostTime(post.created_at)}
        </time>
        <span className="font-mono text-xs text-stone-500 dark:text-stone-400">№{post.id}</span>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row">
        {imageUrl && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="shrink-0 overflow-hidden rounded-lg bg-stone-100 transition-transform duration-200 hover:scale-[1.02] dark:bg-stone-800"
          >
            <img
              src={imageUrl}
              alt="Картинка к сообщению"
              loading="lazy"
              className="max-h-56 w-auto max-w-full object-contain sm:max-w-[220px]"
            />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <PostBody text={post.body} clamp={clamp} />
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3 dark:border-stone-800">
        <div className="text-sm">{footer}</div>
        <div className="flex flex-wrap items-center gap-3">
          <GarlicReactionButton
            postId={post.id}
            initialCount={post.garlic_count}
            initialReacted={garlicReacted}
          />
          {reportError && <span className="text-xs text-red-600 dark:text-red-400">{reportError}</span>}
          <button
            type="button"
            onClick={handleReport}
            disabled={reported || reporting}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-red-600 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-stone-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-red-400"
          >
            {reported ? <Check size={14} aria-hidden="true" /> : <Flag size={14} aria-hidden="true" />}
            {reported ? 'Жалоба отправлена' : 'Пожаловаться'}
          </button>
        </div>
      </footer>

      {lightboxOpen && imageUrl && (
        <ImageLightbox src={imageUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </article>
  );
}
