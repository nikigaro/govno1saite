import SiteHeader from '@/components/SiteHeader';
import { NotFoundBlock } from '@/components/StatusBlocks';
import { useRoute, type Route } from '@/hooks/useRoute';
import { useTheme } from '@/hooks/useTheme';
import BoardPage from '@/pages/BoardPage';
import HomePage from '@/pages/HomePage';
import ThreadPage from '@/pages/ThreadPage';

function renderRoute(route: Route) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'board':
      return <BoardPage key={route.slug} slug={route.slug} />;
    case 'thread':
      return <ThreadPage key={route.id} threadId={route.id} />;
    default:
      return <NotFoundBlock />;
  }
}

export default function App() {
  const route = useRoute();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen text-stone-100">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">{renderRoute(route)}</main>
    </div>
  );
}
