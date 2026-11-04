import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { EMOJIS } from '@/lib/emojis';

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

export default function EmojiPicker({ onPick }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handlePick = (emoji: string) => {
    onPick(emoji);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Вставить смайлик"
        aria-expanded={open}
        className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 transition-colors hover:border-emerald-400 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
      >
        <Smile size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Смайлики"
          className="animate-fade-in absolute bottom-full right-0 z-20 mb-2 w-72 rounded-xl border border-stone-200 bg-white p-2 text-stone-900 shadow-lg dark:text-stone-100 dark:border-stone-700 dark:bg-stone-900"
        >
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePick(emoji)}
                aria-label={`Смайлик ${emoji}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-stone-800"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
