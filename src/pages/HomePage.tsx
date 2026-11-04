import { ArrowUpRight } from 'lucide-react';
import { fetchBoards } from '@/api/imageboard';
import ChatBox from '@/components/ChatBox';
import DiscordLinkCard from '@/components/DiscordLinkCard';
import NickSettings from '@/components/NickSettings';
import { ErrorBlock, LoadingBlock, NotFoundBlock } from '@/components/StatusBlocks';
import UpdatesPanel from '@/components/UpdatesPanel';
import { useLoader } from '@/hooks/useLoader';

const RULES = [
  'Это сообщество создано для людей разных национальностей, фракций и социальных слоёв — вне зависимости от личных качеств и прочего. Вежливое общение приветствуется, но не является обязательным. Старайтесь избегать ссор, лишних споров и конфликтов. Если хотите, чтобы вам было уютно — начните с себя и ведите себя пристойно.',
  'Не рекомендуется отправлять контент, который может быть неприятным, пугающим, тревожным, а также содержать запрещённую символику или порнографию (в том числе нарушающий законодательство РФ/РБ/УКР и других стран). При умышленном нарушении — запрет на отправку файлов.',
  'Преследование, угрозы, доксинг и слив личных данных участников строго запрещены. Умышленные случаи рассматриваются администрацией в индивидуальном порядке с вынесением справедливой меры для пресечения дальнейших нарушений подобного характера.',
  'Запрещены отправка ссылок на нежелательные ресурсы, фишинговых ссылок, переманивание аудитории на другие каналы, а также самореклама (в больших масштабах и с целью увода аудитории). Такие случаи также рассматриваются администрацией в индивидуальном порядке.',
  'Спам и оффтоп нежелательны. В общих каналах, где общается большое количество людей, спам и отправка сообщений или файлов не по теме могут повлечь предупреждение, тайм-аут или запрет на отправку файлов.',
  'Решение спорных ситуаций, разрешение конфликтов, вопросы по серверу, ботам и прочему — писать в дискорд.',
];

export default function HomePage() {
  const { data: boards, error, loading, reload } = useLoader(fetchBoards, []);

  return (
    <div className="grid animate-fade-in gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <aside className="order-last space-y-4 lg:sticky lg:top-24 lg:order-first lg:self-start">
        <UpdatesPanel />
        <DiscordLinkCard />
      </aside>

      <div className="min-w-0 space-y-12">
        <section className="space-y-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Выберите раздел и начните обсуждение</h1>
          <p className="mx-auto max-w-2xl text-base leading-normal text-stone-300">
            Это личный чат для вас, челиков.
          </p>
          <NickSettings />
        </section>

        <ChatBox />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Разделы</h2>
          {!boards ? (
            loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : <NotFoundBlock />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {boards.map((board) => (
                <a
                  key={board.id}
                  href={`#/b/${board.slug}`}
                  className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 text-stone-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-emerald-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">/{board.slug}/</span>
                      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{board.title}</h3>
                    </div>
                    <ArrowUpRight
                      size={20}
                      className="text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-sm leading-normal text-stone-600 dark:text-stone-400">{board.description}</p>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">Правила</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-normal text-stone-700 marker:text-stone-400 dark:text-stone-300">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
