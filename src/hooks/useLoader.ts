import { useCallback, useEffect, useState } from 'react';

interface LoaderState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useLoader<T>(load: () => Promise<T | null>, deps: unknown[]) {
  const [state, setState] = useState<LoaderState<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    load()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
            loading: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // The caller controls when to reload through `deps` and `reload`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { ...state, reload };
}
