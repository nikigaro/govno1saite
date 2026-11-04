import { AlertTriangle, Loader2, SearchX } from 'lucide-react';

export function LoadingBlock() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-300">
      <Loader2 size={28} className="animate-spin" aria-hidden="true" />
      <span className="text-sm">Загружаем...</span>
    </div>
  );
}

interface ErrorBlockProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/40">
      <AlertTriangle size={28} className="text-red-600 dark:text-red-400" aria-hidden="true" />
      <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
      >
        Попробовать снова
      </button>
    </div>
  );
}

export function NotFoundBlock() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <SearchX size={32} className="text-stone-400" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Ничего не найдено</h1>
      <p className="text-sm text-stone-300">
        Возможно, страница удалена или ссылка набрана с ошибкой.
      </p>
      <a
        href="#/"
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
      >
        На главную
      </a>
    </div>
  );
}
