import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'board'; slug: string }
  | { name: 'thread'; id: number }
  | { name: 'notFound' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/') return { name: 'home' };

  const boardMatch = path.match(/^\/b\/([a-z0-9]{1,16})$/);
  if (boardMatch) return { name: 'board', slug: boardMatch[1] };

  const threadMatch = path.match(/^\/t\/(\d+)$/);
  if (threadMatch) return { name: 'thread', id: Number(threadMatch[1]) };

  return { name: 'notFound' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handleChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
}
