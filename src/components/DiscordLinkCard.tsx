import { ArrowUpRight } from 'lucide-react';

const DISCORD_URL = 'https://discord.gg/zYeW5qrPMs';

export default function DiscordLinkCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
      <header className="border-b border-stone-200 bg-emerald-50 px-4 py-3 dark:border-stone-800 dark:bg-emerald-950/40">
        <h2 className="text-xs font-bold tracking-wider text-emerald-800 dark:text-emerald-300">ЗАХОДИТЕ В ДИСКОРД</h2>
      </header>
      <div className="p-4">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#5865F2] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <img src="/discord-logo.png" alt="Discord" className="h-8 w-auto" />
          <ArrowUpRight
            size={18}
            className="shrink-0 text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#5865F2]"
            aria-hidden="true"
          />
        </a>
      </div>
    </section>
  );
}
