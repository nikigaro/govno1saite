import { useEffect, useRef, useState } from 'react';
import { Paintbrush } from 'lucide-react';
import { AUTHOR_COLORS, type AuthorColor } from '@/lib/authorColors';

interface NickColorPickerProps {
  value: AuthorColor | null;
  onChange: (color: AuthorColor) => void;
  compact?: boolean;
}

export default function NickColorPicker({ value, onChange, compact = false }: NickColorPickerProps) {
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

  const handlePick = (color: AuthorColor) => {
    onChange(color);
    setOpen(false);
  };

  const picker = (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Выбрать цвет ника"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center justify-center rounded-lg bg-stone-900 shadow-sm transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 ${
          compact ? 'h-7 w-7' : 'h-9 w-9'
        }`}
      >
        <Paintbrush size={compact ? 14 : 18} style={{ color: value ?? '#FFFFFF' }} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Цвета ника"
          className="animate-fade-in absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <div role="radiogroup" aria-label="Цвет ника" className="grid grid-cols-6 gap-2">
            {AUTHOR_COLORS.map((swatch) => {
              const selected = value === swatch;
              return (
                <button
                  key={swatch}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Цвет ${swatch}`}
                  onClick={() => handlePick(swatch)}
                  style={{ backgroundColor: swatch }}
                  className={`h-[18px] w-[18px] rounded-full border border-stone-300 ring-offset-2 ring-offset-white transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:ring-offset-stone-900 ${
                    selected ? 'scale-110 ring-2 ring-stone-900 dark:ring-stone-100' : ''
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (compact) return picker;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Цвет ника</span>
      {picker}
    </div>
  );
}
