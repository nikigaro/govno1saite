import { Moon, Sun } from 'lucide-react';
import OnlineCounter from '@/components/OnlineCounter';
import type { Theme } from '@/hooks/useTheme';

interface SiteHeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function SiteHeader({ theme, onToggleTheme }: SiteHeaderProps) {
  const isDark = theme === 'dark';
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 text-stone-900 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90 dark:text-stone-100">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <a
          href="#/"
          className="group flex items-center gap-3 font-bold tracking-tight text-stone-900 dark:text-stone-100"
        >
          <img
            src="/logo.png"
            alt="135IQ"
            className="h-9 w-auto transition-transform duration-200 group-hover:-rotate-3"
          />
          <span className="text-lg">Норм Челики</span>
        </a>
        <div className="flex items-center gap-3">
          <OnlineCounter />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
