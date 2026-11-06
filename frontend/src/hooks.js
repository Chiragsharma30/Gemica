import { useCallback, useEffect, useState } from 'react';

// Small data-fetching hook: { data, loading, error, reload }.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}

// Sets the browser tab title (also helps SEO and screen-reader navigation).
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Gemica` : 'Gemica — Fine Fashion Jewellery';
  }, [title]);
}
