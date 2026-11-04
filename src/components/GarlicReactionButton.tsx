import { useEffect, useState } from 'react';
import { toggleGarlicReaction } from '@/api/imageboard';

interface GarlicReactionButtonProps {
  postId: number;
  initialCount: number;
  initialReacted: boolean;
}

export default function GarlicReactionButton({ postId, initialCount, initialReacted }: GarlicReactionButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCount(initialCount);
    setReacted(initialReacted);
  }, [initialCount, initialReacted]);

  const handleClick = async () => {
    if (pending) return;
    const previous = { count, reacted };
    setReacted(!reacted);
    setCount(reacted ? Math.max(count - 1, 0) : count + 1);
    setError(null);
    setPending(true);
    try {
      const result = await toggleGarlicReaction(postId);
      setCount(result.total);
      setReacted(result.reacted);
    } catch (err: unknown) {
      setCount(previous.count);
      setReacted(previous.reacted);
      setError(err instanceof Error ? err.message : 'Не удалось поставить реакцию');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={reacted}
        aria-label={`Чеснок, реакций: ${count}`}
        title="Поставить чеснок"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all duration-200 active:scale-95 ${
          reacted
            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-200'
            : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-stone-500'
        }`}
      >
        <span
          className={`text-base leading-none transition-transform duration-200 ${reacted ? 'scale-110' : ''}`}
          aria-hidden="true"
        >
          🧄
        </span>
        <span className="tabular-nums">{count}</span>
      </button>
    </div>
  );
}
