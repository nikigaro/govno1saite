import AuthorName from '@/components/AuthorName';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';

export default function OnlineCounter() {
  const users = useOnlineUsers();
  const label = users === null ? '...' : `${users.length} онлайн`;

  return (
    <div
      tabIndex={0}
      className="group relative flex cursor-default items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-700 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="tabular-nums">{label}</span>

      <div className="pointer-events-none invisible absolute right-0 top-full z-40 mt-2 w-64 translate-y-1 rounded-xl border border-stone-200 bg-white p-3 text-left text-stone-900 opacity-0 dark:text-stone-100 shadow-lg transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100 dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Сейчас на сайте
        </p>
        {users === null ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Загружаем...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Пока никого нет</p>
        ) : (
          <ul className="max-h-60 space-y-1.5 overflow-y-auto">
            {users.map((user) => (
              <li key={user.id} className="text-sm">
                <AuthorName name={user.nick} color={user.color} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
