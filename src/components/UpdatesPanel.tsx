import { Megaphone } from 'lucide-react';
import { UPDATES } from '@/lib/updates';

export default function UpdatesPanel() {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
      <header className="flex items-center gap-2 border-b border-stone-200 bg-emerald-50 px-4 py-3 dark:border-stone-800 dark:bg-emerald-950/40">
        <Megaphone size={16} className="text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
        <h2 className="text-xs font-bold tracking-wider text-emerald-800 dark:text-emerald-300">ОБНОВЛЕНИЯ</h2>
      </header>
      <ul className="max-h-400 divide-y divide-stone-400 overflow-y-auto dark:divide-stone-800">
        {UPDATES.map((update) => (
          <li key={update.date} className="space-y-2 px-4 py-3">
            <time className="block text-xs font-semibold text-stone-500 dark:text-stone-400">{update.date}</time>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{update.title}</h3>
            <ul className="list-disc space-y-1 pl-4 text-sm leading-normal text-stone-700 marker:text-emerald-600 dark:text-stone-300">
              {update.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
